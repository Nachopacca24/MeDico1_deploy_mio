"""
Recuerda al médico ayudante y al anestesiólogo invitado que tienen una
invitación pendiente sin responder. También alerta al médico principal
cuando la cirugía se acerca y esa persona no confirmó.

Diseñado para correr cada hora via cron en Railway.
Intervalos de recordatorio:
  - Más de 24h hasta la cirugía  → recuerda cada 24h
  - Menos de 24h hasta la cirugía → recuerda cada 6h (urgente)
Ignora casos cuya cirugía ya ocurrió. Ayudante y anestesiólogo se evalúan
de forma independiente, cada uno con su propio flag de "ya notificado".
"""

import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from apps.medico.models import SurgicalCase
from apps.medico.services.firebase import notify_user

logger = logging.getLogger(__name__)

REMINDER_INTERVAL_HOURS = 24   # Normal: cada 24h
URGENT_INTERVAL_HOURS = 6      # Urgente: cada 6h cuando la cirugía es en menos de 24h


class Command(BaseCommand):
    help = 'Recuerda al ayudante/anestesiólogo su invitación pendiente; alerta al principal si la cirugía se acerca'

    def handle(self, *args, **options):
        now = timezone.now()
        today = now.date()

        # Cualquier invitación pendiente (ayudante o anestesiólogo) para cirugías que no han ocurrido aún
        pending = (
            SurgicalCase.objects
            .filter(
                Q(assistant_doctor__isnull=False, assistant_accepted__isnull=True) |
                Q(anesthesia__anesthesiologist__isnull=False, anesthesia__anesthesiologist_accepted__isnull=True),
                archived_at__isnull=True,
                is_paid=False,
                surgery_date__gte=today,
            )
            .select_related('assistant_doctor', 'created_by', 'anesthesia', 'anesthesia__anesthesiologist')
            .distinct()
        )

        sent = 0

        for case in pending:
            # Calcular horas hasta la cirugía
            surgery_time = case.surgery_time or datetime.min.time()
            surgery_dt = timezone.make_aware(
                datetime.combine(case.surgery_date, surgery_time)
            )
            hours_until = (surgery_dt - now).total_seconds() / 3600

            principal_name = case.created_by.get_full_name() or case.created_by.username
            date_str = case.surgery_date.strftime('%d/%m/%Y')
            time_str = case.surgery_time.strftime('%H:%M') if case.surgery_time else ''
            surgery_label = f'el {date_str}' + (f' a las {time_str}' if time_str else '')

            # ── Ayudante ──
            if (
                case.assistant_doctor_id and case.assistant_accepted is None
                and case.assistant_notified_at is not None
            ):
                interval = URGENT_INTERVAL_HOURS if hours_until <= 24 else REMINDER_INTERVAL_HOURS
                cutoff = now - timedelta(hours=interval)
                if case.assistant_notified_at <= cutoff:
                    if hours_until <= 24:
                        body = f'⚠️ Cirugía pronto. Aún no respondiste la invitación de {principal_name} para {surgery_label} como ayudante. ¿Aceptás?'
                    else:
                        body = f'Todavía no respondiste la invitación de {principal_name} para {surgery_label} como ayudante. ¿Aceptás?'

                    notify_user(
                        case.assistant_doctor,
                        title='Invitación pendiente',
                        body=body,
                        data={'route': '/cases/assisted'},
                    )

                    if hours_until <= 48:
                        assistant_name = case.assistant_doctor.get_full_name() or case.assistant_doctor.username
                        notify_user(
                            case.created_by,
                            title='Ayudante no confirmó',
                            body=f'{assistant_name} aún no aceptó tu invitación para la cirugía del {date_str}.',
                            data={'route': f'/cases/{case.pk}'},
                        )
                        logger.info(
                            '[INV_REMINDER] alerted principal=%s for case=%s assistant pending (hours_until=%.1f)',
                            case.created_by_id, case.pk, hours_until,
                        )

                    SurgicalCase.objects.filter(pk=case.pk).update(assistant_notified_at=now)
                    sent += 1
                    logger.info(
                        '[INV_REMINDER] sent to assistant=%s for case=%s (hours_until=%.1f, interval=%dh)',
                        case.assistant_doctor_id, case.pk, hours_until, interval,
                    )

            # ── Anestesiólogo ──
            anesthesia = getattr(case, 'anesthesia', None)
            if (
                anesthesia and anesthesia.anesthesiologist_id and anesthesia.anesthesiologist_accepted is None
                and case.anesthesiologist_notified_at is not None
            ):
                interval = URGENT_INTERVAL_HOURS if hours_until <= 24 else REMINDER_INTERVAL_HOURS
                cutoff = now - timedelta(hours=interval)
                if case.anesthesiologist_notified_at <= cutoff:
                    if hours_until <= 24:
                        body = f'⚠️ Cirugía pronto. Aún no respondiste la invitación de {principal_name} para {surgery_label} como anestesiólogo. ¿Aceptás?'
                    else:
                        body = f'Todavía no respondiste la invitación de {principal_name} para {surgery_label} como anestesiólogo. ¿Aceptás?'

                    notify_user(
                        anesthesia.anesthesiologist,
                        title='Invitación pendiente',
                        body=body,
                        data={'route': '/cases'},
                    )

                    if hours_until <= 48:
                        anesth_name = anesthesia.anesthesiologist.get_full_name() or anesthesia.anesthesiologist.username
                        notify_user(
                            case.created_by,
                            title='Anestesiólogo no confirmó',
                            body=f'{anesth_name} aún no aceptó tu invitación para la cirugía del {date_str}.',
                            data={'route': f'/cases/{case.pk}'},
                        )
                        logger.info(
                            '[INV_REMINDER] alerted principal=%s for case=%s anesthesiologist pending (hours_until=%.1f)',
                            case.created_by_id, case.pk, hours_until,
                        )

                    SurgicalCase.objects.filter(pk=case.pk).update(anesthesiologist_notified_at=now)
                    sent += 1
                    logger.info(
                        '[INV_REMINDER] sent to anesthesiologist=%s for case=%s (hours_until=%.1f, interval=%dh)',
                        anesthesia.anesthesiologist_id, case.pk, hours_until, interval,
                    )

        self.stdout.write(
            self.style.SUCCESS(f'Recordatorios de invitación enviados: {sent}')
        )
