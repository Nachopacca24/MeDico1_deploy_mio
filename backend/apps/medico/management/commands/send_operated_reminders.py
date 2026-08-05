"""
Notifica al cirujano, ayudante y anestesiólogo cuando la cirugía ya finalizó
pero cada uno todavía no marcó como operada su propia parte.

Corre cada 5 minutos via cron en Railway.
Usa surgery_end_time + DELAY_MINUTES para disparar la notificación.
Cada rol tiene su propio flag de "operado" y su propio recordatorio — se
avisa una sola vez por caso y por rol (operated_reminder_sent_at,
assistant_operated_reminder_sent_at, anesthesiologist_operated_reminder_sent_at).
"""

import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from apps.medico.crypto_utils import decrypt_field
from apps.medico.models import SurgicalCase
from apps.medico.services.firebase import notify_user

logger = logging.getLogger(__name__)

_MONTHS = ['enero','febrero','marzo','abril','mayo','junio',
           'julio','agosto','septiembre','octubre','noviembre','diciembre']

DELAY_MINUTES = 10  # minutos después de surgery_end_time para mandar la notif


def _fmt_date(d):
    if not d:
        return ''
    return f"{d.day} de {_MONTHS[d.month - 1]}"


class Command(BaseCommand):
    help = 'Notifica a cirujano, ayudante y anestesiólogo que marquen su parte como operada'

    def handle(self, *args, **options):
        now = timezone.now()

        needs_creator = Q(is_operated=False, operated_reminder_sent_at__isnull=True)
        needs_assistant = Q(
            assistant_doctor__isnull=False, assistant_accepted=True,
            assistant_is_operated=False, assistant_operated_reminder_sent_at__isnull=True,
        )
        needs_anesthesiologist = Q(
            anesthesia__anesthesiologist__isnull=False, anesthesia__anesthesiologist_accepted=True,
            anesthesia__is_operated=False, anesthesiologist_operated_reminder_sent_at__isnull=True,
        )

        candidates = (
            SurgicalCase.objects
            .filter(
                surgery_end_time__isnull=False,
                archived_at__isnull=True,
            )
            .exclude(status='cancelled')
            .filter(needs_creator | needs_assistant | needs_anesthesiologist)
            .select_related('created_by', 'assistant_doctor', 'anesthesia', 'anesthesia__anesthesiologist')
            .distinct()
        )

        sent = 0
        skipped = 0

        logger.info('[OPERATED] now=%s candidates=%d', now.isoformat(), candidates.count())

        for case in candidates:
            end_dt = timezone.make_aware(
                datetime.combine(case.surgery_date, case.surgery_end_time)
            )
            trigger_at = end_dt + timedelta(minutes=DELAY_MINUTES)

            if now < trigger_at:
                skipped += 1
                continue

            date_str = _fmt_date(case.surgery_date)
            patient_name = decrypt_field(case.patient_name) or 'un paciente'
            # Respect the same "different name for the assistant" privacy split
            # used everywhere else — fall back to the real name if unset.
            patient_name_assistant = decrypt_field(case.patient_name_for_assistant) or patient_name

            if not case.is_operated and not case.operated_reminder_sent_at:
                notify_user(
                    case.created_by,
                    title='¿Ya terminó la cirugía?',
                    body=f'Recordá marcar como operada la cirugía de {patient_name} del {date_str}.',
                    data={'route': f'/cases/{case.pk}'},
                )
                SurgicalCase.objects.filter(pk=case.pk).update(operated_reminder_sent_at=now)
                sent += 1
                logger.info('[OPERATED] sent to creator user=%s for case=%s', case.created_by_id, case.pk)

            if (
                case.assistant_doctor_id and case.assistant_accepted is True
                and not case.assistant_is_operated and not case.assistant_operated_reminder_sent_at
            ):
                notify_user(
                    case.assistant_doctor,
                    title='¿Ya terminó la cirugía?',
                    body=f'Recordá marcar como operada la cirugía de {patient_name_assistant} del {date_str} en la que participaste como ayudante.',
                    data={'route': f'/cases/{case.pk}'},
                )
                SurgicalCase.objects.filter(pk=case.pk).update(assistant_operated_reminder_sent_at=now)
                sent += 1
                logger.info('[OPERATED] sent to assistant user=%s for case=%s', case.assistant_doctor_id, case.pk)

            anesthesia = getattr(case, 'anesthesia', None)
            if (
                anesthesia and anesthesia.anesthesiologist_id and anesthesia.anesthesiologist_accepted is True
                and not anesthesia.is_operated and not case.anesthesiologist_operated_reminder_sent_at
            ):
                notify_user(
                    anesthesia.anesthesiologist,
                    title='¿Ya terminó la cirugía?',
                    body=f'Recordá marcar como operada la cirugía de {patient_name} del {date_str} en la que participaste como anestesiólogo.',
                    data={'route': f'/cases/{case.pk}'},
                )
                SurgicalCase.objects.filter(pk=case.pk).update(anesthesiologist_operated_reminder_sent_at=now)
                sent += 1
                logger.info(
                    '[OPERATED] sent to anesthesiologist user=%s for case=%s',
                    anesthesia.anesthesiologist_id, case.pk,
                )

        self.stdout.write(
            self.style.SUCCESS(f'Recordatorios de operado: enviados={sent}, omitidos={skipped}')
        )
