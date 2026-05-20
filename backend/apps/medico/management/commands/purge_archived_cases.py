from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.medico.models import SurgicalCase


class Command(BaseCommand):
    help = 'Elimina permanentemente los casos archivados hace más de 6 meses'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=180)
        qs = SurgicalCase.objects.filter(archived_at__lte=cutoff)
        count = qs.count()
        qs.delete()
        self.stdout.write(
            self.style.SUCCESS(f'Eliminados permanentemente: {count} casos archivados')
        )
