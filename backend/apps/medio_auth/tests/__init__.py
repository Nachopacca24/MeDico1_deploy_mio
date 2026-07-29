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
