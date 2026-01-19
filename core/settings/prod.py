import dj_database_url
import os

from .base import *

DEBUG = False

ALLOWED_HOSTS = ['*']

CSRF_TRUSTED_ORIGINS = [
    'https://*.replit.app',
    'https://*.replit.dev',
]

if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.parse(os.environ.get('DATABASE_URL'))
    }



# Backend de autenticación personalizado
AUTHENTICATION_BACKENDS = [
    'apps.medio_auth.backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]


SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"


# Servir el frontend de Vite compilado
STATICFILES_DIRS = [
    BASE_DIR / 'dist',
    BASE_DIR / 'static',
]

# Template para servir el index.html del frontend
TEMPLATES[0]['DIRS'] = [BASE_DIR / 'dist']

# WhiteNoise para servir archivos estáticos
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
WHITENOISE_ROOT = BASE_DIR / 'dist'
WHITENOISE_INDEX_FILE = True



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
            "level": "DEBUG",  # ← Cambiar de ERROR a DEBUG
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG",  # ← Cambiar de ERROR a DEBUG
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
