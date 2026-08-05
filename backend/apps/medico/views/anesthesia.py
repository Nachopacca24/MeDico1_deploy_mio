from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.utils import timezone

from apps.medico.models.surgical_case import SurgicalCase
from apps.medico.models.anesthesia import AnesthesiaCase, AnesthesiaItem
from apps.medico.serializers.anesthesia import (
    AnesthesiaCaseSerializer,
    AnesthesiaCaseWriteSerializer,
    AnesthesiaItemSerializer,
)


from apps.medico.serializers.surgical_case import SurgicalCaseListSerializer

_MONTHS = ['enero','febrero','marzo','abril','mayo','junio',
           'julio','agosto','septiembre','octubre','noviembre','diciembre']

def _fmt_date(d):
    if not d:
        return ''
    return f"{d.day} de {_MONTHS[d.month - 1]}"


def _get_case(case_id, user):
    """Devuelve el caso si el usuario puede verlo, o None."""
    try:
        case = SurgicalCase.objects.get(pk=case_id)
    except SurgicalCase.DoesNotExist:
        return None
    if not case.can_be_viewed_by(user):
        return None
    return case


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def anesthesia_pending_invitations(request):
    """Casos donde el usuario es anestesiólogo invitado y aún no ha respondido."""
    from apps.medico.models.surgical_case import SurgicalCase
    cases = SurgicalCase.objects.filter(
        anesthesia__anesthesiologist=request.user,
        anesthesia__anesthesiologist_accepted__isnull=True,
        archived_at__isnull=True,
    ).select_related('hospital', 'created_by').prefetch_related('anesthesia')

    serializer = SurgicalCaseListSerializer(cases, many=True, context={'request': request})
    return Response({
        'pending_invitations': serializer.data,
        'total_pending': cases.count(),
    })


