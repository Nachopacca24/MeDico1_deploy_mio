from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.advertising.models import Advertisement, Client


class Command(BaseCommand):
    help = 'Marca como expirados los anuncios y clientes cuya fecha de fin ya pasó'

    def handle(self, *args, **options):
        today = timezone.now().date()

        expired_ads = Advertisement.objects.filter(
            status='active',
            end_date__lt=today,
        )
        ads_count = expired_ads.update(status='completed')

        expired_clients = Client.objects.filter(
            status='active',
            end_date__lt=today,
        )
        clients_count = expired_clients.update(status='expired')

        self.stdout.write(
            self.style.SUCCESS(
                f'Expirados: {ads_count} anuncios, {clients_count} clientes'
            )
        )
