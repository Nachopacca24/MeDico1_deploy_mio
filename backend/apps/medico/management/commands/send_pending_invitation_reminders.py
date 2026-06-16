"""
Recuerda al médico ayudante que tiene una invitación pendiente sin responder.
También alerta al médico principal cuando la cirugía se acerca y el ayudante no confirmó.

Diseñado para correr cada hora via cron en Railway.
Intervalos de recordatorio:
  - Más de 24h hasta la cirugía  → recuerda cada 24h
  - Menos de 24h hasta la cirugía → recuerda cada 6h (urgente)
Ignora casos cuya cirugía ya ocurrió.
"""

import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.medico.models import SurgicalCase
from apps.medico.services.firebase import notify_user

logger = logging.getLogger(__name__)

REMINDER_INTERVAL_HOURS = 24   # Normal: cada 24h
URGENT_INTERVAL_HOURS = 6      # Urgente: cada 6h cuando la cirugía es en menos de 24h


class Command(BaseCommand):
    help = 'Recuerda al ayudante su invitación pendiente; alerta al principal si la cirugía se acerca'

    def handle(self, *args, **options):
        now = timezone.now()
        today = now.date()

        # Solo invitaciones pendientes para cirugías que no han ocurrido aún
        pending = (
            SurgicalCase.objects
            .filter(
                assistant_doctor__isnull=False,
                assistant_accepted__isnull=True,
                archived_at__isnull=True,
                is_paid=False,
                surgery_date__gte=today,
            )
            .select_related('assistant_doctor', 'created_by')
        )

        sent = 0

        for case in pending:
            last_notified = case.assistant_notified_at
            if last_notified is None:
                # La notificación inicial se envía cuando se crea el caso
                continue

            # Calcular horas hasta la cirugía
            surgery_time = case.surgery_time or datetime.min.time()
            surgery_dt = timezone.make_aware(
                datetime.combine(case.surgery_date, surgery_time)
            )
            hours_until = (surgery_dt - now).total_seconds() / 3600

            # Elegir intervalo según urgencia
            interval = URGENT_INTERVAL_HOURS if hours_until <= 24 else REMINDER_INTERVAL_HOURS
            cutoff = now - timedelta(hours=interval)
            if last_notified > cutoff:
                continue  # Demasiado reciente, esperar

            principal_name = case.created_by.get_full_name() or case.created_by.username
            date_str = case.surgery_date.strftime('%d/%m/%Y')
            time_str = case.surgery_time.strftime('%H:%M') if case.surgery_time else ''
            surgery_label = f'el {date_str}' + (f' a las {time_str}' if time_str else '')

            # Notificar al ayudante
            if hours_until <= 24:
                body = f'⚠️ Cirugía pronto. Aún no respondiste la invitación de {principal_name} para {surgery_label}. ¿Aceptás?'
            else:
                body = f'Todavía no respondiste la invitación de {principal_name} para {surgery_label}. ¿Aceptás?'

            notify_user(
                case.assistant_doctor,
                title='Invitación pendiente',
                body=body,
                data={'route': '/cases/assisted'},
            )

            # Si la cirugía es en menos de 48h, también avisar al principal
            if hours_until <= 48:
                assistant_name = case.assistant_doctor.get_full_name() or case.assistant_doctor.username
                notify_user(
                    case.created_by,
                    title='Ayudante no confirmó',
                    body=f'{assistant_name} aún no aceptó tu invitación para la cirugía del {date_str}.',
                    data={'route': f'/cases/{case.pk}'},
                )
                logger.info(
                    '[INV_REMINDER] alerted principal=%s for case=%s (hours_until=%.1f)',
                    case.created_by_id, case.pk, hours_until,
                )

            SurgicalCase.objects.filter(pk=case.pk).update(assistant_notified_at=now)
            sent += 1
            logger.info(
                '[INV_REMINDER] sent to assistant=%s for case=%s (hours_until=%.1f, interval=%dh)',
                case.assistant_doctor_id, case.pk, hours_until, interval,
            )

        self.stdout.write(
            self.style.SUCCESS(f'Recordatorios de invitación enviados: {sent}')
        )
