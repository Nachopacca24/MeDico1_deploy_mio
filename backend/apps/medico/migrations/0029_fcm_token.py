from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    1. Rename GoogleCalendarToken Python attributes to use underscore prefix.
       The db_column stays the same so no ALTER TABLE is issued.
    2. Create FCMToken model for push notifications.
    """

    dependencies = [
        ('medico', '0028_googlecalendartoken'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Rename Python attributes only — db_column unchanged, no ALTER TABLE
        migrations.RenameField(
            model_name='googlecalendartoken',
            old_name='encrypted_access_token',
            new_name='_encrypted_access_token',
        ),
        migrations.RenameField(
            model_name='googlecalendartoken',
            old_name='encrypted_refresh_token',
            new_name='_encrypted_refresh_token',
        ),

        # New FCMToken model
        migrations.CreateModel(
            name='FCMToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.TextField(unique=True)),
                ('platform', models.CharField(
                    choices=[('android', 'Android'), ('ios', 'iOS'), ('web', 'Web')],
                    default='android',
                    max_length=10,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='fcm_tokens',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'FCM Token',
                'verbose_name_plural': 'FCM Tokens',
            },
        ),
        migrations.AddIndex(
            model_name='fcmtoken',
            index=models.Index(fields=['user'], name='medico_fcmtoken_user_idx'),
        ),
    ]
