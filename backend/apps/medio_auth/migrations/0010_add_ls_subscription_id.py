from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0009_backfill_trial'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='ls_subscription_id',
            field=models.CharField(
                max_length=50,
                blank=True,
                null=True,
                verbose_name='Lemon Squeezy Subscription ID',
                help_text='ID de suscripción activa en Lemon Squeezy',
            ),
        ),
    ]
