from django.contrib.auth.models import AbstractUser
from django.db import models

# Ejemplo de modelo de usuario personalizado
# class CustomUser(AbstractUser):
#     phone = models.CharField(max_length=20, blank=True, null=True)
#     specialty = models.CharField(max_length=100, blank=True, null=True)
#     license_number = models.CharField(max_length=50, blank=True, null=True)
#     
#     class Meta:
#         verbose_name = 'Usuario'
#         verbose_name_plural = 'Usuarios'
