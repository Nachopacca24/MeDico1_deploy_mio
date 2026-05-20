from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('advertising', '0003_add_target_specialties'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='quota_home_banner',
            field=models.PositiveIntegerField(
                default=0,
                verbose_name='Cupo Banner Principal',
                help_text='Máximo de anuncios Banner Principal contratados',
            ),
        ),
        migrations.AddField(
            model_name='client',
            name='quota_popup',
            field=models.PositiveIntegerField(
                default=0,
                verbose_name='Cupo Popup',
                help_text='Máximo de anuncios Popup contratados',
            ),
        ),
        migrations.AddField(
            model_name='client',
            name='quota_sidebar',
            field=models.PositiveIntegerField(
                default=0,
                verbose_name='Cupo Barra Lateral',
                help_text='Máximo de anuncios Barra Lateral contratados',
            ),
        ),
        migrations.AddField(
            model_name='client',
            name='quota_between_content',
            field=models.PositiveIntegerField(
                default=0,
                verbose_name='Cupo Entre Contenido',
                help_text='Máximo de anuncios Entre Contenido contratados',
            ),
        ),
        migrations.AddField(
            model_name='client',
            name='quota_footer',
            field=models.PositiveIntegerField(
                default=0,
                verbose_name='Cupo Footer',
                help_text='Máximo de anuncios Footer contratados',
            ),
        ),
    ]
