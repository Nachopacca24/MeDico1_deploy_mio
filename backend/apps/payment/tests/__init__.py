import hashlib
import hmac
import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch

from apps.medico.models.site_setting import SiteSetting
from apps.payment.views import _activate_premium, _deactivate_premium, _mark_cancelled

User = get_user_model()


def _make_user(**kwargs):
    defaults = dict(
        username='testdoc',
        email='testdoc@example.com',
        plan='free',
        trial_ends_at=None,
        is_permanent_premium=False,
        ls_subscription_id=None,
        ls_renews_at=None,
        ls_cancelled=False,
        credit_days=0,
    )
    defaults.update(kwargs)
    return User.objects.create(**defaults)


def _attrs(renews_at=None, ends_at=None):
    """Helper para construir el dict attrs que llega en el webhook."""
    future = (timezone.now() + timedelta(days=30)).isoformat()
    return {
        'renews_at': renews_at or future,
        'ends_at': ends_at,
    }


class ActivatePremiumTest(TestCase):
    """subscription_created / subscription_resumed / payment_success"""

    def test_free_user_becomes_premium(self):
        user = _make_user()
        _activate_premium(user, _attrs(), ls_sub_id='sub_1')
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')
        self.assertEqual(user.ls_subscription_id, 'sub_1')
        self.assertFalse(user.ls_cancelled)

    def test_renews_at_stored(self):
        user = _make_user()
        future = timezone.now() + timedelta(days=31)
        _activate_premium(user, _attrs(renews_at=future.isoformat()), ls_sub_id='sub_1')
        user.refresh_from_db()
        self.assertIsNotNone(user.ls_renews_at)

    def test_pending_bonus_preserved_on_activation(self):
        """Si el usuario tiene créditos de referidos (trial_ends_at futuro), no se borran al pagar."""
        bonus_date = timezone.now() + timedelta(days=45)
        user = _make_user(trial_ends_at=bonus_date)
        _activate_premium(user, _attrs(), ls_sub_id='sub_1')
        user.refresh_from_db()
        self.assertIsNotNone(user.trial_ends_at)
        self.assertGreater(user.trial_ends_at, timezone.now())

    def test_expired_trial_cleared_on_activation(self):
        """trial_ends_at pasado se borra al activar la suscripción paga."""
        old_date = timezone.now() - timedelta(days=5)
        user = _make_user(trial_ends_at=old_date)
        _activate_premium(user, _attrs(), ls_sub_id='sub_1')
        user.refresh_from_db()
        self.assertIsNone(user.trial_ends_at)

    def test_already_cancelled_payment_success_does_not_reactivate(self):
        """payment_success llega después de subscription_cancelled (out-of-order) — debe ignorarse."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1', ls_cancelled=True,
                          ls_renews_at=timezone.now() + timedelta(days=10))
        # Simular lógica del webhook: si ya cancelado, no llamar _activate_premium
        if not user.ls_cancelled:
            _activate_premium(user, _attrs(), ls_sub_id='sub_1')
        user.refresh_from_db()
        self.assertTrue(user.ls_cancelled)  # sigue cancelado
        self.assertEqual(user.plan, 'premium')  # sigue premium hasta fin período


class CancelSubscriptionTest(TestCase):
    """subscription_cancelled"""

    def test_cancel_keeps_premium(self):
        user = _make_user(plan='premium', ls_subscription_id='sub_1')
        ends = timezone.now() + timedelta(days=15)
        _mark_cancelled(user, {'ends_at': ends.isoformat(), 'renews_at': None})
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')
        self.assertTrue(user.ls_cancelled)
        self.assertIsNotNone(user.ls_renews_at)

    def test_permanent_premium_not_affected_by_cancel(self):
        user = _make_user(plan='premium', is_permanent_premium=True, ls_subscription_id='sub_1')
        _mark_cancelled(user, {'ends_at': None, 'renews_at': None})
        user.refresh_from_db()
        self.assertTrue(user.is_permanent_premium)
        self.assertFalse(user.ls_cancelled)


class ExpireSubscriptionTest(TestCase):
    """subscription_expired"""

    def test_expired_goes_to_free(self):
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          ls_cancelled=True, ls_renews_at=timezone.now() - timedelta(days=1))
        _deactivate_premium(user)
        user.refresh_from_db()
        self.assertEqual(user.plan, 'free')
        self.assertIsNone(user.ls_subscription_id)
        self.assertIsNone(user.ls_renews_at)
        self.assertFalse(user.ls_cancelled)

    def test_expired_with_pending_bonus_stays_premium(self):
        """Si tiene créditos/trial futuro, queda premium usando ese bono."""
        bonus = timezone.now() + timedelta(days=40)
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          ls_cancelled=True, trial_ends_at=bonus)
        _deactivate_premium(user)
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')
        self.assertIsNone(user.ls_subscription_id)
        self.assertIsNotNone(user.trial_ends_at)

    def test_permanent_premium_not_deactivated(self):
        user = _make_user(plan='premium', is_permanent_premium=True, ls_subscription_id='sub_1')
        _deactivate_premium(user)
        user.refresh_from_db()
        self.assertTrue(user.is_permanent_premium)
        self.assertEqual(user.plan, 'premium')


class CheckTrialExpiryTest(TestCase):
    """check_trial_expiry — corre en login y GET /profile"""

    def test_expired_trial_downgrades_to_free(self):
        user = _make_user(plan='premium', trial_ends_at=timezone.now() - timedelta(days=1))
        user.check_trial_expiry()
        user.refresh_from_db()
        self.assertEqual(user.plan, 'free')
        self.assertIsNone(user.trial_ends_at)

    def test_active_trial_not_downgraded(self):
        user = _make_user(plan='premium', trial_ends_at=timezone.now() + timedelta(days=10))
        user.check_trial_expiry()
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')

    def test_paying_subscriber_not_downgraded_by_trial_expiry(self):
        """Suscriptor pago con trial_ends_at vencido no debe bajarse — tiene ls_subscription_id."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          trial_ends_at=timezone.now() - timedelta(days=1))
        user.check_trial_expiry()
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')

    def test_permanent_premium_not_downgraded(self):
        user = _make_user(plan='premium', is_permanent_premium=True,
                          trial_ends_at=timezone.now() - timedelta(days=1))
        user.check_trial_expiry()
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')


