import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0016_tutorial_completed'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='referred_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='referrals',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Referido por',
            ),
        ),
    ]
