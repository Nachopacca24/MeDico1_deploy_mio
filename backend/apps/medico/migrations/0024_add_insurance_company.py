from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0023_cleanup_images_purge_at_no_images'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalcase',
            name='insurance_company',
            field=models.CharField(
                blank=True,
                null=True,
                max_length=150,
                verbose_name='Seguro médico',
            ),
        ),
    ]