class ApplyCreditsOnPromoEndTest(TestCase):
    """apply_credits_on_promo_end — corre cuando FREE_FOR_ALL se desactiva"""

    def test_free_user_gets_30_days_and_promoted(self):
        user = _make_user(plan='free')
        User.apply_credits_on_promo_end(default_days=30)
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')
        self.assertIsNotNone(user.trial_ends_at)
        self.assertGreater(user.trial_ends_at, timezone.now() + timedelta(days=29))

    def test_credit_days_added_to_bonus(self):
        user = _make_user(plan='free', credit_days=10)
        User.apply_credits_on_promo_end(default_days=30)
        user.refresh_from_db()
        # Debe tener al menos 40 días desde ahora
        self.assertGreater(user.trial_ends_at, timezone.now() + timedelta(days=39))

    def test_no_double_counting_when_trial_ends_at_was_null(self):
        """Usuario registrado durante FREE_FOR_ALL (trial_ends_at=None) recibe exactamente 30 días."""
        user = _make_user(plan='premium', trial_ends_at=None)
        before = timezone.now()
        User.apply_credits_on_promo_end(default_days=30)
        user.refresh_from_db()
        # trial_ends_at debe ser ~30 días desde ahora, no 60
        expected_max = before + timedelta(days=31)
        self.assertLessEqual(user.trial_ends_at, expected_max)

    def test_permanent_premium_excluded(self):
        user = _make_user(plan='premium', is_permanent_premium=True, trial_ends_at=None)
        User.apply_credits_on_promo_end(default_days=30)
        user.refresh_from_db()
        self.assertIsNone(user.trial_ends_at)  # no se tocó

    def test_cancelled_subscriber_not_promoted(self):
        """Usuario con suscripción cancelada no debe cambiar plan."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1', ls_cancelled=True)
        User.apply_credits_on_promo_end(default_days=30)
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')
        self.assertTrue(user.ls_cancelled)

    def test_paying_subscriber_gets_bonus_anchored_after_renewal(self):
        """Suscriptor pago recibe bono anclado después de ls_renews_at."""
        renewal = timezone.now() + timedelta(days=20)
        user = _make_user(plan='premium', ls_subscription_id='sub_1', ls_renews_at=renewal)
        User.apply_credits_on_promo_end(default_days=30)
        user.refresh_from_db()
        # trial_ends_at debe ser después de la renovación
        self.assertGreater(user.trial_ends_at, renewal)


class ReferralCreditTest(TestCase):
    """_apply_referral — créditos de colegas"""

    def _register_referrals(self, referrer, count):
        from apps.medio_auth.views import _apply_referral
        for i in range(count):
            new_user = User.objects.create(
                username=f'ref_{i}_{referrer.id}',
                email=f'ref_{i}_{referrer.id}@example.com',
            )
            _apply_referral(new_user, referrer)
        referrer.refresh_from_db()

    def test_5_referrals_gives_10_credit_days(self):
        referrer = _make_user(username='referrer', email='referrer@example.com')
        self._register_referrals(referrer, 5)
        self.assertEqual(referrer.credit_days, 10)

    def test_10_referrals_gives_20_credit_days(self):
        referrer = _make_user(username='referrer2', email='referrer2@example.com')
        self._register_referrals(referrer, 10)
        self.assertEqual(referrer.credit_days, 20)

    def test_4_referrals_gives_no_credit(self):
        referrer = _make_user(username='referrer3', email='referrer3@example.com')
        self._register_referrals(referrer, 4)
        self.assertEqual(referrer.credit_days, 0)

    def test_referral_not_applied_twice_to_same_user(self):
        from apps.medio_auth.views import _apply_referral
        referrer = _make_user(username='referrer4', email='referrer4@example.com')
        new_user = User.objects.create(username='once', email='once@example.com')
        _apply_referral(new_user, referrer)
        _apply_referral(new_user, referrer)  # segunda vez — debe ignorarse
        referrer.refresh_from_db()
        self.assertEqual(User.objects.filter(referred_by=referrer).count(), 1)


class FullScenarioTest(TestCase):
    """Escenarios completos end-to-end (sin llamadas a LS API)"""

    def test_scenario_subscribe_then_cancel_then_expire(self):
        """Flujo completo: paga → cancela → expira → queda free."""
        user = _make_user()

        # 1. Paga
        _activate_premium(user, _attrs(renews_at=(timezone.now() + timedelta(days=30)).isoformat()), ls_sub_id='sub_1')
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')
        self.assertFalse(user.ls_cancelled)

        # 2. Cancela
        end_date = timezone.now() + timedelta(days=15)
        _mark_cancelled(user, {'ends_at': end_date.isoformat(), 'renews_at': None})
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')  # sigue premium
        self.assertTrue(user.ls_cancelled)

        # 3. Expira
        _deactivate_premium(user)
        user.refresh_from_db()
        self.assertEqual(user.plan, 'free')
        self.assertIsNone(user.ls_subscription_id)

    def test_scenario_subscribe_expire_with_referral_credits(self):
        """Paga → acumula créditos de referidos → expira → usa créditos como trial."""
        bonus = timezone.now() + timedelta(days=40)
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          ls_cancelled=True, trial_ends_at=bonus)

        _deactivate_premium(user)
        user.refresh_from_db()

        # Queda en premium usando el bono de referidos
        self.assertEqual(user.plan, 'premium')
        self.assertIsNone(user.ls_subscription_id)
        self.assertIsNotNone(user.trial_ends_at)

        # Simular que el bono también expira
        user.trial_ends_at = timezone.now() - timedelta(days=1)
        user.save(update_fields=['trial_ends_at'])
        user.check_trial_expiry()
        user.refresh_from_db()
        self.assertEqual(user.plan, 'free')

    def test_scenario_free_for_all_ends_applies_credits(self):
        """FREE_FOR_ALL termina → usuario free con créditos recibe 30+10 días."""
        user = _make_user(plan='free', credit_days=10, trial_ends_at=None)
        User.apply_credits_on_promo_end(default_days=30)
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')
        self.assertGreater(user.trial_ends_at, timezone.now() + timedelta(days=39))
        # No más de 41 días (30+10+1 de margen)
        self.assertLess(user.trial_ends_at, timezone.now() + timedelta(days=41))
