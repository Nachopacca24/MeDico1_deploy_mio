from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0032_site_setting'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                INSERT INTO medico_site_setting (key, value, updated_at)
                VALUES ('ANNUAL_PRICE', '84', NOW())
                ON CONFLICT (key) DO NOTHING;
            """,
            reverse_sql="DELETE FROM medico_site_setting WHERE key = 'ANNUAL_PRICE';",
        ),
    ]
