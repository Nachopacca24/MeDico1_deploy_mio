"""
Reverts expired premium trials and cancelled-past-period subscriptions to free.
Run every hour via Railway cron so the DB stays in sync even if LS webhooks are missed.
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = 'Reverts expired trials and cancelled subscriptions past their end date to free'

    def handle(self, *args, **options):
        now = timezone.now()

        # 1. Trials that have passed their end date
        expired_trials = User.objects.filter(
            plan='premium',
            is_permanent_premium=False,
            trial_ends_at__lt=now,
            trial_ends_at__isnull=False,
            ls_subscription_id__isnull=True,  # only trial users, not paying ones
        )
        trial_count = expired_trials.count()
        if trial_count:
            expired_trials.update(plan='free')
            logger.info('[EXPIRE_TRIALS] reverted %d trial users to free', trial_count)
            self.stdout.write(self.style.SUCCESS(f'Trials expirados → free: {trial_count}'))
        else:
            self.stdout.write('No hay trials expirados pendientes.')

        # 2. Cancelled subscriptions whose period has ended (webhook safety net)
        # These users cancelled, LS marked subscription_cancelled, but subscription_expired
        # webhook may have been missed. If ls_renews_at (= ends_at) is past, downgrade.
        expired_subs = User.objects.filter(
            plan='premium',
            is_permanent_premium=False,
            ls_cancelled=True,
            ls_renews_at__lt=now,
            ls_renews_at__isnull=False,
        )
        sub_count = expired_subs.count()
        if sub_count:
            expired_subs.update(
                plan='free',
                ls_cancelled=False,
                ls_subscription_id=None,
                ls_renews_at=None,
            )
            logger.info('[EXPIRE_TRIALS] reverted %d cancelled subscriptions past end date to free', sub_count)
            self.stdout.write(self.style.SUCCESS(f'Suscripciones canceladas expiradas → free: {sub_count}'))
        else:
            self.stdout.write('No hay suscripciones canceladas expiradas pendientes.')
