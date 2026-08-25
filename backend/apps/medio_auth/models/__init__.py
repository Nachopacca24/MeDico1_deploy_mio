# apps/medio_auth/models/__init__.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta
import secrets
import string
import random


class CustomUser(AbstractUser):
    """
    Modelo de usuario personalizado para MeDico
    Extiende AbstractUser con campos específicos para profesionales médicos
    """
    # ROL DEL USUARIO
    ROLE_CHOICES = [
        (0, 'Admin'),
        (1, 'User'),
    ]
    
    role = models.IntegerField(
        choices=ROLE_CHOICES,
        default=1,
        verbose_name="Rol",
        help_text="Rol del usuario en el sistema (0=Admin, 1=User)"
    )
    
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
    
    # Plan de Suscripción
    PLAN_CHOICES = [
        ('free', 'Free'),
        ('premium', 'Premium'),
    ]

    plan = models.CharField(
        max_length=10,
        choices=PLAN_CHOICES,
        default='free',
        verbose_name="Plan de Suscripción",
        help_text="Plan actual del usuario"
    )

    trial_ends_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fin del Período de Prueba",
        help_text="Fecha en que termina el período de prueba de 14 días"
    )

    trial_ending_reminder_sent_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Recordatorio de fin de prueba enviado para",
        help_text="Guarda el trial_ends_at vigente cuando se mandó el email de 'tu prueba termina en 3 días' "
                   "(no el momento del envío) — así, si trial_ends_at se corre más adelante (referidos, fin de "
                   "promo), deja de coincidir y el recordatorio se vuelve a enviar automáticamente para la nueva fecha."
    )

    last_active_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Última actividad",
        help_text="Se actualiza cada vez que la app carga el perfil del usuario (GET /profile), "
                   "es decir, cada apertura de la app — no solo el login, ya que la sesión se mantiene "
                   "activa por tiempo indefinido vía refresh token."
    )
    inactivity_reminder_sent_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Último recordatorio de inactividad enviado",
        help_text="Momento en que se mandó el último push de 'volvé a la app' de la racha de inactividad "
                   "actual. Si last_active_at avanza más allá de este valor (el usuario volvió a abrir la "
                   "app), la racha se considera terminada y el conteo/escalonado arrancan de cero."
    )
    inactivity_reminder_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Recordatorios de inactividad enviados en esta racha",
        help_text="Cuántos push de inactividad lleva enviados sin que el usuario haya vuelto a abrir la "
                   "app — define el próximo intervalo (20h, luego 3 días, luego cada 5 días). Se reinicia "
                   "solo cuando el usuario vuelve a estar activo y luego vuelve a quedar inactivo."
    )

    is_permanent_premium = models.BooleanField(
        default=False,
        verbose_name="Premium Permanente",
        help_text="Si es True, el usuario mantiene Premium permanentemente sin importar el plan"
    )

    ls_subscription_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Lemon Squeezy Subscription ID",
        help_text="ID de suscripción activa en Lemon Squeezy"
    )

    ls_renews_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Próxima renovación / Vence el",
        help_text="Fecha de próxima renovación (activa) o fecha de expiración (cancelada)"
    )

    ls_cancelled = models.BooleanField(
        default=False,
        verbose_name="Suscripción cancelada",
        help_text="True si el usuario canceló pero aún tiene acceso hasta ls_renews_at"
    )

    ls_payment_overdue_since = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Vencido desde",
        help_text=(
            "Fecha desde la que la renovación del pago está vencida (pago rechazado o "
            "webhook de vencimiento perdido). Si pasan más de 3 días, se baja a Free."
        )
    )

    ls_payment_failed_downgrade = models.BooleanField(
        default=False,
        verbose_name="Bajado a Free por pago rechazado",
        help_text="True si se lo bajó a Free por falta de pago (no por cancelación manual). Se muestra en Settings."
    )

    tutorial_completed = models.BooleanField(
        default=False,
        verbose_name="Tutorial completado",
    )
    
    # Verificación de Email - CAMPOS NUEVOS
    is_email_verified = models.BooleanField(
        default=False,
        verbose_name="Email Verificado",
        help_text="Indica si el email del usuario ha sido verificado"
    )
    
    email_verification_token = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Token de Verificación de Email",
        help_text="Token único para verificar el email del usuario"
    )
    
    email_verification_sent_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de Envío del Token",
        help_text="Fecha y hora en que se envió el último token de verificación"
    )
    
    # Verificación general (mantener para compatibilidad)
    is_verified = models.BooleanField(
        default=False,
        verbose_name="Cuenta Verificada por Admin",
        help_text="Indica si la cuenta ha sido verificada por un administrador"
    )

    # Eliminación programada
    deletion_requested_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Eliminación Solicitada",
        help_text="Fecha en que el usuario solicitó eliminar su cuenta. Se elimina definitivamente a los 30 días."
    )

    # Anti-abuso: trial gratuito
    had_trial = models.BooleanField(
        default=False,
        verbose_name="Ya usó prueba gratuita",
        help_text="True si este email ya activó el período de prueba de 14 días. Impide obtener otro trial al re-registrarse."
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

    surgery_reminder_hours = models.PositiveIntegerField(
        default=2,
        verbose_name="Horas de recordatorio de cirugía",
        help_text="Horas antes de la cirugía para enviar recordatorio push"
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
    
    # Email obligatorio y único
    email = models.EmailField(
        unique=True,
        verbose_name="Email",
        help_text="Dirección de correo electrónico"
    )
    
    # Código de amistad único para compartir
    friend_code = models.CharField(
        max_length=8,
        unique=True,
        blank=True,
        null=True,
        verbose_name="Código de Colega",
        help_text="Código único para compartir con otros médicos"
    )

    # Referidos
    referred_by = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='referrals',
        verbose_name="Referido por",
    )
    
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['license_number']),
            models.Index(fields=['created_at']),
            models.Index(fields=['email_verification_token']),
            models.Index(fields=['friend_code']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} - {self.specialty or 'Sin especialidad'}"
    
    def get_full_name(self):
        """Devuelve el nombre completo del usuario"""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.username
    
    # Password Reset
    password_reset_token = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Token de Reseteo de Contraseña",
    )
    password_reset_sent_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de Envío del Token de Reset",
    )

    receives_announcements = models.BooleanField(
        default=True,
        verbose_name="Recibe novedades y anuncios",
        help_text="Push promocionales (Anuncios del sistema, publicidad de clientes plan oro) — ver "
                   "apps/communication/services/promo_push.py. Solo un usuario con acceso Premium puede "
                   "desactivarlo — se valida en el serializer, no solo en el frontend. Totalmente "
                   "independiente de receives_reminders: son dos canales distintos."
    )
    receives_reminders = models.BooleanField(
        default=True,
        verbose_name="Recibe recordatorios y solicitudes",
        help_text="Push de cirugías próximas, casos marcados como operados, invitaciones de colegas/"
                   "casos sin responder, y acciones del equipo en un caso — todo lo que pasa por "
                   "notify_user/notify_team (apps/medico/services/firebase.py). Libre para cualquier "
                   "plan, a diferencia de receives_announcements."
    )

    credit_days = models.IntegerField(
        default=0,
        verbose_name="Días de crédito acumulados",
        help_text="Días Premium ganados por referidos; se aplican al terminar la promo FREE_FOR_ALL"
    )

    apple_user_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True,
        verbose_name="Apple User ID",
        help_text="Identificador único de Apple (sub) para Sign in with Apple"
    )

    @property
    def has_premium_access(self):
        """Effective premium access: real premium/permanent, or the site-wide free promo is on."""
        if self.plan == 'premium' or self.is_permanent_premium:
            return True
        from apps.medico.models.site_setting import SiteSetting
        return SiteSetting.get('FREE_FOR_ALL_PREMIUM', '0') == '1'

    def grant_bonus_days(self, days):
        """
        Stack `days` of bonus onto trial_ends_at. For paying subscribers, anchor the
        bonus after their subscription ends (ls_renews_at) so it isn't lost while the
        sub is still active. Promotes free (non-cancelled) users to premium.
        """
        reference = self.ls_renews_at or timezone.now()
        base = max(self.trial_ends_at or reference, reference)
        self.trial_ends_at = base + timedelta(days=days)
        if self.plan == 'free' and not self.ls_cancelled:
            self.plan = 'premium'

    @classmethod
    def grant_bonus_to_all(cls, days):
        """Stack `days` of bonus onto every active non-permanent-premium user. Returns the count updated."""
        users = list(cls.objects.filter(is_active=True).exclude(is_permanent_premium=True))
        for user in users:
            user.grant_bonus_days(days)
        cls.objects.bulk_update(users, ['trial_ends_at', 'plan'])
        return len(users)

    @classmethod
    def apply_credits_on_promo_end(cls, default_days=30):
        """When FREE_FOR_ALL deactivates: apply default_days + each user's credit_days as trial. Returns count updated."""
        now = timezone.now()
        users = list(cls.objects.filter(is_active=True).exclude(is_permanent_premium=True))
        for user in users:
            total_days = default_days + (user.credit_days or 0)
            reference = user.ls_renews_at or now
            base = max(user.trial_ends_at or reference, reference)
            user.trial_ends_at = base + timedelta(days=total_days)
            if user.plan == 'free' and not user.ls_cancelled:
                user.plan = 'premium'
            # Zero it out — otherwise a later promo cycle (off -> on -> off again)
            # would re-apply these same already-spent days a second time.
            user.credit_days = 0
        cls.objects.bulk_update(users, ['trial_ends_at', 'plan', 'credit_days'])
        return len(users)

    def check_trial_expiry(self):
        """If trial has expired and plan is still premium (from trial), revert to free."""
        if (
            not self.is_permanent_premium
            and self.trial_ends_at
            and timezone.now() > self.trial_ends_at
            and self.plan == 'premium'
            and not self.ls_subscription_id  # never downgrade a paying subscriber
        ):
            self.plan = 'free'
            self.trial_ends_at = None
            self.__class__.objects.filter(pk=self.pk).update(plan='free', trial_ends_at=None)

    def generate_verification_token(self):
        """
        Genera un token único para verificación de email.
        Retorna el token generado.
        """
        import hashlib
        raw_token = secrets.token_urlsafe(32)
        self.email_verification_token = hashlib.sha256(raw_token.encode()).hexdigest()
        self.email_verification_sent_at = timezone.now()
        self.save()
        return raw_token
    
    def save(self, *args, **kwargs):
        # Normalize so login/password-reset lookups (which match case-sensitively
        # at the DB level) always find the account regardless of how the email
        # was capitalized when typed/autocapitalized — a mismatch here used to
        # mean a permanently unrecoverable account (no password-reset email ever
        # matched). Lookups additionally use __iexact as a second layer for rows
        # written before this normalization existed.
        if self.email:
            self.email = self.email.strip().lower()
        if not self.friend_code:
            self.friend_code = self._generate_unique_friend_code()
        while True:
            try:
                super().save(*args, **kwargs)
                return
            except Exception as e:
                from django.db import IntegrityError
                if isinstance(e, IntegrityError) and self.__class__.objects.filter(friend_code=self.friend_code).exists():
                    self.friend_code = self._generate_unique_friend_code()
                else:
                    raise
    
    @staticmethod
    def _generate_unique_friend_code():
        """Genera un código único de 8 caracteres"""
        while True:
            # Formato: 4 letras + 2 números + 2 letras (ej: ABCD12XY)
            code = (
                ''.join(random.choices(string.ascii_uppercase, k=4)) +
                ''.join(random.choices(string.digits, k=2)) +
                ''.join(random.choices(string.ascii_uppercase, k=2))
            )
            
            # Verificar que no exista
            if not CustomUser.objects.filter(friend_code=code).exists():
                return code
    
    def generate_friend_code(self):
        """
        Genera un código único de 8 caracteres para compartir con colegas.
        Formato: ABC12XYZ (4 letras + 2 números + 2 letras mayúsculas)
        """
        while True:
            # Generar código: 4 letras + 2 números + 2 letras
            letters1 = ''.join(random.choices(string.ascii_uppercase, k=4))
            numbers = ''.join(random.choices(string.digits, k=2))
            letters2 = ''.join(random.choices(string.ascii_uppercase, k=2))
            code = f"{letters1}{numbers}{letters2}"
            
            # Verificar que no exista
            if not CustomUser.objects.filter(friend_code=code).exists():
                self.friend_code = code
                self.save()
                return code
    
    def generate_password_reset_token(self):
        import hashlib
        raw_token = secrets.token_urlsafe(32)
        self.password_reset_token = hashlib.sha256(raw_token.encode()).hexdigest()
        self.password_reset_sent_at = timezone.now()
        self.save(update_fields=['password_reset_token', 'password_reset_sent_at'])
        return raw_token

    def clear_password_reset_token(self):
        self.password_reset_token = None
        self.password_reset_sent_at = None
        self.save(update_fields=['password_reset_token', 'password_reset_sent_at'])

    def clear_verification_token(self):
        """Limpia el token de verificación después de usarlo"""
        self.email_verification_token = None
        self.email_verification_sent_at = None
        self.save()
    
    @property
    def is_profile_complete(self):
        """Verifica si el perfil está completo"""
        required_fields = [
            self.first_name,
            self.last_name,
            self.specialty,
        ]
        return all(required_fields)
    
    @property
    def is_admin(self):
        """Verifica si el usuario es administrador"""
        return self.role == 0 or self.is_staff or self.is_superuser
    
    @property
    def role_name(self):
        """Devuelve el nombre del rol"""
        return dict(self.ROLE_CHOICES).get(self.role, 'Unknown')
    
    @property
    def verification_status(self):
        """Retorna el estado completo de verificación del usuario"""
        return {
            'email_verified': self.is_email_verified,
            'account_verified': self.is_verified,
            'profile_complete': self.is_profile_complete
        }


