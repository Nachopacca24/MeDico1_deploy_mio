from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0014_surgery_reminder_hours'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='had_trial',
            field=models.BooleanField(
                default=False,
                verbose_name='Ya usó prueba gratuita',
                help_text='True si este email ya activó el período de prueba de 14 días. Impide obtener otro trial al re-registrarse.',
            ),
        ),
    ]
