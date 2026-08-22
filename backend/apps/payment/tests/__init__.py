import hashlib
import hmac
import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch

from apps.medico.models.site_setting import SiteSetting
from apps.payment.views import _activate_premium, _deactivate_premium, _mark_cancelled, _mark_payment_overdue

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


class FreeForAllDeactivationEndpointTest(TestCase):
    """PUT /api/admin/settings/ — el bono al desactivar FREE_FOR_ALL usa TRIAL_DAYS, no un número fijo"""

    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', email='admin@example.com', password='x', is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_deactivation_grants_configured_trial_days(self):
        SiteSetting.set('TRIAL_DAYS', '65')
        SiteSetting.set('FREE_FOR_ALL_PREMIUM', '1')
        user = _make_user(plan='free')

        response = self.client.put('/api/admin/settings/', {'FREE_FOR_ALL_PREMIUM': '0'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['granted_days'], 65)
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')
        self.assertGreater(user.trial_ends_at, timezone.now() + timedelta(days=64))

    def test_deactivation_falls_back_to_30_when_trial_days_unset(self):
        SiteSetting.set('FREE_FOR_ALL_PREMIUM', '1')

        response = self.client.put('/api/admin/settings/', {'FREE_FOR_ALL_PREMIUM': '0'}, format='json')

        self.assertEqual(response.data['granted_days'], 30)


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

    def test_3_referrals_gives_10_credit_days(self):
        referrer = _make_user(username='referrer', email='referrer@example.com')
        self._register_referrals(referrer, 3)
        self.assertEqual(referrer.credit_days, 10)

    def test_6_referrals_gives_20_credit_days(self):
        referrer = _make_user(username='referrer2', email='referrer2@example.com')
        self._register_referrals(referrer, 6)
        self.assertEqual(referrer.credit_days, 20)

    def test_2_referrals_gives_no_credit(self):
        referrer = _make_user(username='referrer3', email='referrer3@example.com')
        self._register_referrals(referrer, 2)
        self.assertEqual(referrer.credit_days, 0)

    def test_referral_not_applied_twice_to_same_user(self):
        from apps.medio_auth.views import _apply_referral
        referrer = _make_user(username='referrer4', email='referrer4@example.com')
        new_user = User.objects.create(username='once', email='once@example.com')
        _apply_referral(new_user, referrer)
        _apply_referral(new_user, referrer)  # segunda vez — debe ignorarse
        referrer.refresh_from_db()
        self.assertEqual(User.objects.filter(referred_by=referrer).count(), 1)


class ProcessSignupReferralTest(TestCase):
    """_process_signup_referral — la ruta única que usan registro/Google/Apple para
    aplicar el código de invitación de un colega en el signup."""

    def test_creates_friendship_and_returns_colleague_name(self):
        from apps.medio_auth.models import Friendship
        from apps.medio_auth.views import _process_signup_referral
        referrer = _make_user(username='colega', email='colega@example.com', first_name='Ana', last_name='Pérez')
        new_user = _make_user(username='nuevo', email='nuevo@example.com')

        colleague_name = _process_signup_referral(new_user, referrer.friend_code)

        self.assertEqual(colleague_name, 'Ana Pérez')
        self.assertTrue(
            Friendship.objects.filter(
                user=min(referrer, new_user, key=lambda u: u.id),
                friend=max(referrer, new_user, key=lambda u: u.id),
            ).exists()
        )
        new_user.refresh_from_db()
        self.assertEqual(new_user.referred_by_id, referrer.id)

    def test_code_is_case_insensitive(self):
        from apps.medio_auth.views import _process_signup_referral
        referrer = _make_user(username='colega2', email='colega2@example.com')
        new_user = _make_user(username='nuevo2', email='nuevo2@example.com')

        colleague_name = _process_signup_referral(new_user, referrer.friend_code.lower())

        self.assertIsNotNone(colleague_name)
        new_user.refresh_from_db()
        self.assertEqual(new_user.referred_by_id, referrer.id)

    def test_grant_credit_false_connects_but_skips_credit(self):
        """Cuenta EXISTENTE que vuelve a entrar con Google/Apple usando un link de
        colega: se conecta como colega, pero no cuenta como referido nuevo."""
        from apps.medio_auth.models import Friendship
        from apps.medio_auth.views import _process_signup_referral
        referrer = _make_user(username='colega3', email='colega3@example.com')
        existing_user = _make_user(username='existente', email='existente@example.com')

        colleague_name = _process_signup_referral(existing_user, referrer.friend_code, grant_credit=False)

        self.assertIsNotNone(colleague_name)
        self.assertTrue(
            Friendship.objects.filter(
                user=min(referrer, existing_user, key=lambda u: u.id),
                friend=max(referrer, existing_user, key=lambda u: u.id),
            ).exists()
        )
        existing_user.refresh_from_db()
        self.assertIsNone(existing_user.referred_by_id)

    def test_unknown_code_returns_none_without_raising(self):
        from apps.medio_auth.views import _process_signup_referral
        new_user = _make_user(username='nuevo3', email='nuevo3@example.com')

        colleague_name = _process_signup_referral(new_user, 'NOEXISTE1')

        self.assertIsNone(colleague_name)

    def test_empty_code_returns_none(self):
        from apps.medio_auth.views import _process_signup_referral
        new_user = _make_user(username='nuevo4', email='nuevo4@example.com')

        self.assertIsNone(_process_signup_referral(new_user, ''))
        self.assertIsNone(_process_signup_referral(new_user, None))

    def test_self_referral_returns_none_and_creates_no_friendship(self):
        from apps.medio_auth.models import Friendship
        from apps.medio_auth.views import _process_signup_referral
        user = _make_user(username='solito', email='solito@example.com')

        colleague_name = _process_signup_referral(user, user.friend_code)

        self.assertIsNone(colleague_name)
        self.assertEqual(Friendship.objects.count(), 0)


class RegisterEndpointReferralTest(TestCase):
    """POST /api/auth/register/ — el código de colega llega en la misma respuesta,
    sin depender de una segunda llamada de red desde el frontend."""

    def test_register_with_referral_code_returns_colleague_name(self):
        from rest_framework.test import APIClient
        referrer = _make_user(username='referrer_ep', email='referrer_ep@example.com', first_name='Luis', last_name='Gómez')
        client = APIClient()

        response = client.post('/api/auth/register/', {
            'username': 'nuevo_ep',
            'email': 'nuevo_ep@example.com',
            'password': 'ContraseñaSegura123',
            'password2': 'ContraseñaSegura123',
            'first_name': 'Nuevo',
            'last_name': 'Usuario',
            'specialty': 'Cardiovascular',
            'referral_code': referrer.friend_code,
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['colleague_name'], 'Luis Gómez')


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


class PaymentOverdueTest(TestCase):
    """subscription_payment_failed → grace period → downgrade after 3 days (safety net)"""

    def test_payment_failed_starts_overdue_clock(self):
        user = _make_user(plan='premium', ls_subscription_id='sub_1')
        _mark_payment_overdue(user)
        user.refresh_from_db()
        self.assertIsNotNone(user.ls_payment_overdue_since)
        self.assertEqual(user.plan, 'premium')  # still premium during grace period

    def test_repeated_failure_does_not_reset_clock(self):
        """Varios payment_failed seguidos (reintentos de LS) no deben correr la fecha."""
        first_failure = timezone.now() - timedelta(days=2)
        user = _make_user(plan='premium', ls_subscription_id='sub_1', ls_payment_overdue_since=first_failure)
        _mark_payment_overdue(user)
        user.refresh_from_db()
        self.assertEqual(user.ls_payment_overdue_since, first_failure)

    def test_permanent_premium_never_marked_overdue(self):
        user = _make_user(plan='premium', is_permanent_premium=True, ls_subscription_id='sub_1')
        _mark_payment_overdue(user)
        user.refresh_from_db()
        self.assertIsNone(user.ls_payment_overdue_since)

    def test_already_cancelled_not_marked_overdue(self):
        """Si ya canceló manualmente, el mensaje de 'pago rechazado' no debe pisar ese estado."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1', ls_cancelled=True)
        _mark_payment_overdue(user)
        user.refresh_from_db()
        self.assertIsNone(user.ls_payment_overdue_since)

    def test_successful_payment_clears_overdue_clock(self):
        """Si el cobro se recupera antes de los 3 días, se borra el estado de vencido."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          ls_payment_overdue_since=timezone.now() - timedelta(days=1))
        _activate_premium(user, _attrs(), ls_sub_id='sub_1')
        user.refresh_from_db()
        self.assertIsNone(user.ls_payment_overdue_since)
        self.assertFalse(user.ls_payment_failed_downgrade)

    def test_manual_cancel_clears_overdue_clock(self):
        """Cancelar manualmente durante el período de gracia prioriza el flujo de cancelación."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          ls_payment_overdue_since=timezone.now() - timedelta(days=1))
        _mark_cancelled(user, {'ends_at': (timezone.now() + timedelta(days=5)).isoformat(), 'renews_at': None})
        user.refresh_from_db()
        self.assertIsNone(user.ls_payment_overdue_since)
        self.assertTrue(user.ls_cancelled)

    def test_deactivate_after_overdue_sets_payment_failed_flag(self):
        """Bajado a free por vencimiento de pago → se marca para mostrar el aviso en Settings."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          ls_payment_overdue_since=timezone.now() - timedelta(days=4))
        _deactivate_premium(user)
        user.refresh_from_db()
        self.assertEqual(user.plan, 'free')
        self.assertTrue(user.ls_payment_failed_downgrade)
        self.assertIsNone(user.ls_payment_overdue_since)

    def test_deactivate_without_overdue_does_not_set_payment_failed_flag(self):
        """Bajado a free por el flujo normal de cancelación → NO debe mostrar el aviso de pago rechazado."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1', ls_cancelled=True,
                          ls_renews_at=timezone.now() - timedelta(days=1))
        _deactivate_premium(user)
        user.refresh_from_db()
        self.assertEqual(user.plan, 'free')
        self.assertFalse(user.ls_payment_failed_downgrade)

    def test_deactivate_with_pending_bonus_does_not_set_payment_failed_flag(self):
        """Si el usuario cae en un bono de referidos, no se le muestra el aviso de pago rechazado."""
        bonus = timezone.now() + timedelta(days=20)
        user = _make_user(plan='premium', ls_subscription_id='sub_1', trial_ends_at=bonus,
                          ls_payment_overdue_since=timezone.now() - timedelta(days=4))
        _deactivate_premium(user)
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')  # sigue premium por el bono
        self.assertFalse(user.ls_payment_failed_downgrade)
        self.assertIsNone(user.ls_payment_overdue_since)


class ExpireTrialsOverdueSafetyNetTest(TestCase):
    """Comando expire_trials — pasos 3 y 4: red de seguridad para webhooks perdidos"""

    def test_missed_renewal_gets_backdated_overdue_clock(self):
        """Renewal vencida hace 2 días, sin webhook payment_failed recibido — el cron debe marcarla."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          ls_renews_at=timezone.now() - timedelta(days=2))
        call_command('expire_trials')
        user.refresh_from_db()
        self.assertIsNotNone(user.ls_payment_overdue_since)
        self.assertEqual(user.plan, 'premium')  # todavía dentro de los 3 días de gracia

    def test_backdated_clock_uses_actual_due_date_not_detection_time(self):
        """La fecha de 'vencido desde' debe ser la fecha real de renovación, no 'ahora'.
        Usa un vencimiento de 1 día (dentro del período de gracia) para poder verificar
        el campo antes de que el mismo cron lo baje a free."""
        due_date = timezone.now() - timedelta(days=1)
        user = _make_user(plan='premium', ls_subscription_id='sub_1', ls_renews_at=due_date)
        call_command('expire_trials')
        user.refresh_from_db()
        self.assertAlmostEqual(user.ls_payment_overdue_since, due_date, delta=timedelta(seconds=5))
        self.assertEqual(user.plan, 'premium')

    def test_overdue_more_than_3_days_downgrades_in_same_run(self):
        """Si ya estaba vencida hace 5 días (nunca detectada antes), baja a free en la misma corrida."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          ls_renews_at=timezone.now() - timedelta(days=5))
        call_command('expire_trials')
        user.refresh_from_db()
        self.assertEqual(user.plan, 'free')
        self.assertTrue(user.ls_payment_failed_downgrade)
        self.assertIsNone(user.ls_subscription_id)

    def test_overdue_under_3_days_stays_premium(self):
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          ls_payment_overdue_since=timezone.now() - timedelta(days=2))
        call_command('expire_trials')
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')

    def test_overdue_over_3_days_downgrades_to_free(self):
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          ls_payment_overdue_since=timezone.now() - timedelta(days=4))
        call_command('expire_trials')
        user.refresh_from_db()
        self.assertEqual(user.plan, 'free')
        self.assertTrue(user.ls_payment_failed_downgrade)

    def test_cancelled_subscriptions_not_touched_by_overdue_logic(self):
        """Las canceladas manualmente siguen su propio flujo (paso 2), no el de pago rechazado."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1', ls_cancelled=True,
                          ls_renews_at=timezone.now() - timedelta(days=10))
        call_command('expire_trials')
        user.refresh_from_db()
        self.assertEqual(user.plan, 'free')
        self.assertFalse(user.ls_payment_failed_downgrade)  # bajó por el flujo de cancelación, no de pago

    def test_permanent_premium_never_downgraded_by_overdue_logic(self):
        user = _make_user(plan='premium', is_permanent_premium=True, ls_subscription_id='sub_1',
                          ls_renews_at=timezone.now() - timedelta(days=10))
        call_command('expire_trials')
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')
        self.assertIsNone(user.ls_payment_overdue_since)

    def test_active_subscription_not_touched(self):
        """Suscripción al día (renews_at futuro) no debe marcarse como vencida."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          ls_renews_at=timezone.now() + timedelta(days=10))
        call_command('expire_trials')
        user.refresh_from_db()
        self.assertIsNone(user.ls_payment_overdue_since)
        self.assertEqual(user.plan, 'premium')

    def test_scenario_payment_fails_and_recovers_before_deadline(self):
        """Escenario completo: falla el pago → 1 día vencido → se recupera → sigue premium sin aviso."""
        user = _make_user(plan='premium', ls_subscription_id='sub_1',
                          ls_renews_at=timezone.now() - timedelta(days=1))
        call_command('expire_trials')
        user.refresh_from_db()
        self.assertIsNotNone(user.ls_payment_overdue_since)
        self.assertEqual(user.plan, 'premium')

        # El pago se recupera (subscription_payment_success)
        _activate_premium(user, _attrs(renews_at=(timezone.now() + timedelta(days=30)).isoformat()), ls_sub_id='sub_1')
        user.refresh_from_db()
        self.assertIsNone(user.ls_payment_overdue_since)
        self.assertFalse(user.ls_payment_failed_downgrade)

        # Corridas futuras del cron no deben tocarlo
        call_command('expire_trials')
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')


class WebhookEmailFallbackTest(TestCase):
    """Cuando el webhook de Lemon Squeezy no trae custom_data.user_id, cae al
    email del checkout — que debe matchear sin importar mayúsculas/minúsculas,
    o un webhook de pago real queda sin aplicarse (usuario pagó pero nunca se
    activa Premium)."""

    def _post_webhook(self, payload):
        body = json.dumps(payload).encode()
        with patch('apps.payment.views._verify_signature', return_value=True):
            return self.client.post(
                '/api/v1/payment/webhook/', data=body, content_type='application/json',
            )

    def test_subscription_created_matches_email_case_insensitively(self):
        user = _make_user(plan='free', email='Doctor@Example.com')
        payload = {
            'meta': {'event_name': 'subscription_created', 'webhook_id': 'wh_1', 'custom_data': {}},
            'data': {
                'type': 'subscriptions',
                'id': 'sub_case_1',
                'attributes': {
                    'customer_email': 'doctor@example.com',
                    'renews_at': (timezone.now() + timedelta(days=30)).isoformat(),
                },
            },
        }
        response = self._post_webhook(payload)
        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.plan, 'premium')
        self.assertEqual(user.ls_subscription_id, 'sub_case_1')
        self.assertIsNone(user.ls_payment_overdue_since)