# ============================================
# MODELOS DE AMISTAD/COLEGAS
# ============================================

class Friendship(models.Model):
    """
    Modelo para relaciones de amistad entre usuarios (colegas).
    Relación bidireccional: si A es amigo de B, entonces B es amigo de A.
    """
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='friendships',
        verbose_name="Usuario"
    )
    
    friend = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='friends_of',
        verbose_name="Colega"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Amistad"
    )
    
    class Meta:
        verbose_name = 'Amistad'
        verbose_name_plural = 'Amistades'
        unique_together = ('user', 'friend')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'friend']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.friend.get_full_name()}"
    
    def save(self, *args, **kwargs):
        # Validar que no se agregue a sí mismo
        if self.user == self.friend:
            raise ValueError("No puedes agregarte a ti mismo como colega")
        
        # Asegurar orden consistente para evitar duplicados (user_id menor primero)
        if self.user.id > self.friend.id:
            self.user, self.friend = self.friend, self.user
        
        super().save(*args, **kwargs)


class FriendRequest(models.Model):
    """
    Modelo para solicitudes de amistad entre usuarios.
    """
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('accepted', 'Aceptada'),
        ('rejected', 'Rechazada'),
    ]
    
    from_user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='sent_friend_requests',
        verbose_name="De Usuario"
    )
    
    to_user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='received_friend_requests',
        verbose_name="Para Usuario"
    )
    
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Estado"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Solicitud"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )
    
    class Meta:
        verbose_name = 'Solicitud de Amistad'
        verbose_name_plural = 'Solicitudes de Amistad'
        unique_together = ('from_user', 'to_user')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['from_user', 'to_user']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.from_user.get_full_name()} -> {self.to_user.get_full_name()} ({self.status})"
    
    def save(self, *args, **kwargs):
        # Validar que no se envíe solicitud a sí mismo
        if self.from_user == self.to_user:
            raise ValueError("No puedes enviarte una solicitud a ti mismo")
        
        super().save(*args, **kwargs)