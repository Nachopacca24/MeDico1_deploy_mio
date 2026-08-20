# core/settings/dev.py
from .base import *
import os
import dj_database_url

DEBUG = True
ALLOWED_HOSTS = ['*']
CORS_ALLOW_ALL_ORIGINS = True

# Append to existing CSRF_TRUSTED_ORIGINS from base.py
CSRF_TRUSTED_ORIGINS += [
    'https://*.replit.dev',
    'https://*.repl.co',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
]

if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.parse(os.environ.get('DATABASE_URL'))
    }

STATICFILES_DIRS = [
    BASE_DIR.parent / 'frontend' / 'src',
    BASE_DIR.parent / 'frontend' / 'public',
    BASE_DIR.parent / 'frontend',
]

TEMPLATES[0]['DIRS'] = [BASE_DIR.parent / 'frontend']

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

# ============================================
# DJANGO REST FRAMEWORK
# ============================================
# Extends base.py's REST_FRAMEWORK rather than replacing it — a full replace
# here previously dropped DEFAULT_PAGINATION_CLASS/PAGE_SIZE/DEFAULT_FILTER_BACKENDS
# entirely and, worse, silently deleted 5 of the 10 throttle scopes
# (login_email, password_reset_email, colleague_search, token_refresh,
# webhook) that views actually reference via throttle_classes — any request
# to /api/auth/login/ or /api/auth/forgot-password/ under dev settings
# crashed with ImproperlyConfigured instead of a normal response.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_THROTTLE_RATES': {
        **REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'],
        'anon': '10000/day',
        'user': '100000/day',
        'login': '20/min',
        'register': '50/hour',
        'ad_tracking': '500/hour',
        'password_reset': '20/hour',
    },
}

# ============================================
# SIMPLE JWT
# ============================================
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
}

# ============================================
# CLOUDINARY - Ya está configurado en base.py
# Las credenciales vienen de las variables de entorno
# ============================================