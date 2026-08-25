from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

APPLE_URL = '/api/auth/apple/'
FAKE_SUB = 'apple_sub_001'
FAKE_EMAIL = 'test@icloud.com'
FAKE_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6InRlc3QifQ.payload.sig'


def _mock_verify(sub=FAKE_SUB, email=FAKE_EMAIL):
    return patch(
        'apps.medio_auth.views.AppleLoginView._verify_apple_token',
        return_value=(sub, email),
    )


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def User(db):
    from django.contrib.auth import get_user_model
    return get_user_model()


# ──────────────────────────────────────────────
# INPUT VALIDATION
# ──────────────────────────────────────────────

@pytest.mark.django_db
def test_apple_login_missing_token_returns_400(client):
    resp = client.post(APPLE_URL, {}, format='json')
    assert resp.status_code == 400


@pytest.mark.django_db
def test_apple_login_invalid_token_returns_401(client):
    with patch(
        'apps.medio_auth.views.AppleLoginView._verify_apple_token',
        side_effect=Exception('bad sig'),
    ):
        resp = client.post(APPLE_URL, {'identity_token': FAKE_TOKEN}, format='json')
    assert resp.status_code == 401


# ──────────────────────────────────────────────
# NEW USER CREATION
# ──────────────────────────────────────────────

@pytest.mark.django_db
def test_apple_login_creates_new_user(client, User):
    with _mock_verify():
        resp = client.post(APPLE_URL, {
            'identity_token': FAKE_TOKEN,
            'given_name': 'Ana',
            'family_name': 'Gómez',
            'email': FAKE_EMAIL,
        }, format='json')

    assert resp.status_code == 201
    data = resp.json()
    assert 'tokens' in data
    assert data['tokens']['access']
    assert data['tokens']['refresh']
    assert data['user']['email'] == FAKE_EMAIL

    user = User.objects.get(email=FAKE_EMAIL)
    assert user.apple_user_id == FAKE_SUB
    assert user.first_name == 'Ana'
    assert user.is_email_verified is True


@pytest.mark.django_db
def test_apple_login_new_user_gets_premium_trial(client, User):
    with _mock_verify():
        client.post(APPLE_URL, {'identity_token': FAKE_TOKEN, 'email': FAKE_EMAIL}, format='json')

    user = User.objects.get(email=FAKE_EMAIL)
    assert user.plan == 'premium'
    assert user.had_trial is True


# ──────────────────────────────────────────────
# RETURNING USER (lookup by apple_user_id)
# ──────────────────────────────────────────────

@pytest.mark.django_db
def test_apple_login_existing_apple_user_returns_200(client, User):
    u = User.objects.create(
        email=FAKE_EMAIL,
        username='testuser',
        apple_user_id=FAKE_SUB,
        is_email_verified=True,
        plan='premium',
        had_trial=True,
    )
    u.set_unusable_password()
    u.save()

    with _mock_verify():
        resp = client.post(APPLE_URL, {'identity_token': FAKE_TOKEN}, format='json')

    assert resp.status_code == 200
    assert resp.json()['user']['email'] == FAKE_EMAIL
    assert User.objects.filter(apple_user_id=FAKE_SUB).count() == 1


@pytest.mark.django_db
def test_apple_login_returning_user_plan_unchanged(client, User):
    """Second login must not reset plan or create a second trial."""
    u = User.objects.create(
        email=FAKE_EMAIL,
        username='testuser',
        apple_user_id=FAKE_SUB,
        plan='free',
        had_trial=True,
    )
    u.set_unusable_password()
    u.save()

    with _mock_verify():
        client.post(APPLE_URL, {'identity_token': FAKE_TOKEN}, format='json')

    u.refresh_from_db()
    assert u.plan == 'free'


# ──────────────────────────────────────────────
# LINK APPLE TO EXISTING EMAIL ACCOUNT
# ──────────────────────────────────────────────

