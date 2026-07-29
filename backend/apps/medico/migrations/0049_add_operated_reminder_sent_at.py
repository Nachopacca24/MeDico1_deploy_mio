from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0048_collaboratorremoval'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalcase',
            name='operated_reminder_sent_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Recordatorio de operado enviado el',
                help_text='Marca que ya se envió el recordatorio de marcar como operada',
            ),
        ),
    ]
