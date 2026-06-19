from django.db import migrations


def seed_testers_count(apps, schema_editor):
    try:
        SiteSetting = apps.get_model('medico', 'SiteSetting')
        SiteSetting.objects.get_or_create(
            key='ANDROID_TESTERS_COUNT',
            defaults={'value': '12'}
        )
    except Exception:
        pass  # table may not exist in edge-case restores; view default covers it


def unseed_testers_count(apps, schema_editor):
    try:
        SiteSetting = apps.get_model('medico', 'SiteSetting')
        SiteSetting.objects.filter(key='ANDROID_TESTERS_COUNT').delete()
    except Exception:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0033_site_setting_annual'),
    ]

    operations = [
        migrations.RunPython(seed_testers_count, unseed_testers_count),
    ]
