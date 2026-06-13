from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0030_notifications'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalcase',
            name='assistant_calendar_event_id',
            field=models.CharField(
                blank=True,
                help_text='ID del evento del ayudante sincronizado con Google Calendar',
                max_length=255,
                null=True,
                verbose_name='ID del Evento del Ayudante en Google Calendar',
            ),
        ),
    ]
