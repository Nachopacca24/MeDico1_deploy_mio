from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.medico.models.surgical_case import SurgicalCase
from apps.medico.models.anesthesia import AnesthesiaCase, AnesthesiaItem
from apps.medico.serializers.anesthesia import (
    AnesthesiaCaseSerializer,
    AnesthesiaCaseWriteSerializer,
    AnesthesiaItemSerializer,
)


def _get_case(case_id, user):
    """Devuelve el caso si el usuario puede verlo, o None."""
    try:
        case = SurgicalCase.objects.get(pk=case_id)
    except SurgicalCase.DoesNotExist:
        return None
    if not case.can_be_viewed_by(user):
        return None
    return case


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
            # Si solo hay nombre libre (sin FK) no hay nadie que acepte → auto-aceptar
            if not anesthesia.anesthesiologist:
                anesthesia.anesthesiologist_accepted = True
                anesthesia.save(update_fields=['anesthesiologist_accepted'])
            return Response(AnesthesiaCaseSerializer(anesthesia).data,
                            status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # PATCH — solo el anestesiólogo puede editar su sección
    try:
        anesthesia = AnesthesiaCase.objects.prefetch_related('items').get(case=case)
    except AnesthesiaCase.DoesNotExist:
        return Response({'error': 'No existe sesión de anestesia para este caso.'},
                        status=status.HTTP_404_NOT_FOUND)

    if anesthesia.anesthesiologist != request.user:
        return Response({'error': 'Solo el anestesiólogo puede editar esta sección.'},
                        status=status.HTTP_403_FORBIDDEN)

    serializer = AnesthesiaCaseWriteSerializer(anesthesia, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
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

    return Response(
        AnesthesiaCaseSerializer(
            AnesthesiaCase.objects.prefetch_related('items').get(pk=anesthesia_pk)
        ).data
    )
