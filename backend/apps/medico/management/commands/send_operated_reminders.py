"""
Notifica al médico cuando su cirugía ya finalizó pero aún no la marcó como operada.

Corre cada 5 minutos via cron en Railway.
Usa surgery_end_time + DELAY_MINUTES para disparar la notificación.
Solo envía una vez por caso (operated_reminder_sent_at).
"""

import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

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
    help = 'Notifica al médico que marque la cirugía como operada'

    def handle(self, *args, **options):
        now = timezone.now()

        candidates = (
            SurgicalCase.objects
            .filter(
                is_operated=False,
                operated_reminder_sent_at__isnull=True,
                surgery_end_time__isnull=False,
                archived_at__isnull=True,
            )
            .exclude(status='cancelled')
            .select_related('created_by')
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
            notify_user(
                case.created_by,
                title='¿Ya terminó la cirugía?',
                body=f'Recordá marcar la cirugía del {date_str} como operada en la app.',
                data={'route': f'/cases/{case.pk}'},
            )

            SurgicalCase.objects.filter(pk=case.pk).update(operated_reminder_sent_at=now)
            sent += 1
            logger.info('[OPERATED] sent to user=%s for case=%s', case.created_by_id, case.pk)

        self.stdout.write(
            self.style.SUCCESS(f'Recordatorios de operado: enviados={sent}, omitidos={skipped}')
        )
