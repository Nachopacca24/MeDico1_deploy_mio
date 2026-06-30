# apps/payment/views/__init__.py

import hashlib
import hmac
import json
import logging
import os

import requests
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)
User = get_user_model()

LS_API_BASE = 'https://api.lemonsqueezy.com/v1'
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://medico1deploymio.vercel.app')

_LS_API_KEY             = os.environ.get('LEMONSQUEEZY_API_KEY', '')
_LS_WEBHOOK_SECRET      = os.environ.get('LEMONSQUEEZY_WEBHOOK_SECRET', '')
_LS_VARIANT_ID          = os.environ.get('LEMONSQUEEZY_VARIANT_ID', '1725636')
_LS_ANNUAL_VARIANT_ID   = os.environ.get('LEMONSQUEEZY_ANNUAL_VARIANT_ID', '')
_LS_STORE_ID            = os.environ.get('LEMONSQUEEZY_STORE_ID', '')

logger.warning(
    '[LS] env check — API_KEY=%s WEBHOOK_SECRET=%s STORE_ID=%s VARIANT_ID=%s ANNUAL_VARIANT_ID=%s FRONTEND_URL=%s',
    'SET' if _LS_API_KEY else 'MISSING',
    'SET' if _LS_WEBHOOK_SECRET else 'MISSING',
    _LS_STORE_ID or 'MISSING',
    _LS_VARIANT_ID or 'MISSING',
    _LS_ANNUAL_VARIANT_ID or 'MISSING',
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
    user = request.user

    plan_type = request.data.get('plan_type', 'monthly')
    if plan_type == 'annual':
        variant_id = os.environ.get('LEMONSQUEEZY_ANNUAL_VARIANT_ID', _LS_ANNUAL_VARIANT_ID)
        if not variant_id:
            return Response({'error': 'Plan anual no configurado'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    else:
        variant_id = os.environ.get('LEMONSQUEEZY_VARIANT_ID', _LS_VARIANT_ID)

    logger.info(
        '[LS checkout] user=%s plan_type=%s api_key=%s store_id=%s variant_id=%s',
        user.id, plan_type, 'SET' if api_key else 'MISSING', store_id or 'MISSING', variant_id,
    )

    if not api_key:
        logger.error('[LS checkout] LEMONSQUEEZY_API_KEY not set')
        return Response({'error': 'Configuración de pagos incompleta'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if not store_id:
        logger.error('[LS checkout] LEMONSQUEEZY_STORE_ID not set')
        return Response({'error': 'Configuración de pagos incompleta'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # Block if already has an active non-cancelled paid subscription
    if user.plan == 'premium' and user.ls_subscription_id and not user.ls_cancelled:
        logger.warning('[LS checkout] user=%s already has active subscription=%s', user.id, user.ls_subscription_id)
        return Response({'error': 'Ya tenés una suscripción Premium activa.'}, status=status.HTTP_400_BAD_REQUEST)

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


# ── Shared helper ─────────────────────────────────────────────────────────────

def cancel_ls_subscription_for_user(user) -> bool:
    """
    Cancela la suscripción de Lemon Squeezy del usuario si tiene una activa.
    Devuelve True si no había suscripción activa o se canceló correctamente.
    Devuelve False si hubo un error al cancelar (nunca lanza excepción).
    Llamar antes de desactivar/eliminar la cuenta.
    """
    if (not user.ls_subscription_id
            or user.ls_cancelled
            or user.plan != 'premium'
            or user.is_permanent_premium):
        return True  # Nada que cancelar

    sub_id = user.ls_subscription_id
    logger.info('[LS cancel-on-delete] user=%s cancelling subscription=%s', user.id, sub_id)
    try:
        resp = requests.delete(
            f'{LS_API_BASE}/subscriptions/{sub_id}',
            headers=_ls_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        logger.info('[LS cancel-on-delete] subscription=%s cancelled for user=%s', sub_id, user.id)
        return True
    except Exception as e:
        logger.error('[LS cancel-on-delete] failed for user=%s sub=%s: %s', user.id, sub_id, e)
        return False


# ── Cancel subscription ────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    user = request.user

    # Idempotent: already cancelled
    if user.ls_cancelled:
        return Response({'ok': True, 'message': 'La suscripción ya estaba cancelada.'})

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
        # Mark as cancelled optimistically so frontend reflects it immediately.
        # The webhook (subscription_cancelled) will later add ls_renews_at (end date).
        User.objects.filter(pk=user.pk).update(ls_cancelled=True)
        logger.info('[LS cancel] subscription cancelled for user=%s — marked ls_cancelled optimistically', user.id)
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
        # [SECURITY] Reject all webhooks if secret is not configured — never skip in production
        logger.critical('[LS webhook] LEMONSQUEEZY_WEBHOOK_SECRET not set — rejecting webhook')
        return False
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

        # [SECURITY] Replay attack protection — deduplicate by webhook_id
        webhook_id = data.get('meta', {}).get('webhook_id', '')
        if webhook_id:
            cache_key = f'ls_webhook:{webhook_id}'
            if cache.get(cache_key):
                logger.warning('[LS webhook] duplicate webhook_id=%s ignored', webhook_id)
                return Response({'ok': True})
            cache.set(cache_key, True, 86400)  # 24h TTL
        obj        = data.get('data', {})
        attrs      = obj.get('attributes', {})
        custom     = data.get('meta', {}).get('custom_data', {})
        # data.id is the subscription ID only when data.type == 'subscriptions'
        # For subscription-invoices events, attrs.subscription_id has the real sub ID
        obj_type  = obj.get('type', '')
        if obj_type == 'subscriptions':
            ls_sub_id = obj.get('id') or None
        else:
            ls_sub_id = str(attrs.get('subscription_id', '')) or None

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

        if event_name in ('subscription_created', 'subscription_resumed'):
            # Fresh activation or explicit resume — full activation, clear cancelled flag
            _activate_premium(user, attrs, ls_sub_id)

        elif event_name == 'subscription_payment_success':
            # Payment received — but if user already cancelled, DO NOT override that status.
            # LS can deliver payment_success after subscription_cancelled (out-of-order webhooks).
            if user.ls_cancelled:
                # Keep cancelled; just refresh renews_at in case it changed
                renews_at = _parse_ls_date(attrs.get('renews_at'))
                if renews_at:
                    user.ls_renews_at = renews_at
                    user.save(update_fields=['ls_renews_at', 'updated_at'])
                logger.info('[LS webhook] payment_success ignored for already-cancelled user=%s', user.id)
            else:
                _activate_premium(user, attrs, ls_sub_id)

        elif event_name == 'subscription_expired':
            # Subscription fully expired — downgrade now
            _deactivate_premium(user)

        elif event_name == 'subscription_cancelled':
            # User cancelled but keeps access until end of billing period
            _mark_cancelled(user, attrs)

        elif event_name == 'subscription_payment_failed':
            # LS retries automatically — keep premium, just log
            logger.warning('[LS webhook] payment failed for user=%s — keeping premium during retry period', user.id)

        elif event_name == 'subscription_updated':
            sub_status = attrs.get('status', '')
            logger.info('[LS webhook] subscription_updated sub_status=%s renews_at=%s ends_at=%s',
                        sub_status, attrs.get('renews_at'), attrs.get('ends_at'))
            if sub_status == 'active':
                # Only activate if not already cancelled; an update can fire alongside cancellation
                if not user.ls_cancelled:
                    _activate_premium(user, attrs, ls_sub_id)
                else:
                    logger.info('[LS webhook] subscription_updated(active) ignored for cancelled user=%s', user.id)
            elif sub_status == 'cancelled':
                _mark_cancelled(user, attrs)
            elif sub_status == 'expired':
                _deactivate_premium(user)

        return Response({'ok': True})

    except Exception as e:
        logger.error('[LS webhook] processing error: %s', e, exc_info=True)
        return Response({'error': 'Webhook processing failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _parse_ls_date(value):
    """Parse a Lemon Squeezy ISO datetime string to a timezone-aware datetime."""
    if not value:
        return None
    try:
        from django.utils.dateparse import parse_datetime
        return parse_datetime(value)
    except Exception:
        return None


def _activate_premium(user, attrs: dict, ls_sub_id: str = None):
    user.plan = 'premium'
    user.is_permanent_premium = False
    user.ls_cancelled = False
    renews_at = _parse_ls_date(attrs.get('renews_at'))
    if renews_at:
        user.ls_renews_at = renews_at
    update_fields = ['plan', 'is_permanent_premium', 'ls_cancelled', 'updated_at']
    # Preserve trial_ends_at if it's a future referral bonus — don't wipe it on paid renewal.
    # It will be used if the subscription later expires without renewal.
    has_pending_bonus = user.trial_ends_at and user.trial_ends_at > timezone.now()
    if not has_pending_bonus:
        user.trial_ends_at = None
        update_fields.append('trial_ends_at')
    if renews_at:
        update_fields.append('ls_renews_at')
    if ls_sub_id:
        user.ls_subscription_id = str(ls_sub_id)
        update_fields.append('ls_subscription_id')
    user.save(update_fields=update_fields)
    logger.info('[LS] activated premium for user=%s renews_at=%s pending_bonus=%s', user.id, renews_at, bool(has_pending_bonus))


def _mark_cancelled(user, attrs: dict):
    """User cancelled — keep premium until end of billing period."""
    if user.is_permanent_premium:
        return
    ends_at = _parse_ls_date(attrs.get('ends_at')) or _parse_ls_date(attrs.get('renews_at'))
    user.ls_cancelled = True
    if ends_at:
        user.ls_renews_at = ends_at
    update_fields = ['ls_cancelled', 'updated_at']
    if ends_at:
        update_fields.append('ls_renews_at')
    user.save(update_fields=update_fields)
    logger.info('[LS] subscription cancelled for user=%s — premium until %s', user.id, ends_at)


def _deactivate_premium(user):
    if user.is_permanent_premium:
        logger.info('[LS] user=%s has permanent premium — skipping deactivation', user.id)
        return
    # If a referral bonus is pending (future trial_ends_at), activate trial instead of free.
    has_pending_bonus = user.trial_ends_at and user.trial_ends_at > timezone.now()
    user.plan = 'premium' if has_pending_bonus else 'free'
    if not has_pending_bonus:
        user.trial_ends_at = None
    user.ls_cancelled = False
    user.ls_renews_at = None
    user.ls_subscription_id = None
    update_fields = ['plan', 'trial_ends_at', 'ls_cancelled', 'ls_renews_at', 'ls_subscription_id', 'updated_at']
    user.save(update_fields=update_fields)
    logger.info('[LS] deactivated subscription for user=%s — plan=%s (pending_bonus=%s)', user.id, user.plan, bool(has_pending_bonus))


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
