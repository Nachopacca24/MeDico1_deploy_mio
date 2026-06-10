import logging
from django.db import models
from django.conf import settings
from django.core.validators import URLValidator
from django.db.models.signals import post_delete, pre_save, post_save
from django.dispatch import receiver
from decimal import Decimal
import os
from cloudinary.models import CloudinaryField
import cloudinary.uploader

logger = logging.getLogger(__name__)


class Client(models.Model):
    """Clientes que pagan por publicidad"""
    
    PLAN_CHOICES = [
        ('bronze', 'Bronce'),
        ('silver', 'Plata'),
        ('gold', 'Oro'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Activo'),
        ('inactive', 'Inactivo'),
        ('pending', 'Pendiente'),
        ('expired', 'Expirado'),
    ]
    
    # Información básica
    company_name = models.CharField(
        max_length=200,
        verbose_name="Nombre de la Empresa",
        help_text="Nombre comercial del cliente"
    )
    contact_name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Nombre de Contacto",
        help_text="Persona de contacto"
    )
    email = models.EmailField(
        verbose_name="Email",
        help_text="Email de contacto"
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Teléfono"
    )
    
    # Plan y pago
    plan = models.CharField(
        max_length=10,
        choices=PLAN_CHOICES,
        default='bronze',
        verbose_name="Plan Contratado"
    )
    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Monto Pagado",
        help_text="Cantidad pagada en moneda local"
    )
    currency = models.CharField(
        max_length=3,
        default='GTQ',
        verbose_name="Moneda",
        help_text="Código de moneda (USD, GTQ, etc.)"
    )
    
    # Periodo del contrato
    start_date = models.DateField(
        verbose_name="Fecha de Inicio",
        help_text="Inicio del periodo de publicidad"
    )
    end_date = models.DateField(
        verbose_name="Fecha de Fin",
        help_text="Fin del periodo de publicidad"
    )
    
    # Estado
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name="Estado"
    )
    
    # Cupos negociados de anuncios por placement
    quota_home_banner = models.PositiveIntegerField(
        default=0,
        verbose_name="Cupo Banner Principal",
        help_text="Máximo de anuncios Banner Principal contratados"
    )
    quota_popup = models.PositiveIntegerField(
        default=0,
        verbose_name="Cupo Popup",
        help_text="Máximo de anuncios Popup contratados"
    )
    quota_sidebar = models.PositiveIntegerField(
        default=0,
        verbose_name="Cupo Barra Lateral",
        help_text="Máximo de anuncios Barra Lateral contratados"
    )
    quota_between_content = models.PositiveIntegerField(
        default=0,
        verbose_name="Cupo Entre Contenido",
        help_text="Máximo de anuncios Entre Contenido contratados"
    )
    quota_footer = models.PositiveIntegerField(
        default=0,
        verbose_name="Cupo Footer",
        help_text="Máximo de anuncios Footer contratados"
    )

    # Notas adicionales
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Notas",
        help_text="Información adicional sobre el cliente"
    )
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clients_created',
        verbose_name="Creado por"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )
    
    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['plan']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.company_name} - {self.get_plan_display()}"
    
    @property
    def is_active(self):
        """Verifica si el cliente está activo y dentro del periodo"""
        from django.utils import timezone
        today = timezone.now().date()
        return (
            self.status == 'active' and 
            self.start_date <= today <= self.end_date
        )
    
    @property
    def days_remaining(self):
        """Calcula los días restantes del contrato"""
        from django.utils import timezone
        today = timezone.now().date()
        if self.end_date >= today:
            return (self.end_date - today).days
        return 0
    
    @property
    def ad_count(self):
        """Cuenta el número de anuncios del cliente"""
        return self.advertisements.count()


