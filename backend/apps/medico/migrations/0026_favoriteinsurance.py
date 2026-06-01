from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0025_insurancecompany_and_fk'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='FavoriteInsurance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')),
                ('insurance', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorited_by', to='medico.insurancecompany', verbose_name='Aseguradora')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorite_insurances', to=settings.AUTH_USER_MODEL, verbose_name='Usuario')),
            ],
            options={
                'verbose_name': 'Aseguradora Favorita',
                'verbose_name_plural': 'Aseguradoras Favoritas',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='favoriteinsurance',
            index=models.Index(fields=['user', 'created_at'], name='medico_favi_user_id_idx'),
        ),
        migrations.AddIndex(
            model_name='favoriteinsurance',
            index=models.Index(fields=['insurance'], name='medico_favi_ins_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='favoriteinsurance',
            unique_together={('user', 'insurance')},
        ),
    ]
