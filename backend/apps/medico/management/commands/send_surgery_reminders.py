"""
Envía recordatorios push a los médicos antes de sus cirugías programadas.

Diseñado para correr cada 5 minutos via cron en Railway.
Cada usuario configura cuántas horas antes quiere el recordatorio (default: 2h) —
el médico principal, el ayudante y el anestesiólogo invitado tienen su propia
configuración y se evalúan de forma independiente, cada uno con su propia ventana
y su propio flag de "ya enviado" (no se usa la config del médico principal para
notificar a los demás).
Si la fecha/hora de la cirugía cambia, los tres flags de envío se resetean (ver modelo).
"""

import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from apps.medico.models import SurgicalCase
from apps.medico.services.firebase import notify_user

logger = logging.getLogger(__name__)

# Ventana de tolerancia: ±3 minutos (cron corre cada 5 min → máximo 3 min de error)
WINDOW_MINUTES = 3


class Command(BaseCommand):
    help = 'Envía recordatorios push antes de cirugías programadas'

    def handle(self, *args, **options):
        now = timezone.now()

        # Casos con al menos un recordatorio pendiente (para el médico principal,
        # el ayudante o el anestesiólogo): activos, no cancelados, no archivados
        candidates = (
            SurgicalCase.objects
            .filter(
                Q(surgery_reminder_sent_at__isnull=True) |
                Q(assistant_reminder_sent_at__isnull=True) |
                Q(anesthesiologist_reminder_sent_at__isnull=True),
                archived_at__isnull=True,
                is_paid=False,
            )
            .exclude(status='cancelled')
            .select_related('created_by', 'assistant_doctor')
            .prefetch_related('anesthesia')
        )

        sent = 0
        skipped = 0

        logger.info('[REMINDER] now=%s candidates=%d', now.isoformat(), candidates.count())

        for case in candidates:
            surgery_time = case.surgery_time or datetime.min.time()
            surgery_dt = timezone.make_aware(
                datetime.combine(case.surgery_date, surgery_time)
            )

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

            # Cada destinatario evalúa su propia ventana según SU propia configuración
            recipients = [
                (case.created_by, 'surgery_reminder_sent_at'),
            ]
            if case.assistant_doctor and case.assistant_accepted is True:
                recipients.append((case.assistant_doctor, 'assistant_reminder_sent_at'))

            anesthesiologist = None
            try:
                anesthesia = case.anesthesia
                if anesthesia.anesthesiologist and anesthesia.anesthesiologist_accepted is True:
                    anesthesiologist = anesthesia.anesthesiologist
            except Exception:
                pass
            if anesthesiologist:
                recipients.append((anesthesiologist, 'anesthesiologist_reminder_sent_at'))

            any_sent_for_case = False

            for user, sent_field in recipients:
                if getattr(case, sent_field) is not None:
                    continue  # ya se le envió a este destinatario

                reminder_hours = getattr(user, 'surgery_reminder_hours', 2)

                target = now + timedelta(hours=reminder_hours)
                window_start = target - timedelta(minutes=WINDOW_MINUTES)
                window_end = target + timedelta(minutes=WINDOW_MINUTES)
                past_window = surgery_dt < window_start
                in_window = window_start <= surgery_dt <= window_end

                logger.info(
                    '[REMINDER] case=%s user=%s field=%s reminder_hours=%s surgery_dt=%s in_window=%s past_window=%s',
                    case.pk, user.id, sent_field, reminder_hours,
                    surgery_dt.isoformat(), in_window, past_window,
                )

                if not in_window and not past_window:
                    continue

                notify_user(
                    user,
                    title=f'Recordatorio: cirugía en {reminder_hours}h',
                    body=body,
                    data={'route': f'/cases/{case.pk}'},
                )
                SurgicalCase.objects.filter(pk=case.pk).update(**{sent_field: now})
                sent += 1
                any_sent_for_case = True
                logger.info('[REMINDER] sent to user=%s (%s) for case=%s', user.id, sent_field, case.pk)

            if not any_sent_for_case:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(f'Recordatorios enviados: {sent}, casos omitidos: {skipped}')
        )
