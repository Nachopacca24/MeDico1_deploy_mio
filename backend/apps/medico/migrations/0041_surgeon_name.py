from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0040_equipment_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalcase',
            name='surgeon_name',
            field=models.CharField(
                blank=True,
                help_text='Nombre manual del médico cirujano principal',
                max_length=255,
                null=True,
                verbose_name='Médico Principal',
            ),
        ),
    ]
