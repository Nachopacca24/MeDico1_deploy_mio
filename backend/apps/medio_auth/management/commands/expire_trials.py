"""
Reverts expired premium trials and cancelled-past-period subscriptions to free.
Also the safety net for missed Lemon Squeezy webhooks on failed/expired renewals —
see steps 3 and 4 below.
Run every ~5 min via the Railway notifications cron chain so the DB stays in sync
even if LS webhooks are missed.
"""
import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db.models import F, Q
from django.utils import timezone
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()

# Grace period after a renewal payment first fails/goes unrecorded before we downgrade
# the user to Free. Matches the policy communicated to the user in Settings.
PAYMENT_OVERDUE_GRACE_DAYS = 3


class Command(BaseCommand):
    help = 'Reverts expired trials and cancelled subscriptions past their end date to free'

    def handle(self, *args, **options):
        now = timezone.now()

        # 1. Trials that have passed their end date  (ASCII "->" below, not unicode "->":
        # some deploy consoles use a non-UTF-8 locale and choke on it in stdout.write)
        expired_trials = User.objects.filter(
            plan='premium',
            is_permanent_premium=False,
            trial_ends_at__lt=now,
            trial_ends_at__isnull=False,
            ls_subscription_id__isnull=True,  # only trial users, not paying ones
        )
        trial_count = expired_trials.count()
        if trial_count:
            expired_trials.update(plan='free', trial_ends_at=None)
            logger.info('[EXPIRE_TRIALS] reverted %d trial users to free', trial_count)
            self.stdout.write(self.style.SUCCESS(f'Trials expirados -> free: {trial_count}'))
        else:
            self.stdout.write('No hay trials expirados pendientes.')

        # 2. Cancelled subscriptions whose period has ended (webhook safety net)
        # These users cancelled, LS marked subscription_cancelled, but subscription_expired
        # webhook may have been missed. If ls_renews_at (= ends_at) is past, downgrade.
        expired_subs_qs = User.objects.filter(
            plan='premium',
            is_permanent_premium=False,
            ls_cancelled=True,
            ls_renews_at__lt=now,
            ls_renews_at__isnull=False,
        )
        sub_count = expired_subs_qs.count()
        if sub_count:
            # Users with a future referral bonus -> activate trial instead of dropping to free
            with_bonus = expired_subs_qs.filter(trial_ends_at__gt=now)
            without_bonus = expired_subs_qs.filter(
                Q(trial_ends_at__isnull=True) | Q(trial_ends_at__lte=now)
            )
            bonus_count = with_bonus.update(
                ls_cancelled=False,
                ls_subscription_id=None,
                ls_renews_at=None,
                # plan stays 'premium' — trial_ends_at still in future
            )
            free_count = without_bonus.update(
                plan='free',
                ls_cancelled=False,
                ls_subscription_id=None,
                ls_renews_at=None,
                trial_ends_at=None,
            )
            logger.info('[EXPIRE_TRIALS] cancelled subs expired: %d -> trial (bonus), %d -> free', bonus_count, free_count)
            self.stdout.write(self.style.SUCCESS(
                f'Suscripciones canceladas expiradas: {bonus_count} -> trial (bonus), {free_count} -> free'
            ))
        else:
            self.stdout.write('No hay suscripciones canceladas expiradas pendientes.')

        # 3. Non-cancelled premium subs whose renewal date already passed without us ever
        # recording a subscription_payment_failed webhook (i.e. that webhook itself was
        # missed). Start the overdue clock now, backdated to the actual due date so the
        # 3-day grace period is measured from when payment was really due, not from
        # whenever this cron happened to notice.
        newly_overdue_qs = User.objects.filter(
            plan='premium',
            is_permanent_premium=False,
            ls_cancelled=False,
            ls_subscription_id__isnull=False,
            ls_renews_at__isnull=False,
            ls_renews_at__lt=now,
            ls_payment_overdue_since__isnull=True,
        )
        newly_overdue_count = newly_overdue_qs.update(ls_payment_overdue_since=F('ls_renews_at'))
        if newly_overdue_count:
            logger.warning('[EXPIRE_TRIALS] %d subscriptions newly flagged as payment-overdue (missed renewal)', newly_overdue_count)
            self.stdout.write(self.style.WARNING(f'Suscripciones marcadas como pago vencido: {newly_overdue_count}'))
        else:
            self.stdout.write('No hay renovaciones vencidas nuevas.')

        # 4. Subscriptions overdue on payment for more than PAYMENT_OVERDUE_GRACE_DAYS ->
        # downgrade to free (or to a pending referral-bonus trial). This is the same
        # policy whether the failure came from an explicit subscription_payment_failed
        # webhook or was only caught here in step 3 above.
        overdue_cutoff = now - timedelta(days=PAYMENT_OVERDUE_GRACE_DAYS)
        overdue_qs = User.objects.filter(
            plan='premium',
            is_permanent_premium=False,
            ls_cancelled=False,
            ls_payment_overdue_since__isnull=False,
            ls_payment_overdue_since__lt=overdue_cutoff,
        )
        overdue_count = overdue_qs.count()
        if overdue_count:
            from apps.payment.views import _deactivate_premium
            for user in overdue_qs:
                _deactivate_premium(user)
            logger.warning(
                '[EXPIRE_TRIALS] %d users downgraded to free — payment overdue >%dd',
                overdue_count, PAYMENT_OVERDUE_GRACE_DAYS,
            )
            self.stdout.write(self.style.WARNING(
                f'Bajados a Free por pago rechazado (>{PAYMENT_OVERDUE_GRACE_DAYS}d vencido): {overdue_count}'
            ))
        else:
            self.stdout.write('No hay suscripciones vencidas por más de 3 días.')
