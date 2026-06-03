# apps/medico/views/surgery_images.py

import logging

import cloudinary.uploader
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from ..models import SurgicalCase, SurgeryImage

logger = logging.getLogger(__name__)

MAX_IMAGES_PER_SURGERY = 5
MAX_FILE_SIZE_BYTES    = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES  = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'}

# Magic byte signatures for allowed image types
_MAGIC_JPEG  = b'\xff\xd8\xff'
_MAGIC_PNG   = b'\x89PNG'
_MAGIC_RIFF  = b'RIFF'
_MAGIC_WEBP  = b'WEBP'    # at offset 8


def _has_valid_image_magic(file_obj) -> bool:
    header = file_obj.read(12)
    file_obj.seek(0)
    if header[:3] == _MAGIC_JPEG:
        return True
    if header[:4] == _MAGIC_PNG:
        return True
    if header[:4] == _MAGIC_RIFF and header[8:12] == _MAGIC_WEBP:
        return True
    # HEIC/HEIF: ftyp box at offset 4
    if len(header) >= 8 and header[4:8] == b'ftyp':
        return True
    return False


def _check_premium(user):
    return user.plan == 'premium' or user.is_permanent_premium


def _get_owned_case(case_id, user):
    """Return the case only if user is the owner, else None."""
    try:
        return SurgicalCase.objects.get(pk=case_id, created_by=user)
    except SurgicalCase.DoesNotExist:
        return None


# ── List images ───────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_surgery_images(request, case_id):
    """List images for a surgery. Owner and accepted assistant can view."""
    try:
        case = SurgicalCase.objects.get(pk=case_id)
    except SurgicalCase.DoesNotExist:
        return Response({'error': 'Caso no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    is_owner     = case.created_by_id == request.user.id
    is_assistant = (
        case.assistant_doctor_id == request.user.id and
        case.assistant_accepted is True
    )

    if not (is_owner or is_assistant):
        return Response({'error': 'Sin acceso a este caso'}, status=status.HTTP_403_FORBIDDEN)

    images = case.images.all().values(
        'id', 'cloudinary_url', 'original_filename', 'file_size', 'uploaded_at', 'uploaded_by_id'
    )
    return Response(list(images))


# ── Upload image ──────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_surgery_image(request, case_id):
    """Upload an image to a surgery. Premium only, owner only, max 5 images."""
    if not _check_premium(request.user):
        return Response(
            {'error': 'Durante tu prueba Premium operaste sin límites. Reactiva Premium para subir imágenes.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    case = _get_owned_case(case_id, request.user)
    if not case:
        return Response({'error': 'Caso no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    # Check image limit
    current_count = case.images.count()
    if current_count >= MAX_IMAGES_PER_SURGERY:
        return Response(
            {'error': f'Límite de {MAX_IMAGES_PER_SURGERY} imágenes por cirugía alcanzado.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    file = request.FILES.get('image')
    if not file:
        return Response({'error': 'No se envió ningún archivo'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate content-type header (client-supplied)
    content_type = file.content_type.lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        return Response(
            {'error': 'Formato no permitido. Usá JPG, PNG o WEBP.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate actual file magic bytes (prevents spoofed content-type)
    if not _has_valid_image_magic(file):
        logger.warning('[IMG] magic bytes mismatch user=%s claimed=%s', request.user.id, content_type)
        return Response(
            {'error': 'El archivo no es una imagen válida.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate file size
    if file.size > MAX_FILE_SIZE_BYTES:
        return Response(
            {'error': 'El archivo supera el límite de 10 MB.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Upload to Cloudinary
    try:
        result = cloudinary.uploader.upload(
            file,
            folder=f'surgery_images/case_{case_id}',
            resource_type='image',
            transformation=[{'quality': 'auto', 'fetch_format': 'auto'}],
        )
    except Exception as e:
        logger.error('[IMG] Cloudinary upload error case=%s user=%s: %s', case_id, request.user.id, e, exc_info=True)
        return Response({'error': 'Error al subir la imagen'}, status=status.HTTP_502_BAD_GATEWAY)

    img = SurgeryImage.objects.create(
        surgery=case,
        uploaded_by=request.user,
        cloudinary_public_id=result['public_id'],
        cloudinary_url=result['secure_url'],
        original_filename=file.name or '',
        file_size=file.size,
    )

    logger.info('[IMG] uploaded image=%s to case=%s by user=%s', img.id, case_id, request.user.id)

    # Notify assistant if they exist and have accepted
    if case.assistant_doctor and case.assistant_accepted is True:
        case.assistant_notified_at = timezone.now()
        case.save(update_fields=['assistant_notified_at'])
        logger.info('[IMG] notified assistant=%s of new image in case=%s', case.assistant_doctor_id, case_id)

    return Response({
        'id': img.id,
        'cloudinary_url': img.cloudinary_url,
        'original_filename': img.original_filename,
        'file_size': img.file_size,
        'uploaded_at': img.uploaded_at,
    }, status=status.HTTP_201_CREATED)


# ── Delete image ──────────────────────────────────────────────────────────────

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_surgery_image(request, case_id, image_id):
    """Delete an image. Owner only."""
    case = _get_owned_case(case_id, request.user)
    if not case:
        return Response({'error': 'Caso no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    try:
        img = SurgeryImage.objects.get(pk=image_id, surgery=case)
    except SurgeryImage.DoesNotExist:
        return Response({'error': 'Imagen no encontrada'}, status=status.HTTP_404_NOT_FOUND)

    # Delete from Cloudinary
    try:
        cloudinary.uploader.destroy(img.cloudinary_public_id, resource_type='image')
    except Exception as e:
        logger.warning('[IMG] Cloudinary delete error image=%s: %s', image_id, e)

    img.delete()
    logger.info('[IMG] deleted image=%s from case=%s by user=%s', image_id, case_id, request.user.id)
    return Response(status=status.HTTP_204_NO_CONTENT)
