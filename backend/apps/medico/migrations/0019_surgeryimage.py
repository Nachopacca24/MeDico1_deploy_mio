from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0018_add_patient_name_for_assistant'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SurgeryImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cloudinary_public_id', models.CharField(max_length=255, verbose_name='Cloudinary Public ID')),
                ('cloudinary_url', models.URLField(max_length=500, verbose_name='URL de imagen')),
                ('original_filename', models.CharField(blank=True, max_length=255, verbose_name='Nombre original')),
                ('file_size', models.PositiveIntegerField(blank=True, null=True, verbose_name='Tamaño (bytes)')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True, verbose_name='Subida el')),
                ('surgery', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='images',
                    to='medico.surgicalcase',
                    verbose_name='Cirugía',
                )),
                ('uploaded_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='surgery_images',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Subida por',
                )),
            ],
            options={
                'verbose_name': 'Imagen de cirugía',
                'verbose_name_plural': 'Imágenes de cirugía',
                'ordering': ['uploaded_at'],
            },
        ),
    ]
