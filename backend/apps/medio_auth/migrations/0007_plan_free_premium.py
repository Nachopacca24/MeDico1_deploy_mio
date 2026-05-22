from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medio_auth', '0006_password_reset_fields'),
    ]

    operations = [
        # Drop old check constraint first so we can insert 'free'/'premium' values
        migrations.RunSQL(
            sql="ALTER TABLE medio_auth_customuser DROP CONSTRAINT IF EXISTS check_plan_choices;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Migrate existing data: bronze/silver → free, gold → premium
        migrations.RunSQL(
            sql="""
                UPDATE medio_auth_customuser SET plan = 'free' WHERE plan IN ('bronze', 'silver', 'free');
                UPDATE medio_auth_customuser SET plan = 'premium' WHERE plan = 'gold';
            """,
            reverse_sql="""
                UPDATE medio_auth_customuser SET plan = 'bronze' WHERE plan = 'free';
            """,
        ),
        # Now add the new constraint with only the new choices
        migrations.AlterField(
            model_name='customuser',
            name='plan',
            field=models.CharField(
                choices=[('free', 'Free'), ('premium', 'Premium')],
                default='free',
                help_text='Plan actual del usuario',
                max_length=10,
                verbose_name='Plan de Suscripción',
            ),
        ),
    ]
