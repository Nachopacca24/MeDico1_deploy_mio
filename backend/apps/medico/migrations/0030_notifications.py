from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0029_fcm_token'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalcase',
            name='surgery_reminder_sent_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Recordatorio de cirugía enviado el',
                help_text='Marca que ya se envió el recordatorio push para esta cirugía',
            ),
        ),
        migrations.CreateModel(
            name='SystemNews',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='Título')),
                ('body', models.TextField(verbose_name='Cuerpo')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('sent_at', models.DateTimeField(
                    blank=True,
                    null=True,
                    verbose_name='Enviado el',
                    help_text='Fecha en que se enviaron las notificaciones push',
                )),
            ],
            options={
                'verbose_name': 'Novedad del sistema',
                'verbose_name_plural': 'Novedades del sistema',
                'ordering': ['-created_at'],
            },
        ),
    ]