@pytest.mark.django_db
def test_apple_login_links_to_existing_email_account(client, User):
    existing = User.objects.create(
        email=FAKE_EMAIL,
        username='testuser_link',
        plan='free',
        is_email_verified=False,
    )
    existing.set_unusable_password()
    existing.save()

    with _mock_verify(sub=FAKE_SUB, email=FAKE_EMAIL):
        resp = client.post(APPLE_URL, {'identity_token': FAKE_TOKEN}, format='json')

    assert resp.status_code == 200
    existing.refresh_from_db()
    assert existing.apple_user_id == FAKE_SUB
    assert existing.is_email_verified is True
    assert User.objects.filter(email=FAKE_EMAIL).count() == 1


@pytest.mark.django_db
def test_apple_login_links_to_existing_email_account_case_insensitive(client, User):
    """A password account registered as Test@iCloud.com signing in with Apple
    (which may report different casing) must link to the same account, not
    create a duplicate that collides with the unique email constraint."""
    existing = User.objects.create(
        email='Test@iCloud.com',
        username='testuser_link_case',
        plan='free',
        is_email_verified=False,
    )
    existing.set_unusable_password()
    existing.save()

    with _mock_verify(sub=FAKE_SUB, email=FAKE_EMAIL):
        resp = client.post(APPLE_URL, {'identity_token': FAKE_TOKEN}, format='json')

    assert resp.status_code == 200
    existing.refresh_from_db()
    assert existing.apple_user_id == FAKE_SUB
    assert User.objects.filter(email__iexact=FAKE_EMAIL).count() == 1


# ──────────────────────────────────────────────
# PRIVATE RELAY EMAIL (Apple hides real email)
# ──────────────────────────────────────────────

@pytest.mark.django_db
def test_apple_login_private_relay_creates_user(client, User):
    """When Apple sends no email, a placeholder privaterelay email is used."""
    with _mock_verify(sub='private_sub_999', email=None):
        resp = client.post(APPLE_URL, {'identity_token': FAKE_TOKEN}, format='json')

    assert resp.status_code == 201
    user = User.objects.get(apple_user_id='private_sub_999')
    assert 'privaterelay.appleid.com' in user.email


# ──────────────────────────────────────────────
# INACTIVE / DELETED ACCOUNTS
# ──────────────────────────────────────────────

@pytest.mark.django_db
def test_apple_login_inactive_account_returns_403(client, User):
    u = User.objects.create(
        email=FAKE_EMAIL,
        username='inactive_doc',
        apple_user_id=FAKE_SUB,
        is_active=False,
    )
    u.set_unusable_password()
    u.save()

    with _mock_verify():
        resp = client.post(APPLE_URL, {'identity_token': FAKE_TOKEN}, format='json')

    assert resp.status_code == 403


# ──────────────────────────────────────────────
# TOKEN STRUCTURE
# ──────────────────────────────────────────────

@pytest.mark.django_db
def test_apple_login_response_has_access_and_refresh(client):
    with _mock_verify():
        resp = client.post(APPLE_URL, {
            'identity_token': FAKE_TOKEN,
            'email': FAKE_EMAIL,
        }, format='json')

    data = resp.json()
    assert 'access' in data['tokens']
    assert 'refresh' in data['tokens']
    assert len(data['tokens']['access']) > 20
    assert len(data['tokens']['refresh']) > 20


# ──────────────────────────────────────────────
# REFERRAL CODE — same rule as Google login: only credits the referrer when
# this Apple sign-in actually creates a new account (grant_credit=created).
# An existing account logging back in still connects as a colleague if a
# code is present, but is never charged as a "new referral".
# ──────────────────────────────────────────────

