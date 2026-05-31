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

LS_API_BASE = 'https://api.lemonsqueezy.com/v1'
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://medico1deploymio.vercel.app')

_LS_API_KEY        = os.environ.get('LEMONSQUEEZY_API_KEY', '')
_LS_WEBHOOK_SECRET = os.environ.get('LEMONSQUEEZY_WEBHOOK_SECRET', '')
_LS_VARIANT_ID     = os.environ.get('LEMONSQUEEZY_VARIANT_ID', '1725636')
_LS_STORE_ID       = os.environ.get('LEMONSQUEEZY_STORE_ID', '')

logger.warning(
    '[LS] env check — API_KEY=%s WEBHOOK_SECRET=%s STORE_ID=%s VARIANT_ID=%s FRONTEND_URL=%s',
    'SET' if _LS_API_KEY else 'MISSING',
    'SET' if _LS_WEBHOOK_SECRET else 'MISSING',
    _LS_STORE_ID or 'MISSING',
    _LS_VARIANT_ID or 'MISSING',
    FRONTEND_URL,
)


def _ls_headers():
    api_key = os.environ.get('LEMONSQUEEZY_API_KEY', _LS_API_KEY)
    return {
        'Authorization': f'Bearer {api_key}',
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
    }


# ── Checkout ──────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout(request):
    api_key    = os.environ.get('LEMONSQUEEZY_API_KEY', _LS_API_KEY)
    store_id   = os.environ.get('LEMONSQUEEZY_STORE_ID', _LS_STORE_ID)
    variant_id = os.environ.get('LEMONSQUEEZY_VARIANT_ID', _LS_VARIANT_ID)
    user = request.user

    logger.info(
        '[LS checkout] user=%s api_key=%s store_id=%s variant_id=%s',
        user.id, 'SET' if api_key else 'MISSING', store_id or 'MISSING', variant_id,
    )

    if not api_key:
        logger.error('[LS checkout] LEMONSQUEEZY_API_KEY not set')
        return Response({'error': 'Configuración de pagos incompleta'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if not store_id:
        logger.error('[LS checkout] LEMONSQUEEZY_STORE_ID not set')
        return Response({'error': 'Configuración de pagos incompleta'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

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
                'store':   {'data': {'type': 'stores',   'id': store_id}},
                'variant': {'data': {'type': 'variants', 'id': variant_id}},
            },
        }
    }

    try:
        resp = requests.post(
            f'{LS_API_BASE}/checkouts',
            json=payload,
            headers=_ls_headers(),
            timeout=10,
        )
        logger.info('[LS checkout] LS response status=%s', resp.status_code)
        if not resp.ok:
            logger.error('[LS checkout] LS error body=%s', resp.text)
        resp.raise_for_status()
        checkout_url = resp.json()['data']['attributes']['url']
        logger.info('[LS checkout] checkout_url created for user=%s', user.id)
        return Response({'url': checkout_url})
    except requests.HTTPError as e:
        logger.error('[LS checkout] HTTPError status=%s body=%s', e.response.status_code, e.response.text)
        return Response({'error': 'No se pudo crear el checkout'}, status=status.HTTP_502_BAD_GATEWAY)
    except Exception as e:
        logger.error('[LS checkout] unexpected error: %s', e, exc_info=True)
        return Response({'error': 'No se pudo crear el checkout'}, status=status.HTTP_502_BAD_GATEWAY)


# ── Cancel subscription ────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    user = request.user

    if user.plan != 'premium' or user.is_permanent_premium:
        return Response({'error': 'No hay suscripción activa para cancelar'}, status=status.HTTP_400_BAD_REQUEST)

    sub_id = user.ls_subscription_id
    if not sub_id:
        logger.error('[LS cancel] user=%s has no ls_subscription_id stored', user.id)
        return Response({'error': 'No se encontró el ID de suscripción. Contactá soporte.'}, status=status.HTTP_400_BAD_REQUEST)

    logger.info('[LS cancel] user=%s cancelling subscription=%s', user.id, sub_id)

    try:
        resp = requests.delete(
            f'{LS_API_BASE}/subscriptions/{sub_id}',
            headers=_ls_headers(),
            timeout=10,
        )
        logger.info('[LS cancel] LS response status=%s', resp.status_code)
        if not resp.ok:
            logger.error('[LS cancel] LS error body=%s', resp.text)
        resp.raise_for_status()
        # LS will send subscription_cancelled webhook which triggers _deactivate_premium
        logger.info('[LS cancel] subscription cancelled for user=%s — awaiting webhook', user.id)
        return Response({'ok': True, 'message': 'Suscripción cancelada. Se mantendrá activa hasta el fin del período.'})
    except requests.HTTPError as e:
        logger.error('[LS cancel] HTTPError status=%s body=%s', e.response.status_code, e.response.text)
        return Response({'error': 'No se pudo cancelar la suscripción'}, status=status.HTTP_502_BAD_GATEWAY)
    except Exception as e:
        logger.error('[LS cancel] unexpected error: %s', e, exc_info=True)
        return Response({'error': 'No se pudo cancelar la suscripción'}, status=status.HTTP_502_BAD_GATEWAY)


# ── Webhook ───────────────────────────────────────────────────────────────────

def _verify_signature(body: bytes, signature: str) -> bool:
    secret = os.environ.get('LEMONSQUEEZY_WEBHOOK_SECRET', _LS_WEBHOOK_SECRET)
    if not secret:
        logger.warning('[LS webhook] LEMONSQUEEZY_WEBHOOK_SECRET not set — skipping signature check')
        return True
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    match = hmac.compare_digest(expected, signature or '')
    if not match:
        logger.error('[LS webhook] signature mismatch — expected=%s received=%s', expected[:16] + '...', (signature or '')[:16] + '...')
    return match


@api_view(['POST'])
@permission_classes([AllowAny])
def lemonsqueezy_webhook(request):
    body      = request.body
    signature = request.headers.get('X-Signature', '')

    logger.info('[LS webhook] received — size=%d signature_present=%s', len(body), bool(signature))

    if not _verify_signature(body, signature):
        return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data       = json.loads(body)
        event_name = data.get('meta', {}).get('event_name', '')
        obj        = data.get('data', {})
        attrs      = obj.get('attributes', {})
        custom     = data.get('meta', {}).get('custom_data', {})
        # For subscription events, data.id IS the subscription ID
        ls_sub_id  = obj.get('id') or str(attrs.get('subscription_id', '')) or None

        logger.info('[LS webhook] event=%s custom_data=%s sub_id=%s', event_name, custom, ls_sub_id)

        user_id = custom.get('user_id')
        if not user_id:
            email = attrs.get('user_email') or attrs.get('customer_email', '')
            logger.info('[LS webhook] no user_id in custom_data, trying email=%s', email)
            user  = User.objects.filter(email=email).first() if email else None
        else:
            user = User.objects.filter(id=user_id).first()
            logger.info('[LS webhook] lookup user_id=%s found=%s', user_id, bool(user))

        if not user:
            logger.warning('[LS webhook] user not found for event=%s user_id=%s', event_name, user_id)
            return Response({'ok': True})

        logger.info('[LS webhook] processing event=%s for user=%s (plan=%s)', event_name, user.id, user.plan)

        if event_name in ('subscription_created', 'subscription_payment_success', 'subscription_resumed'):
            _activate_premium(user, attrs, ls_sub_id)

        elif event_name in ('subscription_cancelled', 'subscription_expired', 'subscription_payment_failed'):
            _deactivate_premium(user)

        elif event_name == 'subscription_updated':
            sub_status = attrs.get('status', '')
            logger.info('[LS webhook] subscription_updated sub_status=%s', sub_status)
            if sub_status == 'active':
                _activate_premium(user, attrs, ls_sub_id)
            elif sub_status in ('cancelled', 'expired', 'past_due'):
                _deactivate_premium(user)

        return Response({'ok': True})

    except Exception as e:
        logger.error('[LS webhook] processing error: %s', e, exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _activate_premium(user, attrs: dict, ls_sub_id: str = None):
    user.plan = 'premium'
    user.is_permanent_premium = False
    update_fields = ['plan', 'is_permanent_premium', 'updated_at']
    if ls_sub_id:
        user.ls_subscription_id = str(ls_sub_id)
        update_fields.append('ls_subscription_id')
        logger.info('[LS] stored subscription_id=%s for user=%s', ls_sub_id, user.id)
    user.save(update_fields=update_fields)
    logger.info('[LS] activated premium for user=%s', user.id)


def _deactivate_premium(user):
    if user.is_permanent_premium:
        logger.info('[LS] user=%s has permanent premium — skipping deactivation', user.id)
        return
    user.plan = 'free'
    user.save(update_fields=['plan', 'updated_at'])
    logger.info('[LS] deactivated premium for user=%s — free plan restrictions now apply (max 5 active surgeries)', user.id)


def _log_over_limit_warning(user):
    from apps.medico.models import SurgicalCase
    active = SurgicalCase.objects.filter(
        created_by=user,
        archived_at__isnull=True,
        is_paid=False,
    ).count()
    if active > 5:
        logger.warning(
            '[LS] user=%s downgraded to free but has %d active surgeries (limit=5) — account is over-limit',
            user.id, active,
        )
