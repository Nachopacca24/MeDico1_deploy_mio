from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0039_reset_registered_anesthesiologist_to_pending'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalcase',
            name='equipment_name',
            field=models.CharField(
                blank=True,
                help_text='Descripción del equipo personal utilizado en la cirugía',
                max_length=500,
                null=True,
                verbose_name='Equipo utilizado',
            ),
        ),
        migrations.AddField(
            model_name='surgicalcase',
            name='equipment_cost',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Solo informativo — no se suma al honorario',
                max_digits=12,
                null=True,
                verbose_name='Costo del equipo (Q)',
            ),
        ),
        migrations.AddField(
            model_name='anesthesiacase',
            name='equipment_name',
            field=models.CharField(
                blank=True,
                help_text='Descripción del equipo de anestesia utilizado',
                max_length=500,
                null=True,
                verbose_name='Equipo utilizado',
            ),
        ),
        migrations.AddField(
            model_name='anesthesiacase',
            name='equipment_cost',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Se suma al honorario total de anestesia',
                max_digits=12,
                null=True,
                verbose_name='Costo del equipo (Q)',
            ),
        ),
    ]
