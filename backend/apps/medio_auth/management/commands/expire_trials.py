"""
Reverts expired premium trials to free plan.
Run every hour via Railway cron so the DB stays in sync
without depending on user login.
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = 'Reverts expired trial users from premium to free'

    def handle(self, *args, **options):
        now = timezone.now()
        expired = User.objects.filter(
            plan='premium',
            is_permanent_premium=False,
            trial_ends_at__lt=now,
            trial_ends_at__isnull=False,
        )
        count = expired.count()
        if count:
            expired.update(plan='free')
            logger.info('[EXPIRE_TRIALS] reverted %d users to free', count)
            self.stdout.write(self.style.SUCCESS(f'Revertidos a free: {count}'))
        else:
            self.stdout.write('No hay trials expirados pendientes.')
