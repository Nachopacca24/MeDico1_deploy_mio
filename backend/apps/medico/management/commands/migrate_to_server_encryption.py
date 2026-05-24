"""
Management command: migrate_to_server_encryption

Iterates over all SurgicalCase rows and re-encrypts any fields that are
currently stored as plaintext (legacy) with the server-side Fernet key.

Fields that start with 'e2ee:v1:' (old frontend E2EE) are left untouched —
they cannot be decrypted by the server. They will appear as raw ciphertext to
users. Since these are test data, this is acceptable.

Usage:
    python manage.py migrate_to_server_encryption [--dry-run]
"""

from django.core.management.base import BaseCommand
from apps.medico.models import SurgicalCase
from apps.medico.crypto_utils import encrypt_field, decrypt_field

_E2EE_PREFIX = 'e2ee:v1:'
# Fernet tokens are base64url — they start with 'gAA' after the version byte
_FERNET_MIN_LEN = 40  # rough minimum length for a valid Fernet token


def _is_already_server_encrypted(value: str | None) -> bool:
    """Heuristic: Fernet tokens are long base64 strings without colons."""
    if not value:
        return False
    if value.startswith(_E2EE_PREFIX):
        return False  # old frontend E2EE — not server encrypted
    if ':' in value:
        return False  # plaintext or structured data
    if len(value) < _FERNET_MIN_LEN:
        return False
    # Try to decrypt — if it works it's already server encrypted
    try:
        from cryptography.fernet import InvalidToken
        from apps.medico.crypto_utils import _get_fernet
        _get_fernet().decrypt(value.encode('ascii'))
        return True
    except Exception:
        return False


class Command(BaseCommand):
    help = 'Migrate plaintext SurgicalCase fields to server-side Fernet encryption'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without actually saving',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no changes will be saved'))

        cases = SurgicalCase.objects.all()
        total = cases.count()
        migrated = 0
        skipped_e2ee = 0
        already_encrypted = 0

        self.stdout.write(f'Processing {total} cases...')

        for case in cases.iterator():
            changed = False
            fields = {
                'patient_name': case.patient_name,
                'patient_id': case.patient_id,
                'diagnosis': case.diagnosis,
                'notes': case.notes,
                'patient_name_for_assistant': case.patient_name_for_assistant,
            }

            for field_name, value in fields.items():
                if not value:
                    continue
                if value.startswith(_E2EE_PREFIX):
                    skipped_e2ee += 1
                    continue
                if _is_already_server_encrypted(value):
                    already_encrypted += 1
                    continue
                # Plaintext — encrypt it
                if not dry_run:
                    setattr(case, field_name, encrypt_field(value))
                changed = True

            if changed:
                migrated += 1
                if not dry_run:
                    SurgicalCase.objects.filter(pk=case.pk).update(
                        patient_name=case.patient_name,
                        patient_id=case.patient_id,
                        diagnosis=case.diagnosis,
                        notes=case.notes,
                        patient_name_for_assistant=case.patient_name_for_assistant,
                    )
                else:
                    self.stdout.write(f'  Would encrypt case #{case.pk}')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Migrated: {migrated} | '
            f'Already encrypted: {already_encrypted} | '
            f'Skipped (old E2EE): {skipped_e2ee}'
        ))
        if skipped_e2ee:
            self.stdout.write(self.style.WARNING(
                f'{skipped_e2ee} fields with old frontend E2EE data were skipped. '
                'They will appear as raw ciphertext to users.'
            ))
