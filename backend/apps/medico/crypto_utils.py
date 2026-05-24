# apps/medico/crypto_utils.py
"""
Server-side field encryption using Fernet (AES-128-CBC + HMAC-SHA256).
The ENCRYPTION_KEY env var must be a 32-byte URL-safe base64 string
(generate once with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
"""

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

_fernet: Fernet | None = None

# E2EE prefix written by the old frontend code — kept so we can detect and skip it
_E2EE_PREFIX = 'e2ee:v1:'


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = getattr(settings, 'ENCRYPTION_KEY', None)
        if not key:
            raise ValueError(
                "ENCRYPTION_KEY is not configured. "
                "Add it to your environment variables and settings."
            )
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_field(value: str | None) -> str | None:
    """Encrypt a plaintext string. Returns None/empty unchanged."""
    if not value:
        return value
    return _get_fernet().encrypt(value.encode('utf-8')).decode('ascii')


def decrypt_field(value: str | None) -> str | None:
    """
    Decrypt a server-encrypted string.
    - Legacy plaintext (no prefix) → returned as-is
    - Old E2EE frontend data (e2ee:v1: prefix) → returned as-is (unreadable, expected)
    - Valid Fernet token → decrypted and returned
    """
    if not value:
        return value
    if value.startswith(_E2EE_PREFIX):
        return value  # old E2EE data — can't decrypt, return raw
    try:
        return _get_fernet().decrypt(value.encode('ascii')).decode('utf-8')
    except (InvalidToken, Exception):
        return value  # plaintext or unrecognised format — return as-is
