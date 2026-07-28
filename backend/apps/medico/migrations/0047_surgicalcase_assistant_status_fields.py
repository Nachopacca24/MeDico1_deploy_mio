from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0046_anesthesiacase_invoice_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalcase',
            name='assistant_is_operated',
            field=models.BooleanField(default=False, verbose_name='Operado (ayudante)'),
        ),
        migrations.AddField(
            model_name='surgicalcase',
            name='assistant_is_billed',
            field=models.BooleanField(default=False, verbose_name='Facturado (ayudante)'),
        ),
        migrations.AddField(
            model_name='surgicalcase',
            name='assistant_is_paid',
            field=models.BooleanField(default=False, verbose_name='Cobrado (ayudante)'),
        ),
        migrations.AddField(
            model_name='surgicalcase',
            name='assistant_invoice_number',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='N° de Factura (ayudante)'),
        ),
    ]
