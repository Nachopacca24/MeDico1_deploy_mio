from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']
CORS_ALLOW_ALL_ORIGINS = True

# In-memory SQLite so tests run without a Postgres server
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Speed up password hashing in tests
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

# Disable email backend to avoid sending real emails in tests
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Disable throttling in tests
REST_FRAMEWORK = {
    **globals().get('REST_FRAMEWORK', {}),
    'DEFAULT_THROTTLE_CLASSES': [],
}
