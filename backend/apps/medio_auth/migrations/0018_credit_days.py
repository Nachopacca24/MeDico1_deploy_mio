from django.db import migrations, models


def cleanup_trial_data(apps, schema_editor):
    """Clear trial_ends_at and reset plan for users without a real subscription."""
    CustomUser = apps.get_model('medio_auth', 'CustomUser')
    CustomUser.objects.filter(
        is_permanent_premium=False,
        ls_subscription_id__isnull=True,
    ).update(trial_ends_at=None, plan='free')


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0017_referred_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='credit_days',
            field=models.IntegerField(
                default=0,
                help_text='Días Premium ganados por referidos; se aplican al terminar la promo FREE_FOR_ALL',
                verbose_name='Días de crédito acumulados',
            ),
        ),
        migrations.RunPython(cleanup_trial_data, migrations.RunPython.noop),
    ]
