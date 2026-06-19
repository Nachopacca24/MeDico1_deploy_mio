from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0031_assistant_calendar_event_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='SiteSetting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=100, unique=True)),
                ('value', models.TextField()),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'medico_site_setting',
            },
        ),
        migrations.RunSQL(
            sql="""
                INSERT INTO medico_site_setting (key, value, updated_at)
                VALUES
                    ('PREMIUM_PRICE', '7', NOW()),
                    ('TRIAL_DAYS', '30', NOW())
                ON CONFLICT (key) DO NOTHING;
            """,
            reverse_sql="DELETE FROM medico_site_setting WHERE key IN ('PREMIUM_PRICE', 'TRIAL_DAYS');",
        ),
    ]
