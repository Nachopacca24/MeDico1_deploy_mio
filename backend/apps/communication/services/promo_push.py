"""
Cola + horario compartida por Anuncios del sistema y publicidad de clientes
plan oro. Nada de esto aplica a notificaciones transaccionales (colegas,
cirugías, referidos) — esas siguen yendo directo por
apps.medico.services.firebase.notify_user/notify_team, sin pasar por acá.

Los Anuncios del sistema (kind='announcement' — versión nueva, avisos
importantes) siempre llegan a todos: comparten el mismo horario/cupo que la
publicidad para no saturar, pero ningún usuario puede silenciarlos — igual
que un recordatorio de cirugía. Solo la publicidad (kind='advertisement',
default) respeta el toggle receives_advertising de cada usuario.

Como mucho 2 por día, hora de Guatemala (TIME_ZONE del proyecto):
  - Primer turno: sale entre las 10:00 y las 16:59.
  - Segundo turno: sale entre las 17:00 y las 20:59.
  - Nada fuera de esas franjas — si no salió para las 9pm, espera al turno
    de las 10am del día siguiente en vez de mandarse tarde en la noche.

Si el turno que le toca todavía no llegó, se encola y sale más adelante —
no se descarta ni se "elige" entre anuncios: siempre gana el más viejo en
cola (orden de llegada), así nunca hay que decidir a mano entre clientes.
"""

import logging
from datetime import timedelta

from django.utils import timezone

from apps.communication.models import QueuedPromoPush

logger = logging.getLogger(__name__)

# (hora de inicio, hora de fin) de cada turno diario, hora local. El turno N
# (0-based) es el que corresponde una vez que ya se mandaron N hoy.
SLOT_WINDOWS = [(10, 17), (17, 21)]
MAX_PER_DAY = len(SLOT_WINDOWS)


def enqueue(
    title: str, body: str, target_specialties=None, route: str = '/', label: str = '',
    kind: str = 'advertisement',
) -> QueuedPromoPush:
    """
    Encola un push promocional y lo intenta mandar de una si ya le tocaba el
    turno. kind='announcement' (Anuncios del sistema) ignora el opt-out de
    publicidad de cada usuario — siempre llega a todos, igual que un
    recordatorio de cirugía. kind='advertisement' (default) sí lo respeta.
    """
    push = QueuedPromoPush.objects.create(
        title=title, body=body,
        target_specialties=target_specialties or [],
        route=route, label=label, kind=kind,
    )
    try_send_next()
    push.refresh_from_db()
    return push


def _sent_today_count(local_now) -> int:
    day_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    return QueuedPromoPush.objects.filter(sent_at__gte=day_start).count()


def _within_current_slot(local_now) -> bool:
    sent_today = _sent_today_count(local_now)
    if sent_today >= MAX_PER_DAY:
        return False
    start, end = SLOT_WINDOWS[sent_today]
    return start <= local_now.hour < end


def try_send_next() -> None:
    """
    Manda el push pendiente más antiguo si ya llegó su turno. Se llama tanto
    al encolar uno nuevo (por si el turno ya está abierto) como desde el cron
    cada ~5min (por si uno que había quedado esperando ya puede salir). No
    hay locking explícito — dos anuncios activándose en el mismo instante es
    un caso real pero muy raro acá (solo publicidad plan oro y Anuncios del
    admin), y en el peor caso ambos se encolan y salen en turnos distintos
    igual, solo que el orden exacto de quién llegó primero podría no ser al
    milisegundo.
    """
    from apps.medico.models import FCMToken
    from apps.medico.services.firebase import send_push_notification

    now = timezone.now()
    local_now = timezone.localtime(now)

    if not _within_current_slot(local_now):
        return

    pending = QueuedPromoPush.objects.filter(sent_at__isnull=True).order_by('created_at').first()
    if not pending:
        return

    tokens_qs = FCMToken.objects.all()
    if pending.kind == 'advertisement':
        tokens_qs = tokens_qs.exclude(user__receives_advertising=False)
    if pending.target_specialties:
        tokens_qs = tokens_qs.filter(user__specialty__in=pending.target_specialties)
    tokens = list(tokens_qs.values_list('token', flat=True))

    sent_count = 0
    if tokens:
        result = send_push_notification(tokens, title=pending.title, body=pending.body, data={'route': pending.route})
        if result['failed_tokens']:
            FCMToken.objects.filter(token__in=result['failed_tokens']).delete()
        sent_count = len(result['success'])

    pending.sent_at = now
    pending.sent_to_count = sent_count
    pending.save(update_fields=['sent_at', 'sent_to_count'])
    logger.info(
        '[PROMO_PUSH] sent id=%s label=%r target_specialties=%s to %d tokens',
        pending.id, pending.label, pending.target_specialties or 'todos', sent_count,
    )
