def pytest_configure(config):
    import os
    # Provide stub values for env vars required by settings but not secret-sensitive in tests
    os.environ.setdefault('SECRET_KEY', 'test-secret-key-not-for-production')
    os.environ.setdefault('GOOGLE_CLIENT_ID', 'test-google-client-id')
    os.environ.setdefault('ENCRYPTION_KEY', 'test-encryption-key-32-chars-padded!!')
