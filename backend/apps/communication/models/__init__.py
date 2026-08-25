from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Announcement(models.Model):
    title = models.CharField(max_length=200, verbose_name='Título')
    body = models.TextField(verbose_name='Mensaje')
    is_active = models.BooleanField(default=True, verbose_name='Activo')
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='announcements_created',
        verbose_name='Creado por',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Anuncio'
        verbose_name_plural = 'Anuncios'

    def __str__(self):
        return self.title


class QueuedPromoPush(models.Model):
    """
    Cola de push promocionales (Anuncios del sistema + publicidad de clientes
    activada) para que no se manden dos casi al mismo tiempo. Se manda el más
    viejo primero (orden de llegada, nadie elige) apenas el horario/cupo lo
    permitan — ver apps/communication/services/promo_push.py.
    """
    title = models.CharField(max_length=200, verbose_name='Título')
    body = models.TextField(verbose_name='Mensaje')
    route = models.CharField(max_length=100, default='/', verbose_name='Ruta al abrir')
    target_specialties = models.JSONField(
        default=list, blank=True,
        verbose_name='Especialidades objetivo',
        help_text='Vacío = todos ("generales"). Igual semántica que Advertisement.target_specialties.'
    )
    label = models.CharField(
        max_length=200, blank=True,
        verbose_name='Origen',
        help_text='Para identificar de dónde vino en logs/admin, ej. "Anuncio: Nueva versión" o "Publicidad: Cliente X".'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name='Enviado el')
    sent_to_count = models.PositiveIntegerField(default=0, verbose_name='Dispositivos alcanzados')

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Push promocional en cola'
        verbose_name_plural = 'Cola de push promocionales'

    def __str__(self):
        return f'{self.title} ({"enviado" if self.sent_at else "pendiente"})'
