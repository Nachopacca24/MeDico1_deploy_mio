from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0017_remove_hospital_rate_multiplier'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalcase',
            name='patient_name_for_assistant',
            field=models.TextField(
                blank=True,
                null=True,
                verbose_name='Nombre del Paciente (para ayudante)',
                help_text='Nombre cifrado con clave compartida para que el médico ayudante pueda leerlo',
            ),
        ),
    ]
