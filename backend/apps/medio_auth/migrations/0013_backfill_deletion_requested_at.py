"""
Retroalimenta deletion_requested_at para usuarios que quedaron inactivos
sin fecha de solicitud (pidieron eliminación antes de que el campo existiera).
"""
from django.db import migrations
from django.utils import timezone


def backfill_deletion_date(apps, schema_editor):
    User = apps.get_model('medio_auth', 'CustomUser')
    User.objects.filter(
        is_active=False,
        deletion_requested_at__isnull=True,
        is_superuser=False,
        is_staff=False,
    ).update(deletion_requested_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0012_user_deletion_requested_at'),
    ]

    operations = [
        migrations.RunPython(backfill_deletion_date, migrations.RunPython.noop),
    ]
