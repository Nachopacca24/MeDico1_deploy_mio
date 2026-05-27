from django.db import migrations
from django.utils import timezone
from datetime import timedelta


def backfill_trial(apps, schema_editor):
    """Give all existing users without a trial a 14-day premium trial from now."""
    User = apps.get_model('medio_auth', 'CustomUser')
    trial_end = timezone.now() + timedelta(days=14)
    User.objects.filter(
        trial_ends_at__isnull=True,
        is_permanent_premium=False,
    ).update(
        trial_ends_at=trial_end,
        plan='premium',
    )


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0008_trial_and_permanent_premium'),
    ]

    operations = [
        migrations.RunPython(backfill_trial, migrations.RunPython.noop),
    ]
