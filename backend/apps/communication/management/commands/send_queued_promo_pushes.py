"""
Revisa la cola de push promocionales (Anuncios + publicidad de clientes) y
manda el siguiente si el horario/cupo/espaciado lo permite. La mayoría de
las veces no hace nada — es el respaldo para el push que se encoló porque
en el momento de encolarse no le tocaba salir todavía.

Corre cada ~5 min via el cron de notificaciones de Railway (railway.notifications.json).
"""

from django.core.management.base import BaseCommand

from apps.communication.models import QueuedPromoPush
from apps.communication.services import promo_push


class Command(BaseCommand):
    help = 'Manda el siguiente push promocional en cola si el horario/cupo lo permiten'

    def handle(self, *args, **options):
        pending_before = QueuedPromoPush.objects.filter(sent_at__isnull=True).count()
        if not pending_before:
            self.stdout.write('Nada en cola.')
            return

        promo_push.try_send_next()

        pending_after = QueuedPromoPush.objects.filter(sent_at__isnull=True).count()
        if pending_after < pending_before:
            self.stdout.write(self.style.SUCCESS('Se envió el siguiente push promocional en cola.'))
        else:
            self.stdout.write(f'{pending_before} en cola, ninguno pudo salir todavía (horario/cupo).')
