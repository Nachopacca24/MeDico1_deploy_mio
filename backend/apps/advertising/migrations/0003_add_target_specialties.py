from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('advertising', '0002_alter_advertisement_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='advertisement',
            name='target_specialties',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Lista de especialidades médicas. Vacío = mostrar a todos.',
                verbose_name='Especialidades Objetivo',
            ),
        ),
    ]
