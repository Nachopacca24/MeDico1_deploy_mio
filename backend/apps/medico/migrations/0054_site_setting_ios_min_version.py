from django.db import migrations


def seed_min_version(apps, schema_editor):
    try:
        SiteSetting = apps.get_model('medico', 'SiteSetting')
        SiteSetting.objects.get_or_create(
            key='IOS_MIN_VERSION',
            defaults={'value': '1.0'}
        )
    except Exception:
        pass


def unseed_min_version(apps, schema_editor):
    try:
        SiteSetting = apps.get_model('medico', 'SiteSetting')
        SiteSetting.objects.filter(key='IOS_MIN_VERSION').delete()
    except Exception:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0053_surgicalcase_anesthesiologist_notified_at'),
    ]

    operations = [
        migrations.RunPython(seed_min_version, unseed_min_version),
    ]
