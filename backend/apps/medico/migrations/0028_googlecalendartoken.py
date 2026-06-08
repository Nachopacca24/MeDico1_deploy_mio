from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0027_rename_medico_favi_user_id_idx_medico_favo_user_id_4787a7_idx_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='GoogleCalendarToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('encrypted_refresh_token', models.TextField(db_column='encrypted_refresh_token', verbose_name='Refresh Token (cifrado)')),
                ('encrypted_access_token', models.TextField(blank=True, db_column='encrypted_access_token', default='', verbose_name='Access Token (cifrado)')),
                ('token_expiry', models.DateTimeField(verbose_name='Expiración del Access Token')),
                ('google_email', models.EmailField(blank=True, default='', max_length=254, verbose_name='Email de Google')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='google_calendar_token',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Usuario',
                )),
            ],
            options={
                'verbose_name': 'Token de Google Calendar',
                'verbose_name_plural': 'Tokens de Google Calendar',
            },
        ),
    ]
