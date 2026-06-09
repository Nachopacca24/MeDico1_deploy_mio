from django.db import models


class SystemNews(models.Model):
    title = models.CharField(max_length=200, verbose_name="Título")
    body = models.TextField(verbose_name="Cuerpo")
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Enviado el",
        help_text="Fecha en que se enviaron las notificaciones push"
    )

    class Meta:
        verbose_name = 'Novedad del sistema'
        verbose_name_plural = 'Novedades del sistema'
        ordering = ['-created_at']

    def __str__(self):
        return self.title
