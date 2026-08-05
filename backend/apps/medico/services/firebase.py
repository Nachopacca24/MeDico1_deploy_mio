import json
import logging
import os
import threading

logger = logging.getLogger(__name__)

_app = None
_app_lock = threading.Lock()
# Serializes actual FCM sends within a worker process. The credentials object's
# token refresh isn't guaranteed thread-safe, and with gthread workers, multiple
# requests can now genuinely run concurrently in the same process (impossible
# under the old sync workers) — this closes that race.
_send_lock = threading.Lock()


def _get_app():
    global _app
    if _app is not None:
        return _app

    with _app_lock:
        # Another thread may have finished initializing while we waited for the lock
        if _app is not None:
            return _app
        return _init_app()


def _init_app():
    global _app
    try:
        import firebase_admin
        from firebase_admin import credentials

        # Prefer JSON string from env (Railway secret), fall back to file path
        service_account_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
        service_account_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_PATH')

        if service_account_json:
            cred = credentials.Certificate(json.loads(service_account_json))
        elif service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
        else:
            logger.warning('Firebase credentials not configured — push notifications disabled')
            return None

        if not firebase_admin._apps:
            _app = firebase_admin.initialize_app(cred)
        else:
            _app = firebase_admin.get_app()

        logger.info('[FIREBASE] App initialized OK')
        return _app
    except Exception as e:
        logger.warning(f'Firebase init failed: {e}')
        return None


def send_push_notification(tokens: list[str], title: str, body: str, data: dict | None = None) -> dict:
    """
    Send a push notification to a list of FCM tokens.
    Returns dict with 'success' and 'failed_tokens' lists.
    """
    if not tokens:
        return {'success': [], 'failed_tokens': []}

    app = _get_app()
    if app is None:
        return {'success': [], 'failed_tokens': tokens}

    try:
        from firebase_admin import messaging

        with _send_lock:
            return _send_batch(messaging, tokens, title, body, data)
    except Exception as e:
        # A batch-level failure (e.g. broken credentials) says nothing about
        # whether any individual token is valid — don't delete any of them.
        logger.error(f'FCM batch send error: {e}')
        return {'success': [], 'failed_tokens': []}


def _send_batch(messaging, tokens, title, body, data):
    messages = [
        messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=token,
            android=messaging.AndroidConfig(
                priority='high',
                notification=messaging.AndroidNotification(
                    sound='default',
                    channel_id='medico_default',
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        sound='default',
                        badge=1,
                    ),
                ),
            ),
        )
        for token in tokens
    ]

    batch_response = messaging.send_each(messages)

    success = []
    invalid_tokens = []
    for token, response in zip(tokens, batch_response.responses):
        if response.success:
            success.append(token)
        elif isinstance(response.exception, messaging.UnregisteredError):
            # The only case where the token itself is actually bad — safe to remove.
            logger.warning(f'FCM token unregistered, removing: {token[:20]}...')
            invalid_tokens.append(token)
        else:
            # Any other failure (bad server credentials, transient errors, etc.)
            # is not the token's fault — log it but don't delete a token that
            # might still be perfectly valid.
            logger.warning(f'FCM send failed (token kept): {response.exception}')

    return {'success': success, 'failed_tokens': invalid_tokens}


def notify_user(user, title: str, body: str, data: dict | None = None):
    """Send push notification to all FCM tokens of a user."""
    from apps.medico.models import FCMToken

    tokens = list(FCMToken.objects.filter(user=user).values_list('token', flat=True))
    logger.info('[NOTIFY] user=%s title=%r tokens=%d', user.id, title, len(tokens))
    if not tokens:
        return

    result = send_push_notification(tokens, title, body, data)
    logger.info('[NOTIFY] result: success=%d failed=%d', len(result['success']), len(result['failed_tokens']))

    # Clean up tokens that are no longer valid
    if result['failed_tokens']:
        FCMToken.objects.filter(token__in=result['failed_tokens']).delete()
