import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta
import environ
import cloudinary
import cloudinary.uploader
import cloudinary.api
import sentry_sdk

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR.parent / '.env', override=True, encoding='utf-8')

env = environ.Env()
environ.Env.read_env(BASE_DIR.parent / '.env', overwrite=False)


SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    _is_debug = os.environ.get('DEBUG', 'False') == 'True'
    if _is_debug:
        SECRET_KEY = 'django-insecure-local-dev-only-not-for-production'
    else:
        from django.core.exceptions import ImproperlyConfigured
        raise ImproperlyConfigured('DJANGO_SECRET_KEY must be set in production.')

DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.environ.get(
    'DJANGO_ALLOWED_HOSTS', 
    'medico1-h5lk.onrender.com,me-dico1.vercel.app,localhost,127.0.0.1'
).split(',')


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third Party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',

    # Cloudinary - DEBE IR ANTES de staticfiles
    'cloudinary_storage',
    'cloudinary',

    # Local Apps
    'apps.medico.apps.MedicoConfig',
    'apps.medio_auth.apps.MedioAuthConfig',
    'apps.communication.apps.CommunicationConfig',
    'apps.invoice.apps.InvoiceConfig',
    'apps.payment.apps.PaymentConfig',
    'apps.advertising.apps.AdvertisingConfig',
    'django_extensions',
]


MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',

    # CORS
    'corsheaders.middleware.CorsMiddleware',

    # Custom
    'core.middleware.ViteDevMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'core.middleware.DisableCSRFForAPIMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'


TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'apps' / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'medico'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}


AUTH_USER_MODEL = 'medio_auth.CustomUser'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


LANGUAGE_CODE = 'es-gt'
TIME_ZONE = 'America/Guatemala'
USE_I18N = True
USE_TZ = True


# ============================================
# ARCHIVOS ESTÁTICOS (CSS, JavaScript, Images)
# ============================================
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# ============================================
# CLOUDINARY CONFIGURATION
# ============================================
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.environ.get('CLOUDINARY_CLOUD_NAME'),
    'API_KEY': os.environ.get('CLOUDINARY_API_KEY'),
    'API_SECRET': os.environ.get('CLOUDINARY_API_SECRET'),
}

cloudinary.config(
    cloud_name=CLOUDINARY_STORAGE['CLOUD_NAME'],
    api_key=CLOUDINARY_STORAGE['API_KEY'],
    api_secret=CLOUDINARY_STORAGE['API_SECRET'],
    secure=True
)

# USAR CLOUDINARY PARA ARCHIVOS MEDIA
DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# MEDIA_URL - Cloudinary manejará las URLs automáticamente
MEDIA_URL = '/media/'

# ============================================
# FIN CLOUDINARY CONFIGURATION
# ============================================

# ============================================
# CIFRADO DE CAMPOS SENSIBLES (server-side)
# ============================================
# Generar con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', '')

# ============================================
# GOOGLE CALENDAR CONFIGURATION
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
# The domain must match what's configured in Google Cloud Console
# In Replit, this is usually the project domain
BASE_DOMAIN = os.environ.get('REPLIT_DEV_DOMAIN', 'me-dico-1--josepaccagnella.replit.app')
GOOGLE_REDIRECT_URI = f"https://{BASE_DOMAIN}/api/auth/google/callback"


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/day',
        'user': '10000/day',
        'login': '5/min',
        'register': '10/hour',
        'ad_tracking': '60/hour',
        'password_reset': '3/hour',
    },
}

# Configuración de Simple JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
}

# ============================================
# CONFIGURACIÓN DE EMAIL (Zoho Mail SMTP)
# ============================================

# Usar SMTP si hay credenciales Zoho configuradas; si no, consola (dev local)
if os.environ.get('ZOHO_EMAIL') or os.environ.get('EMAIL_HOST_USER'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Zoho SMTP — credenciales vía ZOHO_EMAIL / ZOHO_PASSWORD
# Puerto 465 + SSL para Railway (587/STARTTLS suele estar bloqueado en PaaS)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.zoho.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '465'))
EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'True') == 'True'
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'False') == 'True'
EMAIL_HOST_USER = os.environ.get('ZOHO_EMAIL', os.environ.get('EMAIL_HOST_USER', ''))
EMAIL_HOST_PASSWORD = os.environ.get('ZOHO_PASSWORD', os.environ.get('EMAIL_HOST_PASSWORD', ''))
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'MéDico <contacto@medicoapp.app>')
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Timeout para envío de emails
EMAIL_TIMEOUT = 15

# URL del frontend para enlaces de verificación
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# ============================================
# FIN CONFIGURACIÓN DE EMAIL
# ============================================

# Backend de autenticación personalizado
AUTHENTICATION_BACKENDS = [
    'apps.medio_auth.backends.EmailBackend',  # Email authentication
    'django.contrib.auth.backends.ModelBackend',  # Username authentication (fallback)
]


CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = os.environ.get(
    'DJANGO_CORS_ORIGINS', 
    'https://me-dico1.vercel.app,https://medico1-h5lk.onrender.com,http://localhost:5173,http://127.0.0.1:5173'
).split(',')

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = os.environ.get(
    'DJANGO_CSRF_TRUSTED_ORIGINS', 
    'https://me-dico1.vercel.app,https://medico1-h5lk.onrender.com,http://localhost:5173,http://127.0.0.1:5173'
).split(',')

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'sentry-trace',
    'baggage',
]

CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False

# Tamaño máximo de archivo subido (20MB)
DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024

SENTRY_DSN = os.environ.get('SENTRY_DSN')
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        # Add data like request headers and IP for users
        send_default_pii=True,
        environment=os.environ.get('NODE_ENV', 'development'),
    )