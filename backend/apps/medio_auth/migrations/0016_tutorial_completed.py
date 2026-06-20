from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0015_had_trial'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='tutorial_completed',
            field=models.BooleanField(default=False, verbose_name='Tutorial completado'),
        ),
    ]
