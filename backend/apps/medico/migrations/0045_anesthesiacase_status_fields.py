from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0044_hospital_place_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='anesthesiacase',
            name='is_operated',
            field=models.BooleanField(default=False, verbose_name='Operado (anestesia)'),
        ),
        migrations.AddField(
            model_name='anesthesiacase',
            name='is_billed',
            field=models.BooleanField(default=False, verbose_name='Facturado (anestesia)'),
        ),
        migrations.AddField(
            model_name='anesthesiacase',
            name='is_paid',
            field=models.BooleanField(default=False, verbose_name='Cobrado (anestesia)'),
        ),
    ]
