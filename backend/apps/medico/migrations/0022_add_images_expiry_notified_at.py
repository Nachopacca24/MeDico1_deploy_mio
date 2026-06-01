from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0021_backfill_images_purge_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalcase',
            name='images_expiry_notified_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Notificación de expiración enviada el',
            ),
        ),
    ]
