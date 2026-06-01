# apps/medico/models/surgery_image.py

from django.db import models
from django.conf import settings


class SurgeryImage(models.Model):
    """Images attached to a surgical case (post-op, X-rays, etc.)."""

    surgery = models.ForeignKey(
        'SurgicalCase',
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name='Cirugía',
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='surgery_images',
        verbose_name='Subida por',
    )

    # Cloudinary fields — stored manually so we control upload/delete
    cloudinary_public_id = models.CharField(max_length=255, verbose_name='Cloudinary Public ID')
    cloudinary_url       = models.URLField(max_length=500, verbose_name='URL de imagen')

    original_filename = models.CharField(max_length=255, blank=True, verbose_name='Nombre original')
    file_size         = models.PositiveIntegerField(null=True, blank=True, verbose_name='Tamaño (bytes)')

    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name='Subida el')

    class Meta:
        ordering = ['uploaded_at']
        verbose_name = 'Imagen de cirugía'
        verbose_name_plural = 'Imágenes de cirugía'

    def __str__(self):
        return f'Imagen #{self.pk} — Cirugía #{self.surgery_id}'
