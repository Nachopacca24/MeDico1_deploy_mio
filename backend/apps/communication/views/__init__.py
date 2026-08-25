import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from apps.communication.models import Announcement
from apps.communication.services import promo_push

logger = logging.getLogger(__name__)


# ── Usuarios: leer anuncios activos ───────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_announcements(request):
    """Devuelve todos los anuncios activos, del más reciente al más antiguo."""
    announcements = Announcement.objects.filter(is_active=True).values(
        'id', 'title', 'body', 'created_at'
    )
    result = [
        {**a, 'created_at': a['created_at'].isoformat()}
        for a in announcements
    ]
    return Response(result)


# ── Admin: gestionar anuncios ─────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_announcements(request):
    if request.method == 'GET':
        announcements = Announcement.objects.all().values(
            'id', 'title', 'body', 'is_active', 'created_at'
        )
        result = [
            {**a, 'created_at': a['created_at'].isoformat()}
            for a in announcements
        ]
        return Response(result)

    # POST — crear anuncio
    title = request.data.get('title', '').strip()
    body = request.data.get('body', '').strip()
    if not title or not body:
        return Response(
            {'error': 'El título y el mensaje son obligatorios.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    announcement = Announcement.objects.create(
        title=title,
        body=body,
        created_by=request.user,
    )

    # kind='announcement': sin target_specialties (le corresponde a todos sin
    # importar especialidad) y sin respetar receives_advertising — un Anuncio
    # de sistema (versión nueva, aviso importante) siempre llega, como un
    # recordatorio de cirugía.
    queued_push = promo_push.enqueue(
        title=title, body=body, route='/news',
        label=f'Anuncio: {title}', kind='announcement',
    )
    queued = queued_push.sent_at is None

    logger.info(
        '[ANNOUNCEMENT] created: id=%s title="%s" by=%s %s',
        announcement.id, title, request.user.email,
        'queued (esperando cupo/horario)' if queued else f'pushed_to={queued_push.sent_to_count}',
    )
    return Response(
        {'id': announcement.id, 'title': announcement.title, 'body': announcement.body,
         'is_active': announcement.is_active, 'created_at': announcement.created_at.isoformat(),
         'pushed_to': queued_push.sent_to_count, 'queued': queued},
        status=status.HTTP_201_CREATED
    )


@api_view(['DELETE', 'PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_announcement_detail(request, pk):
    try:
        announcement = Announcement.objects.get(pk=pk)
    except Announcement.DoesNotExist:
        return Response({'error': 'Anuncio no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        announcement.delete()
        return Response({'ok': True})

    # PATCH — activar/desactivar
    if 'is_active' in request.data:
        announcement.is_active = bool(request.data['is_active'])
        announcement.save(update_fields=['is_active'])
    return Response({'id': announcement.id, 'is_active': announcement.is_active})