@pytest.mark.django_db
def test_apple_login_new_user_with_referral_connects_as_colleague(client, User):
    from apps.medio_auth.models import Friendship
    # colleague_name in the response is the REFERRER's display name (for the
    # "you're now colleagues with X" toast) — not the name of the person who
    # just registered — hence setting it here explicitly.
    referrer = User.objects.create_user(
        username='a_ref1', email='a_ref1@example.com',
        first_name='Colega', last_name='Referidor',
    )

    with _mock_verify(sub='apple_sub_new1', email='a_new1@example.com'):
        resp = client.post(APPLE_URL, {
            'identity_token': FAKE_TOKEN,
            'given_name': 'Nombre',
            'family_name': 'Apellido',
            'email': 'a_new1@example.com',
            'referral_code': referrer.friend_code,
        }, format='json')

    assert resp.status_code == 201  # new account
    assert resp.json()['colleague_name'] == 'Colega Referidor'
    new_user = User.objects.get(email='a_new1@example.com')
    assert (
        Friendship.objects.filter(user=referrer, friend=new_user).exists()
        or Friendship.objects.filter(user=new_user, friend=referrer).exists()
    )


@pytest.mark.django_db
def test_apple_login_new_user_grants_credit_at_referral_threshold_during_promo(client, User):
    """Con FREE_FOR_ALL_PREMIUM activo, todos ya tienen Premium gratis — el premio
    se banca en credit_days para aplicarse cuando la promo termine."""
    from apps.medico.models.site_setting import SiteSetting
    SiteSetting.set('FREE_FOR_ALL_PREMIUM', '1')
    referrer = User.objects.create_user(username='a_ref2', email='a_ref2@example.com')
    for i in range(2):
        other = User.objects.create_user(username=f'a_prev{i}', email=f'a_prev{i}@example.com')
        other.referred_by = referrer
        other.save(update_fields=['referred_by'])

    with _mock_verify(sub='apple_sub_new2', email='a_new2@example.com'):
        client.post(APPLE_URL, {
            'identity_token': FAKE_TOKEN,
            'email': 'a_new2@example.com',
            'referral_code': referrer.friend_code,
        }, format='json')

    referrer.refresh_from_db()
    assert referrer.credit_days == 10  # 3rd active referral hits the threshold
    assert referrer.trial_ends_at is None  # todavía no se aplicó — queda bancado


@pytest.mark.django_db
def test_apple_login_new_user_grants_credit_immediately_without_promo(client, User):
    """Sin la promo activa, nada consume credit_days más adelante — el premio se
    aplica de una a trial_ends_at, no queda atrapado en un contador."""
    referrer = User.objects.create_user(username='a_ref2b', email='a_ref2b@example.com', plan='free')
    for i in range(2):
        other = User.objects.create_user(username=f'a_prev2_{i}', email=f'a_prev2_{i}@example.com')
        other.referred_by = referrer
        other.save(update_fields=['referred_by'])

    with _mock_verify(sub='apple_sub_new2b', email='a_new2b@example.com'):
        client.post(APPLE_URL, {
            'identity_token': FAKE_TOKEN,
            'email': 'a_new2b@example.com',
            'referral_code': referrer.friend_code,
        }, format='json')

    referrer.refresh_from_db()
    assert referrer.credit_days == 0  # no se banca, se aplica directo
    assert referrer.trial_ends_at is not None
    assert referrer.plan == 'premium'


@pytest.mark.django_db
def test_apple_login_existing_user_does_not_grant_credit(client, User):
    referrer = User.objects.create_user(username='a_ref3', email='a_ref3@example.com')
    User.objects.create(
        email='a_already@example.com',
        username='a_already',
        apple_user_id='apple_sub_already',
    )

    with _mock_verify(sub='apple_sub_already', email='a_already@example.com'):
        resp = client.post(APPLE_URL, {
            'identity_token': FAKE_TOKEN,
            'email': 'a_already@example.com',
            'referral_code': referrer.friend_code,
        }, format='json')

    assert resp.status_code == 200  # existing account, just logged in
    referrer.refresh_from_db()
    assert referrer.credit_days == 0
