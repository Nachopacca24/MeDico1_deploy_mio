from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0016_encrypt_patient_fields'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='hospital',
            name='rate_multiplier',
        ),
    ]
