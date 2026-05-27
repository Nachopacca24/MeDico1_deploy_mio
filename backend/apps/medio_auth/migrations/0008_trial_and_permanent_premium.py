from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0007_plan_free_premium'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='trial_ends_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Fin del Período de Prueba',
                help_text='Fecha en que termina el período de prueba de 14 días',
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='is_permanent_premium',
            field=models.BooleanField(
                default=False,
                verbose_name='Premium Permanente',
                help_text='Si es True, el usuario mantiene Premium permanentemente sin importar el plan',
            ),
        ),
    ]
