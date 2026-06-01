from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0019_surgeryimage'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalcase',
            name='images_purge_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Purgar imágenes el',
                help_text='Las imágenes se eliminan automáticamente 3 meses después de cobrar',
            ),
        ),
    ]
