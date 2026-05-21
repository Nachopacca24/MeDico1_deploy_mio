from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('advertising', '0004_client_quotas'),
    ]

    operations = [
        migrations.AddField(
            model_name='advertisement',
            name='category',
            field=models.CharField(
                choices=[
                    ('general', 'General'),
                    ('congreso', 'Congreso'),
                    ('casa_medica', 'Casa Médica'),
                    ('hospital', 'Hospital'),
                    ('tecnologia', 'Tecnología Médica'),
                    ('farmaceutica', 'Farmacéutica'),
                    ('educacion', 'Educación Médica'),
                ],
                default='general',
                help_text='Categoría temática para el feed de Novedades',
                max_length=20,
                verbose_name='Categoría',
            ),
        ),
    ]