@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def anesthesia_case(request, case_id):
    """
    GET  → devuelve la sesión de anestesia del caso (404 si no existe)
    POST → crea la sesión (falla si ya existe)
    PATCH → actualiza campos (unit_value, time_minutes, anesthesiologist, etc.)
    """
    case = _get_case(case_id, request.user)
    if case is None:
        return Response({'error': 'Caso no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        try:
            anesthesia = AnesthesiaCase.objects.prefetch_related('items').get(case=case)
        except AnesthesiaCase.DoesNotExist:
            return Response(None, status=status.HTTP_200_OK)
        return Response(AnesthesiaCaseSerializer(anesthesia).data)

    if request.method == 'POST':
        # Solo el creador puede crear la sesión de anestesia e invitar al anestesiólogo
        if case.created_by != request.user:
            return Response({'error': 'Sin permiso.'}, status=status.HTTP_403_FORBIDDEN)
        if AnesthesiaCase.objects.filter(case=case).exists():
            return Response({'error': 'Ya existe una sesión de anestesia para este caso.'},
                            status=status.HTTP_400_BAD_REQUEST)
        serializer = AnesthesiaCaseWriteSerializer(data=request.data)
        if serializer.is_valid():
            anesthesia = serializer.save(case=case)
            # Auto-aceptar si: no hay FK (nombre libre) o el propio creador se asigna
            if not anesthesia.anesthesiologist or anesthesia.anesthesiologist == case.created_by:
                anesthesia.anesthesiologist_accepted = True
                anesthesia.save(update_fields=['anesthesiologist_accepted'])
            elif anesthesia.anesthesiologist:
                # Notificar al anestesiólogo invitado
                try:
                    from apps.medico.services.firebase import notify_user
                    import logging as _log
                    principal_name = case.created_by.get_full_name() or case.created_by.username
                    date_str = _fmt_date(case.surgery_date)
                    time_str = case.surgery_time.strftime('%H:%M') if case.surgery_time else ''
                    inv_body = f'{principal_name} te invitó como anestesiólogo el {date_str}'
                    if time_str:
                        inv_body += f' a las {time_str}'
                    inv_body += '. Revisá la sección Cirugías.'
                    notify_user(
                        anesthesia.anesthesiologist,
                        title='Nueva invitación a cirugía',
                        body=inv_body,
                        data={'route': '/cases'},
                    )
                    SurgicalCase.objects.filter(pk=case.pk).update(anesthesiologist_notified_at=timezone.now())
                except Exception:
                    _log.getLogger(__name__).exception('Error sending anesthesiologist invitation notification case=%s', case.pk)
            return Response(AnesthesiaCaseSerializer(anesthesia).data,
                            status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # PATCH — dueño puede cambiar quién es el anestesiólogo; el anestesiólogo edita los datos de su sesión
    try:
        anesthesia = AnesthesiaCase.objects.prefetch_related('items').get(case=case)
    except AnesthesiaCase.DoesNotExist:
        return Response({'error': 'No existe sesión de anestesia para este caso.'},
                        status=status.HTTP_404_NOT_FOUND)

    user = request.user

    # El dueño del caso puede reasignar al anestesiólogo, pero solo si él mismo NO es el anestesiólogo
    if case.created_by == user and anesthesia.anesthesiologist != user:
        allowed = {'anesthesiologist', 'anesthesiologist_name'}
        data = {k: v for k, v in request.data.items() if k in allowed}
        old_anesthesiologist_id = anesthesia.anesthesiologist_id
        old_anesthesiologist_accepted = anesthesia.anesthesiologist_accepted  # capturar ANTES del save
        serializer = AnesthesiaCaseWriteSerializer(anesthesia, data=data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        instance = serializer.save()
        # Resetear aceptación si cambió el anestesiólogo
        if instance.anesthesiologist_id != old_anesthesiologist_id:
            if instance.anesthesiologist:
                instance.anesthesiologist_accepted = None  # nuevo colega → pendiente
            else:
                instance.anesthesiologist_accepted = True  # nombre libre → auto-aceptar
            instance.save(update_fields=['anesthesiologist_accepted'])

            # Notificar al nuevo anestesiólogo invitado (si es un colega con cuenta, no nombre libre,
            # y no es el propio dueño reasignándose a sí mismo)
            if instance.anesthesiologist and instance.anesthesiologist_id != user.id:
                try:
                    from apps.medico.services.firebase import notify_user
                    principal_name = case.created_by.get_full_name() or case.created_by.username
                    date_str = _fmt_date(case.surgery_date)
                    time_str = case.surgery_time.strftime('%H:%M') if case.surgery_time else ''
                    inv_body = f'{principal_name} te invitó como anestesiólogo el {date_str}'
                    if time_str:
                        inv_body += f' a las {time_str}'
                    inv_body += '. Revisá la sección Cirugías.'
                    notify_user(
                        instance.anesthesiologist,
                        title='Nueva invitación a cirugía',
                        body=inv_body,
                        data={'route': '/cases'},
                    )
                    SurgicalCase.objects.filter(pk=case.pk).update(anesthesiologist_notified_at=timezone.now())
                except Exception:
                    import logging
                    logging.getLogger(__name__).exception('Error sending anesthesiologist invitation notification (reassign) case=%s', case.pk)

            # Si el anestesiólogo anterior había aceptado → notificación de remoción
            if old_anesthesiologist_id and old_anesthesiologist_accepted is True:
                try:
                    from django.contrib.auth import get_user_model
                    from apps.medico.models.surgical_case import CollaboratorRemoval
                    from apps.medico.services.firebase import notify_user
                    User = get_user_model()
                    old_anesth = User.objects.get(pk=old_anesthesiologist_id)
                    CollaboratorRemoval.objects.update_or_create(
                        case=case, removed_user=old_anesth, role='anesthesiologist',
                        defaults={'acknowledged': False},
                    )
                    notify_user(
                        old_anesth,
                        title='Actualización en una cirugía',
                        body='Hubo un cambio en el equipo anestésico de una cirugía en la que participabas. Revisá tus casos.',
                        data={'route': '/cases'},
                    )
                except Exception:
                    import logging
                    logging.getLogger(__name__).exception('Error creating anesthesiologist removal notification')
        return Response(AnesthesiaCaseSerializer(
            AnesthesiaCase.objects.prefetch_related('items').get(pk=instance.pk)
        ).data)

    # El anestesiólogo puede editar los datos de su propia sesión solo si aceptó
    if anesthesia.anesthesiologist != user or anesthesia.anesthesiologist_accepted is not True:
        return Response({'error': 'Solo el anestesiólogo puede editar esta sección.'},
                        status=status.HTTP_403_FORBIDDEN)

    _ANEST_ALLOWED = {
        'unit_value', 'time_units', 'time_minutes',
        'equipment_name', 'equipment_cost',
        'notes', 'is_operated', 'is_billed', 'is_paid', 'invoice_number',
    }
    data = {k: v for k, v in request.data.items() if k in _ANEST_ALLOWED}
    serializer = AnesthesiaCaseWriteSerializer(anesthesia, data=data, partial=True)
    if serializer.is_valid():
        serializer.save()
        case.save(update_fields=['updated_at'])
        anesthesia.refresh_from_db()
        return Response(AnesthesiaCaseSerializer(
            AnesthesiaCase.objects.prefetch_related('items').get(pk=anesthesia.pk)
        ).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_anesthesia_item(request, case_id):
    """Agrega un código de procedimiento anestésico (unidades base)."""
    case = _get_case(case_id, request.user)
    if case is None:
        return Response({'error': 'Caso no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        anesthesia = AnesthesiaCase.objects.get(case=case)
    except AnesthesiaCase.DoesNotExist:
        return Response({'error': 'Primero crea la sesión de anestesia.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Solo el anestesiólogo puede agregar códigos — el cirujano no toca esta sección
    if anesthesia.anesthesiologist != request.user:
        return Response({'error': 'Solo el anestesiólogo puede agregar códigos.'},
                        status=status.HTTP_403_FORBIDDEN)

    serializer = AnesthesiaItemSerializer(data=request.data)
    if serializer.is_valid():
        last_order = anesthesia.items.count()
        serializer.save(anesthesia_case=anesthesia, order=last_order)
        # Bump the parent case's updated_at so the calendar sync (which only
        # looks at SurgicalCase.updated_at) notices the new code and re-syncs.
        case.save(update_fields=['updated_at'])
        return Response(
            AnesthesiaCaseSerializer(
                AnesthesiaCase.objects.prefetch_related('items').get(pk=anesthesia.pk)
            ).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_anesthesia_invitation(request, case_id):
    """El anestesiólogo acepta o rechaza la invitación al caso."""
    case = _get_case(case_id, request.user)
    if case is None:
        return Response({'error': 'Caso no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        anesthesia = AnesthesiaCase.objects.prefetch_related('items').get(case=case)
    except AnesthesiaCase.DoesNotExist:
        return Response({'error': 'No existe sesión de anestesia para este caso.'},
                        status=status.HTTP_404_NOT_FOUND)

    if anesthesia.anesthesiologist != request.user:
        return Response({'error': 'Solo el anestesiólogo invitado puede responder.'},
                        status=status.HTTP_403_FORBIDDEN)

    accepted = request.data.get('accepted')
    if accepted is None:
        return Response({'error': 'Se requiere el campo accepted (true/false).'},
                        status=status.HTTP_400_BAD_REQUEST)

    anesthesia.anesthesiologist_accepted = bool(accepted)
    anesthesia.save()
    case.save(update_fields=['updated_at'])

    # Notificar al cirujano principal
    try:
        from apps.medico.services.firebase import notify_user
        import logging as _log
        anesth_name = request.user.get_full_name() or request.user.username
        date_str = _fmt_date(case.surgery_date)
        if bool(accepted):
            notify_user(
                case.created_by,
                title='Equipo confirmado',
                body=f'{anesth_name} confirmó su participación como anestesiólogo en tu cirugía del {date_str}.',
                data={'route': f'/cases/{case.pk}'},
            )
        else:
            notify_user(
                case.created_by,
                title='Cambio en tu equipo',
                body=f'{anesth_name} no pudo aceptar la cirugía del {date_str}. Podés asignar otro anestesiólogo.',
                data={'route': f'/cases/{case.pk}'},
            )
    except Exception:
        import logging as _log
        _log.getLogger(__name__).exception('Error sending anesthesiologist response notification case=%s', case.pk)

    return Response(AnesthesiaCaseSerializer(
        AnesthesiaCase.objects.prefetch_related('items').get(pk=anesthesia.pk)
    ).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_anesthesia_item(request, case_id, item_id):
    """Elimina un código de procedimiento anestésico."""
    case = _get_case(case_id, request.user)
    if case is None:
        return Response({'error': 'Caso no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        anesthesia = AnesthesiaCase.objects.get(case=case)
    except AnesthesiaCase.DoesNotExist:
        return Response({'error': 'No existe sesión de anestesia.'}, status=status.HTTP_404_NOT_FOUND)

    if anesthesia.anesthesiologist != request.user:
        return Response({'error': 'Solo el anestesiólogo puede eliminar códigos.'},
                        status=status.HTTP_403_FORBIDDEN)

    try:
        item = AnesthesiaItem.objects.get(pk=item_id, anesthesia_case__case=case)
    except AnesthesiaItem.DoesNotExist:
        return Response({'error': 'Ítem no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    anesthesia_pk = item.anesthesia_case_id
    item.delete()
    case.save(update_fields=['updated_at'])

    return Response(
        AnesthesiaCaseSerializer(
            AnesthesiaCase.objects.prefetch_related('items').get(pk=anesthesia_pk)
        ).data
    )
