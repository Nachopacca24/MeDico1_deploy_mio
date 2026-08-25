"""
Manda un push recordando que la app existe a usuarios que llevan un buen
rato sin abrirla, para que no se olviden de registrar una cirugía pendiente.

Corre cada ~5 min via el cron de notificaciones de Railway (railway.notifications.json).

inactivity_reminder_sent_at guarda el last_active_at vigente al momento del
envío (no la fecha de envío) — si el usuario vuelve a abrir la app,
last_active_at avanza y deja de coincidir, así que la próxima vez que esté
inactivo 20+ horas se le vuelve a mandar el recordatorio.
"""

import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.medico.services.firebase import notify_user

logger = logging.getLogger(__name__)
User = get_user_model()

INACTIVITY_HOURS = 20


class Command(BaseCommand):
    help = "Manda un push a usuarios inactivos hace más de 20 horas para recordarles la app"

    def handle(self, *args, **options):
        now = timezone.now()
        cutoff = now - timedelta(hours=INACTIVITY_HOURS)

        candidates = User.objects.filter(
            is_active=True,
            last_active_at__isnull=False,
            last_active_at__lte=cutoff,
        )

        sent = 0
        for user in candidates:
            if user.inactivity_reminder_sent_at and user.inactivity_reminder_sent_at >= user.last_active_at:
                continue  # ya se le mandó para esta racha de inactividad

            notify_user(
                user,
                title='¿Tenés una cirugía para agendar?',
                body='Entrá a MeDico App y registrala en segundos — no dejes pasar el cálculo de tus honorarios.',
                data={'route': '/dashboard'},
            )
            User.objects.filter(pk=user.pk).update(inactivity_reminder_sent_at=now)
            sent += 1
            logger.info('[INACTIVITY_REMINDER] sent to user=%s last_active_at=%s', user.id, user.last_active_at)

        self.stdout.write(self.style.SUCCESS(f'Recordatorios de inactividad enviados: {sent}'))
