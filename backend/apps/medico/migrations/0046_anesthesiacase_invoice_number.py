from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0045_anesthesiacase_status_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='anesthesiacase',
            name='invoice_number',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='N° de Factura (anestesia)'),
        ),
    ]
