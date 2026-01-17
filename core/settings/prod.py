from .base import *

DEBUG = False

ALLOWED_HOSTS = [
    "medico1-h5lk.onrender.com",
    "me-dico1.vercel.app",
    "localhost",
    "127.0.0.1",
]

CSRF_TRUSTED_ORIGINS = [
    "https://medico1-h5lk.onrender.com",
    "https://me-dico1.vercel.app",
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

STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"
# Servir el frontend de Vite compilado
STATICFILES_DIRS = [
    BASE_DIR / 'dist',  # Frontend compilado por Vite
    BASE_DIR / 'static',
]

# Template para servir el index.html del frontend
TEMPLATES[0]['DIRS'] = [BASE_DIR / 'dist']
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
            "level": "ERROR",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "ERROR",
    },
}
