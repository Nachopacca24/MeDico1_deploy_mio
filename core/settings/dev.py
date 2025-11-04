from .base import *

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]']

CORS_ALLOW_ALL_ORIGINS = True

STATICFILES_DIRS = [
    BASE_DIR / 'src',
    BASE_DIR / 'public',
    BASE_DIR,
]

TEMPLATES[0]['DIRS'] = [BASE_DIR]

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
