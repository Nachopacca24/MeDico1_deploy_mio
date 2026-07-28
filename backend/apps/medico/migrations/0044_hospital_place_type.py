from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0043_googlecalendartoken_calendar_color_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='hospital',
            name='place_type',
            field=models.CharField(
                choices=[
                    ('hospital', 'Hospital'),
                    ('clinica', 'Clínica'),
                    ('consultorio', 'Consultorio'),
                ],
                default='hospital',
                max_length=20,
                verbose_name='Tipo de lugar',
            ),
        ),
    ]
