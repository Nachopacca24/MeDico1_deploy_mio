from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0015_add_invoice_number'),
    ]

    operations = [
        migrations.AlterField(
            model_name='surgicalcase',
            name='patient_name',
            field=models.TextField(verbose_name='Nombre del Paciente'),
        ),
        migrations.AlterField(
            model_name='surgicalcase',
            name='patient_id',
            field=models.TextField(blank=True, null=True, verbose_name='ID del Paciente', help_text='Número de identificación o expediente del paciente'),
        ),
    ]
