"""
Management command para limpiar tokens JWT blacklisteados expirados.

Este comando debe ejecutarse periódicamente (ej: cronjob diario) para
prevenir que la tabla de blacklist crezca indefinidamente.

Uso:
    python manage.py cleanup_blacklisted_tokens
"""
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken


class Command(BaseCommand):
    help = 'Elimina tokens JWT blacklisteados que ya han expirado'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Eliminar tokens expirados hace más de X días (default: 7)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostrar lo que se eliminaría sin hacer cambios',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        # Calcular fecha límite
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Encontrar tokens expirados y blacklisteados
        expired_tokens = OutstandingToken.objects.filter(
            expires_at__lt=cutoff_date,
            blacklistedtoken__isnull=False
        )
        
        count = expired_tokens.count()
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'[DRY RUN] Se eliminarían {count} tokens expirados hace más de {days} días'
                )
            )
            
            # Mostrar algunos ejemplos
            sample = expired_tokens[:5]
            if sample:
                self.stdout.write('\nEjemplos de tokens a eliminar:')
                for token in sample:
                    self.stdout.write(
                        f'  - Token ID: {token.id}, '
                        f'Expirado: {token.expires_at}, '
                        f'Usuario: {token.user}'
                    )
        else:
            if count == 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'No hay tokens blacklisteados expirados hace más de {days} días'
                    )
                )
            else:
                # Eliminar tokens
                expired_tokens.delete()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Se eliminaron {count} tokens blacklisteados expirados'
                    )
                )
                
                # Mostrar estadísticas
                remaining_blacklisted = BlacklistedToken.objects.count()
                total_outstanding = OutstandingToken.objects.count()
                
                self.stdout.write(
                    f'\nEstadísticas:'
                )
                self.stdout.write(
                    f'  - Tokens blacklisteados restantes: {remaining_blacklisted}'
                )
                self.stdout.write(
                    f'  - Total de tokens outstanding: {total_outstanding}'
                )
