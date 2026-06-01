"""
Elimina las imágenes de cirugías cobradas una vez pasados 3 meses.
El caso en sí NO se borra — solo sus imágenes de Cloudinary y los registros SurgeryImage.
El caso completo se elimina a los 6 meses mediante purge_archived_cases.

Ejecutar diariamente como cron job en Railway:
    python manage.py purge_surgery_images
"""

import logging

import cloudinary.uploader
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.medico.models import SurgicalCase, SurgeryImage

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Elimina imágenes de cirugías cobradas hace más de 3 meses'

    def handle(self, *args, **options):
        now = timezone.now()

        cases = SurgicalCase.objects.filter(
            images_purge_at__lte=now,
            images__isnull=False,
        ).distinct().prefetch_related('images')

        total_cases   = cases.count()
        total_deleted = 0
        total_errors  = 0

        for case in cases:
            images = list(case.images.all())
            for img in images:
                try:
                    cloudinary.uploader.destroy(img.cloudinary_public_id, resource_type='image')
                    img.delete()
                    total_deleted += 1
                    logger.info('[PURGE_IMG] deleted image=%s case=%s', img.id, case.id)
                except Exception as e:
                    total_errors += 1
                    logger.error('[PURGE_IMG] error deleting image=%s case=%s: %s', img.id, case.id, e)

        self.stdout.write(
            self.style.SUCCESS(
                f'Imágenes purgadas: {total_deleted} de {total_cases} casos '
                f'({total_errors} errores)'
            )
        )
