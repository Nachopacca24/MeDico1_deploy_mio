"""
Manda un push recordando que la app existe a usuarios que llevan un buen
rato sin abrirla, para que no se olviden de registrar una cirugía pendiente.

Escalonado, no un solo disparo ni un loop parejo: primer recordatorio a las
20 horas de inactividad, el segundo 3 días después de ese, y de ahí en
adelante uno cada 5 días mientras el usuario siga sin volver — bastante
espaciado para no ser spam, pero sin abandonar del todo a quien lleva
semanas sin entrar.

Corre cada ~5 min via el cron de notificaciones de Railway (railway.notifications.json).

inactivity_reminder_count + inactivity_reminder_sent_at llevan la cuenta de
en qué escalón va la racha de inactividad actual. Si el usuario vuelve a
abrir la app (last_active_at avanza más allá del último recordatorio), la
racha se considera terminada: el próximo recordatorio vuelve a arrancar en
el primer escalón (20h) en vez de seguir donde había quedado.
"""

import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.medico.services.firebase import notify_user

logger = logging.getLogger(__name__)
User = get_user_model()

# Intervalo antes del recordatorio N (índice 0-based). Más allá del último
# valor de la lista, se repite el último indefinidamente.
STAGE_INTERVALS = [timedelta(hours=20), timedelta(days=3)]
REPEAT_INTERVAL = timedelta(days=5)


def _interval_for(count: int) -> timedelta:
    if count < len(STAGE_INTERVALS):
        return STAGE_INTERVALS[count]
    return REPEAT_INTERVAL


class Command(BaseCommand):
    help = 'Manda un push escalonado (20h, 3 días, luego cada 5 días) a usuarios inactivos'

    def handle(self, *args, **options):
        now = timezone.now()
        # Ningún recordatorio puede ser debido antes de las 20h del primer
        # escalón, así que este filtro ya descarta a todo el que no aplica
        # todavía sin tener que evaluar el escalonado en Python para todos.
        cutoff = now - STAGE_INTERVALS[0]

        candidates = User.objects.filter(
            is_active=True,
            last_active_at__isnull=False,
            last_active_at__lte=cutoff,
        )

        sent = 0
        for user in candidates:
            fresh_streak = (
                user.inactivity_reminder_sent_at is None
                or user.inactivity_reminder_sent_at < user.last_active_at
            )
            count = 0 if fresh_streak else user.inactivity_reminder_count
            reference = user.last_active_at if count == 0 else user.inactivity_reminder_sent_at

            if now - reference < _interval_for(count):
                continue

            notify_user(
                user,
                title='¿Tenés una cirugía para agendar?',
                body='Entrá a MeDico App y registrala en segundos — no dejes pasar el cálculo de tus honorarios.',
                data={'route': '/dashboard'},
            )
            User.objects.filter(pk=user.pk).update(
                inactivity_reminder_sent_at=now,
                inactivity_reminder_count=count + 1,
            )
            sent += 1
            logger.info(
                '[INACTIVITY_REMINDER] sent to user=%s streak_reminder=#%d last_active_at=%s',
                user.id, count + 1, user.last_active_at,
            )

        self.stdout.write(self.style.SUCCESS(f'Recordatorios de inactividad enviados: {sent}'))
