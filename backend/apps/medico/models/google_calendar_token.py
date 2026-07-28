from django.db import models
from django.conf import settings
from apps.medico.crypto_utils import encrypt_field, decrypt_field


class GoogleCalendarToken(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='google_calendar_token',
        verbose_name='Usuario',
    )
    # Fernet-encrypted; never expose raw values outside this model
    _encrypted_refresh_token = models.TextField(
        db_column='encrypted_refresh_token',
        verbose_name='Refresh Token (cifrado)',
    )
    _encrypted_access_token = models.TextField(
        db_column='encrypted_access_token',
        blank=True,
        default='',
        verbose_name='Access Token (cifrado)',
    )
    token_expiry = models.DateTimeField(verbose_name='Expiración del Access Token')
    google_email = models.EmailField(blank=True, default='', verbose_name='Email de Google')
    calendar_color_id = models.CharField(
        max_length=2, blank=True, default='',
        verbose_name='Color de eventos (colorId Google Calendar)',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Token de Google Calendar'
        verbose_name_plural = 'Tokens de Google Calendar'

    def __str__(self):
        return f'{self.user} → {self.google_email}'

    def set_refresh_token(self, value: str) -> None:
        self._encrypted_refresh_token = encrypt_field(value) or ''

    def get_refresh_token(self) -> str | None:
        return decrypt_field(self._encrypted_refresh_token)

    def set_access_token(self, value: str) -> None:
        self._encrypted_access_token = encrypt_field(value) or ''

    def get_access_token(self) -> str | None:
        return decrypt_field(self._encrypted_access_token)
