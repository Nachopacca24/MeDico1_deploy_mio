from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class EmailCaseInsensitivityTest(TestCase):
    """
    An email typed/stored with different capitalization must never lock a user
    out of login or password recovery. Postgres string equality is
    case-sensitive, so every lookup either needs __iexact or the stored value
    needs to always be lowercase (both are done: CustomUser.save() normalizes
    on write, and lookups use __iexact as a second layer for rows that predate
    that normalization).
    """

    def test_register_stores_email_lowercase(self):
        client = APIClient()
        response = client.post('/api/auth/register/', {
            'username': 'mixedcase',
            'email': 'MixedCase@Example.COM',
            'password': 'ContraseñaSegura123',
            'password2': 'ContraseñaSegura123',
            'first_name': 'Mixed',
            'last_name': 'Case',
            'specialty': 'Cardiovascular',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(username='mixedcase')
        self.assertEqual(user.email, 'mixedcase@example.com')

    def test_cannot_register_duplicate_email_with_different_case(self):
        User.objects.create_user(
            username='original', email='taken@example.com', password='x', is_email_verified=True,
        )
        client = APIClient()
        response = client.post('/api/auth/register/', {
            'username': 'newperson',
            'email': 'Taken@Example.com',
            'password': 'ContraseñaSegura123',
            'password2': 'ContraseñaSegura123',
            'first_name': 'New',
            'last_name': 'Person',
            'specialty': 'Cardiovascular',
        }, format='json')

        self.assertEqual(response.status_code, 400)

    def test_login_works_regardless_of_email_case(self):
        User.objects.create_user(
            username='loginuser', email='Login.User@Example.com', password='ContraseñaSegura123',
            is_email_verified=True,
        )
        client = APIClient()
        response = client.post('/api/auth/login/', {
            'email': 'login.user@EXAMPLE.com',
            'password': 'ContraseñaSegura123',
        }, format='json')

        self.assertEqual(response.status_code, 200, response.data)

    def test_email_backend_authenticates_case_insensitively(self):
        from apps.medio_auth.backends import EmailBackend
        User.objects.create_user(
            username='backenduser', email='Backend.User@Example.com', password='ContraseñaSegura123',
        )
        backend = EmailBackend()
        user = backend.authenticate(request=None, email='BACKEND.USER@example.com', password='ContraseñaSegura123')
        self.assertIsNotNone(user)
        self.assertEqual(user.username, 'backenduser')

    def test_forgot_password_finds_user_with_different_case(self):
        user = User.objects.create_user(
            username='forgetful', email='Forgetful@Example.com', password='ContraseñaSegura123',
            is_email_verified=True,
        )
        self.assertIsNone(user.password_reset_token)

        client = APIClient()
        response = client.post('/api/auth/forgot-password/', {
            'email': 'forgetful@example.com',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertIsNotNone(user.password_reset_token)

    def test_resend_verification_finds_user_with_different_case(self):
        user = User.objects.create_user(
            username='unverified', email='Unverified@Example.com', password='ContraseñaSegura123',
            is_email_verified=False,
        )
        self.assertIsNone(user.email_verification_token)

        client = APIClient()
        response = client.post('/api/auth/send-verification/', {
            'email': 'unverified@example.com',
        }, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        user.refresh_from_db()
        self.assertIsNotNone(user.email_verification_token)

    def test_reactivation_on_register_matches_email_case_insensitively(self):
        """A user who deactivated their account and comes back to re-register
        with a differently-cased email must hit the reactivation path (keep
        their history, referral graph, friend_code) instead of silently
        falling through to a brand-new-account creation."""
        inactive = User.objects.create_user(
            username='comeback', email='Comeback@Example.com', password='OldPass123',
            is_active=False, had_trial=True,
        )
        client = APIClient()
        response = client.post('/api/auth/register/', {
            'username': 'comeback_new',
            'email': 'comeback@example.com',
            'password': 'ContraseñaSegura123',
            'password2': 'ContraseñaSegura123',
            'first_name': 'Vuelvo',
            'last_name': 'Otra Vez',
            'specialty': 'Cardiovascular',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['message'], 'Cuenta reactivada. Comenzás con el plan gratuito.')
        inactive.refresh_from_db()
        self.assertTrue(inactive.is_active)
        self.assertEqual(User.objects.filter(email__iexact='comeback@example.com').count(), 1)

    def test_google_login_links_existing_account_regardless_of_email_case(self):
        """A password account registered as Mixed@Case.com signing in with
        Google (which reports a different case for the same address) must
        link to the SAME account — not silently create a duplicate that then
        collides with the unique email constraint on save()."""
        from unittest.mock import patch
        from django.test import override_settings

        existing = User.objects.create_user(
            username='googleuser', email='Mixed@Case.com', password='ContraseñaSegura123',
        )
        fake_idinfo = {
            'iss': 'accounts.google.com',
            'aud': 'test-client-id',
            'email': 'mixed@case.com',
            'given_name': 'Nombre',
            'family_name': 'Apellido',
        }
        client = APIClient()
        with override_settings(GOOGLE_OAUTH_CLIENT_IDS=['test-client-id']), \
             patch('apps.medio_auth.views.id_token.verify_oauth2_token', return_value=fake_idinfo):
            response = client.post('/api/auth/google/', {'token': 'fake-token'}, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['user']['id'], existing.id)
        self.assertEqual(User.objects.filter(email__iexact='mixed@case.com').count(), 1)


class SendVerificationEmailEnumerationTest(TestCase):
    """POST /api/auth/send-verification/ must respond identically regardless
    of whether the email is registered, already verified, or was just used —
    otherwise the response itself lets an attacker enumerate which doctor/
    anesthesiologist emails exist in the app (a real phishing setup risk)."""

    def _post(self, email):
        client = APIClient()
        return client.post('/api/auth/send-verification/', {'email': email}, format='json')

    def test_unknown_and_known_unverified_email_get_the_same_response(self):
        User.objects.create_user(
            username='unverified_enum', email='unverified_enum@example.com',
            password='x', is_email_verified=False,
        )
        known = self._post('unverified_enum@example.com')
        unknown = self._post('definitely_not_registered@example.com')

        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.data, unknown.data)

    def test_already_verified_email_gets_the_same_response(self):
        User.objects.create_user(
            username='verified_enum', email='verified_enum@example.com',
            password='x', is_email_verified=True,
        )
        verified = self._post('verified_enum@example.com')
        unknown = self._post('also_not_registered@example.com')

        self.assertEqual(verified.status_code, unknown.status_code)
        self.assertEqual(verified.data, unknown.data)

    def test_recently_sent_email_does_not_return_429(self):
        from django.utils import timezone
        user = User.objects.create_user(
            username='recent_enum', email='recent_enum@example.com',
            password='x', is_email_verified=False,
        )
        user.email_verification_sent_at = timezone.now()
        user.save(update_fields=['email_verification_sent_at'])

        response = self._post('recent_enum@example.com')

        self.assertEqual(response.status_code, 200)


class RefreshTokenRotationTest(TestCase):
    """POST /api/auth/refresh/ must actually rotate — the old refresh token
    becomes single-use (blacklisted) and a new one is issued — matching what
    SIMPLE_JWT's ROTATE_REFRESH_TOKENS/BLACKLIST_AFTER_ROTATION already claim
    to do. Without this, a stolen refresh token stays valid and reusable for
    its full 7-day lifetime instead of being invalidated after one use."""

    def test_refresh_response_includes_a_new_rotated_refresh_token(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        user = User.objects.create_user(username='rot_user', email='rot_user@example.com', password='x')
        original = str(RefreshToken.for_user(user))

        client = APIClient()
        response = client.post('/api/auth/refresh/', {'refresh': original}, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn('refresh', response.data)
        self.assertNotEqual(response.data['refresh'], original)

    def test_used_refresh_token_cannot_be_reused(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        user = User.objects.create_user(username='rot_user2', email='rot_user2@example.com', password='x')
        original = str(RefreshToken.for_user(user))

        client = APIClient()
        first = client.post('/api/auth/refresh/', {'refresh': original}, format='json')
        self.assertEqual(first.status_code, 200, first.data)

        second = client.post('/api/auth/refresh/', {'refresh': original}, format='json')
        self.assertEqual(second.status_code, 401)

    def test_new_rotated_refresh_token_works(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        user = User.objects.create_user(username='rot_user3', email='rot_user3@example.com', password='x')
        original = str(RefreshToken.for_user(user))

        client = APIClient()
        first = client.post('/api/auth/refresh/', {'refresh': original}, format='json')
        new_refresh = first.data['refresh']

        second = client.post('/api/auth/refresh/', {'refresh': new_refresh}, format='json')

        self.assertEqual(second.status_code, 200, second.data)
        self.assertIn('access', second.data)


class GoogleLoginReferralTest(TestCase):
    """POST /api/auth/google/ — a referral_code must only ever *credit* the
    referrer when this Google sign-in genuinely creates a new account
    (grant_credit=created in the view). An existing account just logging
    back in via Google must still connect as a colleague if a code is
    present (matches accept_invite / email-login's processPendingInvite
    behavior) but must never trigger a "new referral" credit — this is what
    makes it safe for the frontend to always send whatever referral code it
    has, on both the login and signup pages, without needing to know in
    advance whether the account already exists."""

    def _google_post(self, email, referral_code=None, given_name='Nombre', family_name='Apellido'):
        from unittest.mock import patch
        from django.test import override_settings
        fake_idinfo = {
            'iss': 'accounts.google.com',
            'aud': 'test-client-id',
            'email': email,
            'given_name': given_name,
            'family_name': family_name,
        }
        payload = {'token': 'fake-token'}
        if referral_code:
            payload['referral_code'] = referral_code
        client = APIClient()
        with override_settings(GOOGLE_OAUTH_CLIENT_IDS=['test-client-id']), \
             patch('apps.medio_auth.views.id_token.verify_oauth2_token', return_value=fake_idinfo):
            return client.post('/api/auth/google/', payload, format='json')

    def test_new_account_via_google_connects_as_colleague(self):
        from apps.medio_auth.models import Friendship
        # colleague_name in the response is the REFERRER's display name (used
        # for the "you're now colleagues with X" toast) — not the name of the
        # person who just registered — hence setting it here explicitly.
        referrer = User.objects.create_user(
            username='g_ref1', email='g_ref1@example.com',
            first_name='Colega', last_name='Referidor',
        )

        response = self._google_post('g_new1@example.com', referral_code=referrer.friend_code)

        self.assertEqual(response.status_code, 201, response.data)  # 201 = new account
        self.assertEqual(response.data['colleague_name'], 'Colega Referidor')
        new_user = User.objects.get(email='g_new1@example.com')
        self.assertTrue(
            Friendship.objects.filter(user=referrer, friend=new_user).exists()
            or Friendship.objects.filter(user=new_user, friend=referrer).exists()
        )

    def test_new_account_via_google_grants_credit_at_referral_threshold_during_promo(self):
        """Con FREE_FOR_ALL_PREMIUM activo, todos ya tienen Premium gratis — el premio
        se banca en credit_days para aplicarse cuando la promo termine."""
        from apps.medico.models.site_setting import SiteSetting
        SiteSetting.set('FREE_FOR_ALL_PREMIUM', '1')
        referrer = User.objects.create_user(username='g_ref2', email='g_ref2@example.com')
        for i in range(2):
            other = User.objects.create_user(username=f'g_prev{i}', email=f'g_prev{i}@example.com')
            other.referred_by = referrer
            other.save(update_fields=['referred_by'])

        self._google_post('g_new2@example.com', referral_code=referrer.friend_code)

        referrer.refresh_from_db()
        self.assertEqual(referrer.credit_days, 10)  # 3rd active referral hits the threshold
        self.assertIsNone(referrer.trial_ends_at)  # todavía no se aplicó — queda bancado

    def test_new_account_via_google_grants_credit_immediately_without_promo(self):
        """Sin la promo activa, nada consume credit_days más adelante — el premio se
        aplica de una a trial_ends_at, no queda atrapado en un contador."""
        referrer = User.objects.create_user(
            username='g_ref2b', email='g_ref2b@example.com', plan='free',
        )
        for i in range(2):
            other = User.objects.create_user(username=f'g_prev2_{i}', email=f'g_prev2_{i}@example.com')
            other.referred_by = referrer
            other.save(update_fields=['referred_by'])

        self._google_post('g_new2b@example.com', referral_code=referrer.friend_code)

        referrer.refresh_from_db()
        self.assertEqual(referrer.credit_days, 0)  # no se banca, se aplica directo
        self.assertIsNotNone(referrer.trial_ends_at)
        self.assertEqual(referrer.plan, 'premium')

    def test_existing_account_login_via_google_does_not_grant_credit(self):
        referrer = User.objects.create_user(username='g_ref3', email='g_ref3@example.com')
        User.objects.create_user(username='g_already', email='g_already@example.com')

        response = self._google_post('g_already@example.com', referral_code=referrer.friend_code)

        self.assertEqual(response.status_code, 200, response.data)  # 200 = existing account, just logged in
        referrer.refresh_from_db()
        self.assertEqual(referrer.credit_days, 0)
