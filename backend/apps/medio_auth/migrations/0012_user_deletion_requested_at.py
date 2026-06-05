from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0011_ls_renews_at_cancelled'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='deletion_requested_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Eliminación Solicitada',
                help_text='Fecha en que el usuario solicitó eliminar su cuenta. Se elimina definitivamente a los 30 días.'
            ),
        ),
    ]
