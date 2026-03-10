from django.apps import AppConfig
import os
from django.conf import settings

class AdvertisingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.advertising'
    
    def ready(self):
        # Crear carpeta de advertisements al iniciar
        ads_path = os.path.join(settings.MEDIA_ROOT, 'advertisements')
        os.makedirs(ads_path, exist_ok=True)
