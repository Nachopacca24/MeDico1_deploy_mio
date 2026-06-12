# core/settings/prod.py
import dj_database_url
import os
from .base import *

DEBUG = False
ALLOWED_HOSTS = os.environ.get(
    'DJANGO_ALLOWED_HOSTS',
    'medico1deploymio-production.up.railway.app,medicoapp.app,localhost,127.0.0.1'
).split(',')

# Append to existing CSRF_TRUSTED_ORIGINS from base.py
CSRF_TRUSTED_ORIGINS += [
    'https://medicoapp.app',
    'https://medico1deploymio-production.up.railway.app',
    'https://*.replit.app',
    'https://*.replit.dev',
]

# Append production origins to CORS (Capacitor origins already added in base.py)
CORS_ALLOWED_ORIGINS = list(set(CORS_ALLOWED_ORIGINS + [
    'https://medicoapp.app',
    'https://medico1deploymio-production.up.railway.app',
]))

if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.parse(os.environ.get('DATABASE_URL'))
    }

# Backend de autenticación personalizado
AUTHENTICATION_BACKENDS = [
    'apps.medio_auth.backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# Render/Vercel terminan SSL en el proxy — no redirigir desde Django para evitar loops.
SECURE_SSL_REDIRECT = False
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Validar variables críticas de entorno al arrancar
def _require_env(name: str) -> str:
    val = os.environ.get(name, '')
    if not val:
        raise ImproperlyConfigured(f'Variable de entorno requerida en producción: {name}')
    return val

from django.core.exceptions import ImproperlyConfigured
_require_env('DJANGO_SECRET_KEY')
_require_env('DATABASE_URL')
_require_env('ENCRYPTION_KEY')
_require_env('LEMONSQUEEZY_API_KEY')
_require_env('LEMONSQUEEZY_WEBHOOK_SECRET')

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# Servir el frontend de Vite compilado
_FRONTEND_DIST = BASE_DIR.parent / 'frontend' / 'dist'
_STATIC_DIR = BASE_DIR / 'static'
STATICFILES_DIRS = [d for d in [_FRONTEND_DIST, _STATIC_DIR] if d.exists()]

# Template dirs — only include if they exist
TEMPLATES[0]['DIRS'] = [d for d in [_FRONTEND_DIST] if d.exists()]

# WhiteNoise para servir archivos estáticos
MIDDLEWARE.insert(2, 'whitenoise.middleware.WhiteNoiseMiddleware')

WHITENOISE_ROOT = str(_FRONTEND_DIST) if _FRONTEND_DIST.exists() else None
WHITENOISE_INDEX_FILE = True
WHITENOISE_MANIFEST_STRICT = False

# ============================================
# CLOUDINARY - Ya está configurado en base.py
# NO necesitamos servir media files con WhiteNoise
# Cloudinary maneja TODO automáticamente
# ============================================

DEBUG_PROPAGATE_EXCEPTION = False

# LOGGING DETALLADO PARA PRODUCCIÓN
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
    },
}