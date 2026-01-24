# core/settings/base.py - VERSIÓN COMPLETA ACTUALIZADA
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta
import environ
import cloudinary
import cloudinary.uploader
import cloudinary.api

load_dotenv()

env = environ.Env()
BASE_DIR = Path(__file__).resolve().parent.parent.parent
environ.Env.read_env(BASE_DIR / '.env')

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-change-this-in-production')

DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = [
    "medico1-h5lk.onrender.com",
    "me-dico1.vercel.app",
    "me-dico-1--josepaccagnella.replit.app",
    "8000-me-dico-1--josepaccagnella.replit.app",
    ".replit.app",
    ".replit.dev",
    "localhost",
    "127.0.0.1",
]

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
    'corsheaders.middleware.CorsMiddleware',
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
        'NAME': env('PGDATABASE', default='heliumdb'),
        'USER': env('PGUSER', default='postgres'),
        'PASSWORD': env('PGPASSWORD', default='password'),
        'HOST': env('PGHOST', default='helium'),
        'PORT': env('PGPORT', default='5432'),
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
# ARCHIVOS ESTÁTICOS
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

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
MEDIA_URL = '/media/'

# ============================================
# GOOGLE CALENDAR OAUTH CONFIGURATION
# ============================================
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')

# Detectar entorno
if DEBUG:
    # Desarrollo en Replit
    BASE_DOMAIN = os.environ.get('REPLIT_DEV_DOMAIN', 'me-dico-1--josepaccagnella.replit.app')
    FRONTEND_URL = f'https://{BASE_DOMAIN}'
    GOOGLE_REDIRECT_URI = f"https://{BASE_DOMAIN}/api/medico/google-calendar/callback/"
else:
    # Producción
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://me-dico1.vercel.app')
    GOOGLE_REDIRECT_URI = 'https://medico1-h5lk.onrender.com/api/medico/google-calendar/callback/'

# ============================================
# SESSION CONFIGURATION (necesario para OAuth)
# ============================================
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 1209600  # 2 semanas
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# ============================================
# REST FRAMEWORK
# ============================================
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
}

# ============================================
# SIMPLE JWT
# ============================================
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
# EMAIL CONFIGURATION
# ============================================
if DEBUG:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'MéDico1 <noreply@medico1.com>')
SERVER_EMAIL = DEFAULT_FROM_EMAIL
EMAIL_TIMEOUT = 10

# ============================================
# AUTHENTICATION BACKENDS
# ============================================
AUTHENTICATION_BACKENDS = [
    'apps.medio_auth.backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# ============================================
# CORS CONFIGURATION
# ============================================
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "https://me-dico1.vercel.app",
    "https://medico1-h5lk.onrender.com",
    "https://me-dico-1--josepaccagnella.replit.app",
    "https://8000-me-dico-1--josepaccagnella.replit.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "https://medico1-h5lk.onrender.com",
    "https://me-dico1.vercel.app",
    "https://me-dico-1--josepaccagnella.replit.app",
    "https://8000-me-dico-1--josepaccagnella.replit.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = False

# ============================================
# FILE UPLOAD SETTINGS
# ============================================
DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'