class Advertisement(models.Model):
    """Anuncios/Publicidad de los clientes"""
    
    STATUS_CHOICES = [
        ('active', 'Activo'),
        ('paused', 'Pausado'),
        ('completed', 'Finalizado'),
        ('draft', 'Borrador'),
    ]
    
    PLACEMENT_CHOICES = [
        ('home_banner', 'Banner Principal (Home)'),
        ('sidebar', 'Barra Lateral'),
        ('footer', 'Footer'),
        ('popup', 'Popup'),
        ('between_content', 'Entre Contenido'),
    ]

    CATEGORY_CHOICES = [
        ('general', 'General'),
        ('congreso', 'Congreso'),
        ('casa_medica', 'Casa Médica'),
        ('hospital', 'Hospital'),
        ('tecnologia', 'Tecnología Médica'),
        ('farmaceutica', 'Farmacéutica'),
        ('educacion', 'Educación Médica'),
        ('clinica', 'Clínica'),
    ]
    
    # Relación con cliente
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='advertisements',
        verbose_name="Cliente"
    )
    
    # Información del anuncio
    campaign_name = models.CharField(
        max_length=200,
        verbose_name="Nombre de la Campaña",
        help_text="Nombre interno para identificar el anuncio"
    )
    title = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Título",
        help_text="Título visible del anuncio (opcional)"
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descripción",
        help_text="Descripción del anuncio (opcional)"
    )
    
    # Imagen/Media
    image = CloudinaryField(
        'image',
        folder='advertisements',
        help_text="Imagen o GIF del anuncio"
    )
    image_alt_text = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Texto Alternativo",
        help_text="Descripción de la imagen para accesibilidad"
    )
    
    # URL de redirección
    redirect_url = models.URLField(
        verbose_name="URL de Redirección",
        help_text="URL a la que se redirige al hacer click"
    )
    open_in_new_tab = models.BooleanField(
        default=True,
        verbose_name="Abrir en Nueva Pestaña"
    )
    
    # Configuración del anuncio
    placement = models.CharField(
        max_length=20,
        choices=PLACEMENT_CHOICES,
        default='home_banner',
        verbose_name="Ubicación",
        help_text="Dónde se mostrará el anuncio"
    )
    priority = models.IntegerField(
        default=0,
        verbose_name="Prioridad",
        help_text="Mayor número = mayor prioridad (0-100)"
    )
    
    # Periodo de visualización
    start_date = models.DateField(
        verbose_name="Fecha de Inicio",
        help_text="Cuándo empieza a mostrarse"
    )
    end_date = models.DateField(
        verbose_name="Fecha de Fin",
        help_text="Cuándo deja de mostrarse"
    )
    
    # Estado
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name="Estado"
    )

    # Categoría temática (para el feed de Novedades)
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='general',
        verbose_name="Categoría",
        help_text="Categoría temática para el feed de Novedades"
    )

    # Especialidades objetivo (lista de strings, vacío = todas)
    target_specialties = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Especialidades Objetivo",
        help_text="Lista de especialidades médicas. Vacío = mostrar a todos."
    )

    # Métricas
    impressions = models.PositiveIntegerField(
        default=0,
        verbose_name="Impresiones",
        help_text="Número de veces que se ha mostrado"
    )
    clicks = models.PositiveIntegerField(
        default=0,
        verbose_name="Clicks",
        help_text="Número de clicks recibidos"
    )
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='advertisements_created',
        verbose_name="Creado por"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )
    
    class Meta:
        verbose_name = 'Anuncio'
        verbose_name_plural = 'Anuncios'
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['status', 'placement']),
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['client', 'status']),
        ]
    
    def __str__(self):
        return f"{self.campaign_name} - {self.client.company_name}"
    
    @property
    def is_active(self):
        """Verifica si el anuncio está activo y dentro del periodo"""
        from django.utils import timezone
        today = timezone.now().date()
        return (
            self.status == 'active' and 
            self.start_date <= today <= self.end_date
        )
    
    @property
    def ctr(self):
        """Calcula el Click-Through Rate (CTR)"""
        if self.impressions > 0:
            return (self.clicks / self.impressions) * 100
        return 0.0
    
    def increment_impressions(self):
        Advertisement.objects.filter(pk=self.pk).update(impressions=models.F('impressions') + 1)
        self.refresh_from_db(fields=['impressions'])

    def increment_clicks(self):
        Advertisement.objects.filter(pk=self.pk).update(clicks=models.F('clicks') + 1)
        self.refresh_from_db(fields=['clicks'])


# =============================================================================
# SIGNALS PARA LIMPIEZA AUTOMÁTICA DE IMÁGENES
# =============================================================================

@receiver(post_delete, sender=Advertisement)
def delete_advertisement_image_on_delete(sender, instance, **kwargs):
    """
    Elimina la imagen de Cloudinary cuando se elimina un Advertisement.
    """
    if instance.image:
        try:
            public_id = instance.image.public_id
            cloudinary.uploader.destroy(public_id)
            logger.info("Cloudinary image deleted: %s", public_id)
        except Exception as e:
            logger.warning("Failed to delete Cloudinary image: %s", e)


@receiver(pre_save, sender=Advertisement)
def delete_old_image_on_update(sender, instance, **kwargs):
    """
    Elimina la imagen antigua de Cloudinary cuando se sube una nueva.
    """
    if not instance.pk:
        return
    
    try:
        old_instance = Advertisement.objects.get(pk=instance.pk)
        
        if old_instance.image and old_instance.image != instance.image:
            try:
                public_id = old_instance.image.public_id
                cloudinary.uploader.destroy(public_id)
                logger.info("Old Cloudinary image deleted: %s", public_id)
            except Exception as e:
                logger.warning("Failed to delete old Cloudinary image: %s", e)
    except Advertisement.DoesNotExist:
        pass
    except Exception as e:
        logger.warning("Error in pre_save signal: %s", e)


@receiver(pre_save, sender=Advertisement)
def capture_previous_ad_status(sender, instance, **kwargs):
    """Guarda el estado anterior en el objeto para usarlo en post_save."""
    if instance.pk:
        try:
            instance._prev_status = Advertisement.objects.get(pk=instance.pk).status
        except Advertisement.DoesNotExist:
            instance._prev_status = None
    else:
        instance._prev_status = None


@receiver(post_save, sender=Advertisement)
def notify_users_on_advertisement_activated(sender, instance, created, **kwargs):
    """
    Envía notificación push a todos los usuarios cuando un anuncio se activa
    (creado como active, o cambia de draft/paused a active).
    """
    if instance.status != 'active':
        return

    prev_status = getattr(instance, '_prev_status', None)
    # Notificar solo si es nuevo con active, o si pasó de otro estado a active
    if not created and prev_status == 'active':
        return

    try:
        from apps.medico.models import FCMToken
        from apps.medico.services.firebase import send_push_notification

        tokens = list(FCMToken.objects.values_list('token', flat=True))
        if not tokens:
            return

        title = instance.title or instance.campaign_name
        body = instance.description or 'Mirá las novedades en MeDico'

        send_push_notification(tokens, title=title, body=body, data={'route': '/'})
        logger.info('[AD] Notificación enviada para anuncio id=%s a %d tokens', instance.pk, len(tokens))
    except Exception:
        logger.exception('[AD] Error enviando notificación para anuncio id=%s', instance.pk)
