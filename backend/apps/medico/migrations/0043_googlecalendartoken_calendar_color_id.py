from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0042_anesthesiologist_calendar_event_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='googlecalendartoken',
            name='calendar_color_id',
            field=models.CharField(
                blank=True, default='', max_length=2,
                verbose_name='Color de eventos (colorId Google Calendar)',
            ),
        ),
    ]
