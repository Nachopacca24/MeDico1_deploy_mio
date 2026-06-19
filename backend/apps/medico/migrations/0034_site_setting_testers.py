from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0033_site_setting_annual'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                INSERT INTO medico_sitesetting (key, value, updated_at)
                VALUES ('ANDROID_TESTERS_COUNT', '12', NOW())
                ON CONFLICT (key) DO NOTHING;
            """,
            reverse_sql="DELETE FROM medico_sitesetting WHERE key = 'ANDROID_TESTERS_COUNT';",
        ),
    ]
