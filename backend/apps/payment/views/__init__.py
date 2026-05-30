# apps/payment/views/__init__.py

import hashlib
import hmac
import json
import logging
import os

import requests
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)
User = get_user_model()

LS_API_KEY        = os.environ.get('LEMONSQUEEZY_API_KEY', '')
LS_WEBHOOK_SECRET = os.environ.get('LEMONSQUEEZY_WEBHOOK_SECRET', '')
LS_VARIANT_ID     = os.environ.get('LEMONSQUEEZY_VARIANT_ID', '1725636')
LS_API_BASE       = 'https://api.lemonsqueezy.com/v1'

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://medico1deploymio.vercel.app')


# ── Checkout ──────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout(request):
    """Create a Lemon Squeezy checkout URL for the authenticated user."""
    user = request.user

    payload = {
        'data': {
            'type': 'checkouts',
            'attributes': {
                'checkout_data': {
                    'email': user.email,
                    'custom': {'user_id': str(user.id)},
                },
                'product_options': {
                    'redirect_url': f'{FRONTEND_URL}/settings?upgraded=1',
                },
            },
            'relationships': {
                'store': {'data': {'type': 'stores', 'id': os.environ.get('LEMONSQUEEZY_STORE_ID', '')}},
                'variant': {'data': {'type': 'variants', 'id': LS_VARIANT_ID}},
            },
        }
    }

    try:
        resp = requests.post(
            f'{LS_API_BASE}/checkouts',
            json=payload,
            headers={
                'Authorization': f'Bearer {LS_API_KEY}',
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
            },
            timeout=10,
        )
        resp.raise_for_status()
        checkout_url = resp.json()['data']['attributes']['url']
        return Response({'url': checkout_url})
    except Exception as e:
        logger.error('Lemon Squeezy checkout error: %s', e)
        return Response({'error': 'No se pudo crear el checkout'}, status=status.HTTP_502_BAD_GATEWAY)


# ── Webhook ───────────────────────────────────────────────────────────────────

def _verify_signature(body: bytes, signature: str) -> bool:
    if not LS_WEBHOOK_SECRET:
        return True  # skip verification in local dev without secret
    expected = hmac.new(
        LS_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature or '')


@api_view(['POST'])
@permission_classes([AllowAny])
def lemonsqueezy_webhook(request):
    """Handle Lemon Squeezy webhook events."""
    body      = request.body
    signature = request.headers.get('X-Signature', '')

    if not _verify_signature(body, signature):
        logger.warning('Invalid LS webhook signature')
        return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data       = json.loads(body)
        event_name = data.get('meta', {}).get('event_name', '')
        attrs      = data.get('data', {}).get('attributes', {})
        custom     = data.get('meta', {}).get('custom_data', {})

        user_id = custom.get('user_id')
        if not user_id:
            # Fallback: match by email
            email = attrs.get('user_email') or attrs.get('customer_email', '')
            user  = User.objects.filter(email=email).first() if email else None
        else:
            user = User.objects.filter(id=user_id).first()

        if not user:
            logger.warning('LS webhook: user not found for event %s', event_name)
            return Response({'ok': True})  # still 200 so LS doesn't retry

        logger.info('LS webhook event=%s user=%s', event_name, user.id)

        if event_name in ('subscription_created', 'subscription_payment_success', 'subscription_resumed'):
            _activate_premium(user, attrs)

        elif event_name in ('subscription_cancelled', 'subscription_expired', 'subscription_payment_failed'):
            _deactivate_premium(user)

        elif event_name == 'subscription_updated':
            sub_status = attrs.get('status', '')
            if sub_status == 'active':
                _activate_premium(user, attrs)
            elif sub_status in ('cancelled', 'expired', 'past_due'):
                _deactivate_premium(user)

        return Response({'ok': True})

    except Exception as e:
        logger.error('LS webhook processing error: %s', e)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _activate_premium(user, attrs: dict):
    user.plan = 'premium'
    user.is_permanent_premium = False  # LS-managed, not admin-granted
    # Store LS subscription ID for future reference
    ls_id = attrs.get('first_subscription_item', {}) or {}
    update_fields = ['plan', 'is_permanent_premium', 'updated_at']
    user.save(update_fields=update_fields)
    logger.info('Activated premium for user %s', user.id)


def _deactivate_premium(user):
    if user.is_permanent_premium:
        return  # admin-granted permanent premium — never touch it
    user.plan = 'free'
    user.save(update_fields=['plan', 'updated_at'])
    logger.info('Deactivated premium for user %s', user.id)
