from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0041_surgeon_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalcase',
            name='anesthesiologist_calendar_event_id',
            field=models.CharField(
                blank=True,
                help_text='ID del evento del anestesiólogo invitado sincronizado con Google Calendar',
                max_length=255,
                null=True,
                verbose_name='ID del Evento del Anestesiólogo en Google Calendar',
            ),
        ),
    ]
