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

    # Solo el creador puede crear/editar la anestesia
    if case.created_by != request.user:
        return Response({'error': 'Sin permiso.'}, status=status.HTTP_403_FORBIDDEN)

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
            return Response(AnesthesiaCaseSerializer(anesthesia).data,
                            status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # PATCH — el creador o el anestesiólogo asignado pueden actualizar
    try:
        anesthesia = AnesthesiaCase.objects.prefetch_related('items').get(case=case)
    except AnesthesiaCase.DoesNotExist:
        return Response({'error': 'No existe sesión de anestesia para este caso.'},
                        status=status.HTTP_404_NOT_FOUND)

    is_anesthesiologist = anesthesia.anesthesiologist == request.user
    if case.created_by != request.user and not is_anesthesiologist:
        return Response({'error': 'Sin permiso.'}, status=status.HTTP_403_FORBIDDEN)

    # El anestesiólogo solo puede modificar su sección (unit_value, time, items)
    # El creador puede cambiar también quién es el anestesiólogo
    allowed_fields = {'unit_value', 'time_units', 'time_minutes', 'notes'}
    if is_anesthesiologist and not case.created_by == request.user:
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
    else:
        data = request.data

    serializer = AnesthesiaCaseWriteSerializer(anesthesia, data=data, partial=True)
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

    # Creador o anestesiólogo asignado pueden agregar códigos
    if case.created_by != request.user and anesthesia.anesthesiologist != request.user:
        return Response({'error': 'Sin permiso.'}, status=status.HTTP_403_FORBIDDEN)

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

    if case.created_by != request.user and anesthesia.anesthesiologist != request.user:
        return Response({'error': 'Sin permiso.'}, status=status.HTTP_403_FORBIDDEN)

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
