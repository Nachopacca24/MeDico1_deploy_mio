from django.db import models
from django.conf import settings


class FCMToken(models.Model):
    PLATFORM_CHOICES = [('android', 'Android'), ('ios', 'iOS'), ('web', 'Web')]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='fcm_tokens',
    )
    token = models.TextField(unique=True)
    platform = models.CharField(max_length=10, choices=PLATFORM_CHOICES, default='android')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'FCM Token'
        verbose_name_plural = 'FCM Tokens'
        indexes = [models.Index(fields=['user'], name='medico_fcmtoken_user_idx')]

    def __str__(self):
        return f"{self.user.email} [{self.platform}]"
