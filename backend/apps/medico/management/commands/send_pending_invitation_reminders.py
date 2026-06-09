"""
Recuerda al médico ayudante que tiene una invitación pendiente sin responder.

Diseñado para correr cada hora via cron en Railway.
Envía recordatorio si han pasado 48h desde la última notificación (assistant_notified_at).
Actualiza assistant_notified_at para no spamear.
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.medico.models import SurgicalCase
from apps.medico.services.firebase import notify_user

logger = logging.getLogger(__name__)

REMINDER_AFTER_HOURS = 48


class Command(BaseCommand):
    help = 'Recuerda al ayudante que tiene una invitación pendiente sin responder'

    def handle(self, *args, **options):
        now = timezone.now()
        cutoff = now - timedelta(hours=REMINDER_AFTER_HOURS)

        # Invitaciones pendientes donde el ayudante no respondió en 48h
        pending = (
            SurgicalCase.objects
            .filter(
                assistant_doctor__isnull=False,
                assistant_accepted__isnull=True,
                archived_at__isnull=True,
                is_paid=False,
            )
            .filter(assistant_notified_at__lte=cutoff)
            .select_related('assistant_doctor', 'created_by')
        )

        sent = 0

        for case in pending:
            principal_name = case.created_by.get_full_name() or case.created_by.username
            notify_user(
                case.assistant_doctor,
                title='Invitación pendiente',
                body=f'Todavía no respondiste la invitación de {principal_name}. ¿Aceptás?',
                data={'route': '/cases/assisted'},
            )
            SurgicalCase.objects.filter(pk=case.pk).update(assistant_notified_at=now)
            sent += 1
            logger.info(
                '[INV_REMINDER] sent to assistant=%s for case=%s',
                case.assistant_doctor_id, case.pk
            )

        self.stdout.write(
            self.style.SUCCESS(f'Recordatorios de invitación enviados: {sent}')
        )
