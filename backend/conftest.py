def pytest_configure(config):
    import os
    # Provide stub values for env vars required by settings but not secret-sensitive in tests
    os.environ.setdefault('SECRET_KEY', 'test-secret-key-not-for-production')
    os.environ.setdefault('GOOGLE_CLIENT_ID', 'test-google-client-id')
    os.environ.setdefault('ENCRYPTION_KEY', 'test-encryption-key-32-chars-padded!!')


import pytest


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    """
    Views with an explicit throttle_classes (login/register/password-reset/etc.)
    are throttled regardless of test.py's DEFAULT_THROTTLE_CLASSES=[] override —
    that only skips throttles for views relying on the default. Django's LocMemCache
    persists across tests within one process, so several tests in the same file
    hitting the same throttled endpoint (e.g. Apple/Google login) can trip a real
    rate limit and fail with 429 for reasons unrelated to what they're testing.
    """
    from django.core.cache import cache
    cache.clear()
    yield
