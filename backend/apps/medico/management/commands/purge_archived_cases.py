from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import F
from django.utils import timezone
from datetime import timedelta

from apps.medico.models import (
    SurgicalCase, UserStatsTotals, PurgedHospitalStats, PurgedInsuranceStats, PurgedProcedureStats,
)


class Command(BaseCommand):
    help = (
        'Elimina permanentemente los casos archivados hace más de 6 meses, '
        'acumulando antes su aporte en las estadísticas históricas (que ya no dependen del caso)'
    )

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=180)
        qs = (
            SurgicalCase.objects
            .filter(archived_at__lte=cutoff)
            .select_related('created_by', 'assistant_doctor', 'anesthesia', 'anesthesia__anesthesiologist')
            .prefetch_related('procedures')
        )

        case_ids = []
        for case in qs:
            relevant_users = [case.created_by]
            if case.assistant_doctor_id and case.assistant_accepted is True:
                relevant_users.append(case.assistant_doctor)
            anesthesia = getattr(case, 'anesthesia', None)
            if anesthesia and anesthesia.anesthesiologist_id and anesthesia.anesthesiologist_accepted is True:
                relevant_users.append(anesthesia.anesthesiologist)
            # A surgeon who is also their own anesthesiologist (a supported,
            # auto-accepted flow) would otherwise appear twice here and get
            # this one case counted twice in their lifetime totals below —
            # permanently, since the source case row is gone once this runs.
            relevant_users = list(dict.fromkeys(relevant_users))

            procedures = list(case.procedures.all())
            case_rvu = sum((p.rvu or Decimal('0') for p in procedures), Decimal('0'))
            case_value = sum((p.calculated_value or Decimal('0') for p in procedures), Decimal('0'))

            for user in relevant_users:
                totals, _ = UserStatsTotals.objects.get_or_create(user=user)
                UserStatsTotals.objects.filter(pk=totals.pk).update(
                    total_cases=F('total_cases') + 1,
                    total_rvu=F('total_rvu') + case_rvu,
                    total_value=F('total_value') + case_value,
                )

                if case.hospital_id:
                    hosp_stats, _ = PurgedHospitalStats.objects.get_or_create(
                        user=user, hospital_id=case.hospital_id,
                    )
                    PurgedHospitalStats.objects.filter(pk=hosp_stats.pk).update(
                        case_count=F('case_count') + 1,
                        total_rvu=F('total_rvu') + case_rvu,
                    )

                # insurance_company_id may legitimately be None — that's the
                # "Sin seguro" bucket, same as the live stats query.
                ins_stats, _ = PurgedInsuranceStats.objects.get_or_create(
                    user=user, insurance_id=case.insurance_company_id,
                )
                PurgedInsuranceStats.objects.filter(pk=ins_stats.pk).update(
                    case_count=F('case_count') + 1,
                    total_rvu=F('total_rvu') + case_rvu,
                )

                for proc in procedures:
                    proc_stats, _ = PurgedProcedureStats.objects.get_or_create(
                        user=user, surgery_code=proc.surgery_code,
                        defaults={'surgery_name': proc.surgery_name, 'specialty': proc.specialty},
                    )
                    PurgedProcedureStats.objects.filter(pk=proc_stats.pk).update(
                        procedure_count=F('procedure_count') + 1,
                        total_rvu=F('total_rvu') + (proc.rvu or Decimal('0')),
                        surgery_name=proc.surgery_name,
                        specialty=proc.specialty,
                    )

            case_ids.append(case.pk)

        count = len(case_ids)
        SurgicalCase.objects.filter(pk__in=case_ids).delete()

        self.stdout.write(
            self.style.SUCCESS(f'Eliminados permanentemente: {count} casos archivados (totales históricos conservados)')
        )
