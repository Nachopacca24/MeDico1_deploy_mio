from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0013_backfill_deletion_requested_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='surgery_reminder_hours',
            field=models.PositiveIntegerField(
                default=24,
                verbose_name='Horas de recordatorio de cirugía',
                help_text='Horas antes de la cirugía para enviar recordatorio push',
            ),
        ),
    ]
