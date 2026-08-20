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
