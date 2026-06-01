from django.db import migrations


def cleanup_images_purge_at(apps, schema_editor):
    """Nullify images_purge_at for cobrado cases that have no images."""
    SurgicalCase = apps.get_model('medico', 'SurgicalCase')
    SurgicalCase.objects.filter(
        is_paid=True,
        images_purge_at__isnull=False,
        images__isnull=True,
    ).update(images_purge_at=None)


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0022_add_images_expiry_notified_at'),
    ]

    operations = [
        migrations.RunPython(cleanup_images_purge_at, migrations.RunPython.noop),
    ]
