from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0010_add_ls_subscription_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='ls_renews_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Próxima renovación / Vence el',
                help_text='Fecha de próxima renovación (activa) o fecha de expiración (cancelada)',
            ),
        ),
        migrations.AddField(
            model_name='customuser',
            name='ls_cancelled',
            field=models.BooleanField(
                default=False,
                verbose_name='Suscripción cancelada',
                help_text='True si el usuario canceló pero aún tiene acceso hasta ls_renews_at',
            ),
        ),
    ]
