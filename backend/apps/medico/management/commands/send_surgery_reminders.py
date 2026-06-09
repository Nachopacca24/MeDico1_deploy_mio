"""
Envía recordatorios push a los médicos antes de sus cirugías programadas.

Diseñado para correr cada hora via cron en Railway.
Cada usuario configura cuántas horas antes quiere el recordatorio (default: 24h).
Usa surgery_reminder_sent_at para no enviar el recordatorio más de una vez por caso.
"""

import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.medico.models import SurgicalCase
from apps.medico.services.firebase import notify_user

logger = logging.getLogger(__name__)

# Ventana de tolerancia: ±30 minutos para no perder casos al correr cada hora
WINDOW_MINUTES = 30


class Command(BaseCommand):
    help = 'Envía recordatorios push antes de cirugías programadas'

    def handle(self, *args, **options):
        now = timezone.now()

        # Casos pendientes de recordatorio: activos, no cancelados, no archivados
        candidates = (
            SurgicalCase.objects
            .filter(
                surgery_reminder_sent_at__isnull=True,
                archived_at__isnull=True,
                is_paid=False,
            )
            .exclude(status='cancelled')
            .select_related('created_by')
        )

        sent = 0
        skipped = 0

        for case in candidates:
            user = case.created_by
            reminder_hours = getattr(user, 'surgery_reminder_hours', 24)

            # Construir el datetime de la cirugía (combinar fecha + hora si existe)
            surgery_time = case.surgery_time or datetime.min.time()
            surgery_dt = timezone.make_aware(
                datetime.combine(case.surgery_date, surgery_time)
            )

            # Ventana objetivo: [now + hours - 30min, now + hours + 30min]
            target = now + timedelta(hours=reminder_hours)
            window_start = target - timedelta(minutes=WINDOW_MINUTES)
            window_end = target + timedelta(minutes=WINDOW_MINUTES)

            if not (window_start <= surgery_dt <= window_end):
                skipped += 1
                continue

            # No enviar si la cirugía ya pasó
            if surgery_dt <= now:
                skipped += 1
                continue

            date_str = case.surgery_date.strftime('%d/%m/%Y')
            time_str = case.surgery_time.strftime('%H:%M') if case.surgery_time else ''
            body = f'Cirugía programada para el {date_str}'
            if time_str:
                body += f' a las {time_str}'
            body += '.'

            notify_user(
                user,
                title=f'Recordatorio: cirugía en {reminder_hours}h',
                body=body,
                data={'route': f'/cases/{case.pk}'},
            )

            SurgicalCase.objects.filter(pk=case.pk).update(surgery_reminder_sent_at=now)
            sent += 1
            logger.info('[REMINDER] sent to user=%s for case=%s', user.id, case.pk)

        self.stdout.write(
            self.style.SUCCESS(f'Recordatorios enviados: {sent}, omitidos: {skipped}')
        )
