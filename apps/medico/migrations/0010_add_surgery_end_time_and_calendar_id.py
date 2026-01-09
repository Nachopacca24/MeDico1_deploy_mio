# medico_backend/surgeries/migrations/XXXX_add_surgery_end_time_and_calendar_id.py

from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0009_surgicalcase_assistant_accepted_and_more'),  # Django lo pone automáticamente
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalcase',
            name='surgery_end_time',
            field=models.TimeField(null=True, blank=True, verbose_name='Hora de fin de cirugía'),
        ),
        migrations.AddField(
            model_name='surgicalcase',
            name='calendar_event_id',
            field=models.CharField(max_length=255, null=True, blank=True, verbose_name='ID del evento en Google Calendar'),
        ),
    ]