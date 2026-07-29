from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0018_credit_days'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='apple_user_id',
            field=models.CharField(
                blank=True,
                help_text='Identificador único de Apple (sub) para Sign in with Apple',
                max_length=255,
                null=True,
                unique=True,
                verbose_name='Apple User ID',
            ),
        ),
    ]
