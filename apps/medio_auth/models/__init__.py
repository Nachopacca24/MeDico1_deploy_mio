from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """
    Modelo de usuario personalizado para MeDico
    Extiende AbstractUser con campos específicos para profesionales médicos
    """
    # Información de contacto
    phone = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        verbose_name="Teléfono",
        help_text="Número de teléfono del doctor"
    )
    
    # Información profesional
    specialty = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        verbose_name="Especialidad",
        help_text="Especialidad médica (ej: Cardiología, Ortopedia)"
    )
    
    license_number = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        unique=True,
        verbose_name="Número de Colegiado",
        help_text="Número de licencia médica o colegiado"
    )
    
    hospital_default = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Hospital Principal",
        help_text="Hospital donde trabaja principalmente"
    )
    
    # Archivos del usuario
    avatar = models.ImageField(
        upload_to='avatars/',
        blank=True,
        null=True,
        verbose_name="Foto de Perfil",
        help_text="Imagen de avatar del usuario"
    )
    
    signature_image = models.ImageField(
        upload_to='signatures/',
        blank=True,
        null=True,
        verbose_name="Firma Digital",
        help_text="Imagen de la firma del doctor para documentos"
    )
    
    # Verificación y seguridad
    is_verified = models.BooleanField(
        default=False,
        verbose_name="Cuenta Verificada",
        help_text="Indica si el email del usuario ha sido verificado"
    )
    
    email_verification_token = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Token de Verificación",
        help_text="Token para verificación de email"
    )
    
    # Configuraciones personales
    theme_preference = models.CharField(
        max_length=20,
        choices=[
            ('light', 'Claro'),
            ('dark', 'Oscuro'),
            ('system', 'Sistema')
        ],
        default='system',
        verbose_name="Tema Preferido"
    )
    
    # Metadatos
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Registro"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )
    
    # Modificar email para que sea obligatorio
    email = models.EmailField(
        unique=True,
        verbose_name="Email",
        help_text="Dirección de correo electrónico"
    )
    
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['license_number']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} - {self.specialty or 'Sin especialidad'}"
    
    def get_full_name(self):
        """Devuelve el nombre completo del usuario"""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.username
    
    @property
    def is_profile_complete(self):
        """Verifica si el perfil está completo"""
        required_fields = [
            self.first_name,
            self.last_name,
            self.specialty,
            self.license_number,
            self.phone
        ]
        return all(required_fields)
