from datetime import timedelta

from django.db import migrations
from django.utils import timezone


def backfill_images_purge_at(apps, schema_editor):
    SurgicalCase = apps.get_model('medico', 'SurgicalCase')
    purge_at = timezone.now() + timedelta(days=90)
    SurgicalCase.objects.filter(is_paid=True, images_purge_at__isnull=True).update(
        images_purge_at=purge_at
    )


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0020_add_images_purge_at'),
    ]

    operations = [
        migrations.RunPython(backfill_images_purge_at, migrations.RunPython.noop),
    ]
