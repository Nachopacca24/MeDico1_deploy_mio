import json
import logging
import os
import threading
import time

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

    from firebase_admin import messaging

    # A fresh Firebase app hasn't necessarily finished fetching its first OAuth
    # access token yet — the very first send right after init can race that and
    # fail with a bogus "missing authentication credential" error. One retry
    # after a short pause clears this without masking a real, persistent
    # problem (which would fail the retry too).
    all_success = []
    all_invalid = []
    remaining = tokens
    for attempt in range(2):
        if not remaining:
            break
        try:
            with _send_lock:
                result = _send_batch(messaging, remaining, title, body, data)
        except Exception as e:
            logger.error(f'FCM batch send error (attempt {attempt + 1}): {e}')
            result = {'success': [], 'failed_tokens': [], 'retry_tokens': remaining}

        all_success.extend(result['success'])
        all_invalid.extend(result['failed_tokens'])
        remaining = result.get('retry_tokens', [])
        if remaining and attempt == 0:
            time.sleep(1)

    return {'success': all_success, 'failed_tokens': all_invalid}


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
                        # Every notification hardcoded badge=1 and nothing on the
                        # client ever clears it (no navigator.clearAppBadge / no
                        # Capacitor Badge plugin) — so the very first push a user
                        # ever got left the app icon stuck showing "1" forever,
                        # regardless of how many notifications came after or
                        # whether they were read. badge=0 explicitly tells iOS to
                        # clear the badge instead, so nothing lingers. Real
                        # per-user unread counts would need a read-tracking model
                        # and batches split by user (today's batches mix tokens
                        # from many users) — worth doing later, not before this
                        # submission.
                        badge=0,
                    ),
                ),
            ),
        )
        for token in tokens
    ]

    batch_response = messaging.send_each(messages)

    success = []
    invalid_tokens = []
    retry_tokens = []
    for token, response in zip(tokens, batch_response.responses):
        if response.success:
            success.append(token)
        elif isinstance(response.exception, messaging.UnregisteredError):
            # The only case where the token itself is actually bad — safe to remove.
            logger.warning(f'FCM token unregistered, removing: {token[:20]}...')
            invalid_tokens.append(token)
        else:
            # Not the token's fault (bad server credentials, transient errors,
            # etc.) — worth one retry, and never delete the token over this.
            exc = response.exception
            code = getattr(exc, 'code', None)
            http_status = getattr(getattr(exc, 'http_response', None), 'status_code', None)
            logger.warning(
                'FCM send failed (will retry): type=%s code=%s http_status=%s msg=%s',
                type(exc).__name__, code, http_status, exc,
            )
            retry_tokens.append(token)

    return {'success': success, 'failed_tokens': invalid_tokens, 'retry_tokens': retry_tokens}


def notify_user(user, title: str, body: str, data: dict | None = None):
    """
    Send push notification to all FCM tokens of a user. This is the only
    channel used for cirugías/invitaciones/colegas — never for Anuncios or
    publicidad, which go through apps.communication.services.promo_push
    instead. So gating here on receives_reminders is independent from (and
    doesn't touch) receives_announcements.
    """
    from apps.medico.models import FCMToken

    if not user.receives_reminders:
        logger.info('[NOTIFY] user=%s skipped (receives_reminders=False)', user.id)
        return

    tokens = list(FCMToken.objects.filter(user=user).values_list('token', flat=True))
    logger.info('[NOTIFY] user=%s title=%r tokens=%d', user.id, title, len(tokens))
    if not tokens:
        return

    result = send_push_notification(tokens, title, body, data)
    logger.info('[NOTIFY] result: success=%d failed=%d', len(result['success']), len(result['failed_tokens']))

    # Clean up tokens that are no longer valid
    if result['failed_tokens']:
        FCMToken.objects.filter(token__in=result['failed_tokens']).delete()


def notify_team(case, exclude_user, title: str, body: str, data: dict | None = None):
    """
    Notify every accepted collaborator on a case (creator, assistant, anesthesiologist),
    skipping exclude_user (normally whoever triggered the event). Previously most case
    events only reached case.created_by, so e.g. the assistant never learned the
    anesthesiologist had accepted/left/added procedures, and vice versa.
    """
    recipients = []
    if case.created_by_id != exclude_user.id:
        recipients.append(case.created_by)
    if (
        case.assistant_doctor_id
        and case.assistant_accepted is True
        and case.assistant_doctor_id != exclude_user.id
    ):
        recipients.append(case.assistant_doctor)
    anesthesia = getattr(case, 'anesthesia', None)
    if (
        anesthesia and anesthesia.anesthesiologist_id
        and anesthesia.anesthesiologist_accepted is True
        and anesthesia.anesthesiologist_id != exclude_user.id
    ):
        recipients.append(anesthesia.anesthesiologist)

    for recipient in recipients:
        notify_user(recipient, title=title, body=body, data=data)
