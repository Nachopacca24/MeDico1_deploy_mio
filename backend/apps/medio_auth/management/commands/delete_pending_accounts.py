"""
Management command: delete_pending_accounts

Elimina definitivamente las cuentas que solicitaron su eliminación
hace más de 30 días y están desactivadas (is_active=False).

Uso:
    python manage.py delete_pending_accounts
    python manage.py delete_pending_accounts --dry-run

Programar en Railway con un cron job diario:
    python manage.py delete_pending_accounts
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()
DELETION_GRACE_DAYS = 30


class Command(BaseCommand):
    help = 'Elimina definitivamente las cuentas con solicitud de eliminación mayor a 30 días.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra qué cuentas se eliminarían sin eliminarlas realmente.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(days=DELETION_GRACE_DAYS)

        pending = User.objects.filter(
            deletion_requested_at__isnull=False,
            deletion_requested_at__lte=cutoff,
            is_active=False,
        )

        count = pending.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No hay cuentas pendientes de eliminación.'))
            return

        self.stdout.write(f'Cuentas a eliminar: {count}')

        for user in pending:
            self.stdout.write(
                f'  {"[DRY RUN] " if dry_run else ""}Eliminando: {user.email} '
                f'(solicitado: {user.deletion_requested_at.strftime("%d/%m/%Y")})'
            )

        if dry_run:
            self.stdout.write(self.style.WARNING('Dry run — no se eliminó nada.'))
            return

        deleted_count, _ = pending.delete()
        self.stdout.write(
            self.style.SUCCESS(f'{deleted_count} cuenta(s) eliminada(s) definitivamente.')
        )
