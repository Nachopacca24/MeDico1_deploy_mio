from django.db import migrations, models
import django.db.models.deletion


INSURERS = [
    'IGSS (Instituto Guatemalteco de Seguridad Social)',
    'Seguros G&T',
    'Seguros Universales',
    'Aseguradora General',
    'Seguros Alianza',
    'Seguros Banrural',
    'COSAMI',
    'Pan-American Life Insurance (PALIG)',
    'Columna Seguros',
    'Aseguradora Rural',
    'Seguros Occidente',
    'Seguros del País',
    'MAPFRE Guatemala',
    'Seguros Reforma',
    'AIG Guatemala',
    'Chubb Guatemala',
    'Qualitas Seguros',
    'Seguros Agromercantil',
    'BanSeguros (Banco Industrial)',
    'Grupo SURA Guatemala',
    'MetLife Guatemala',
    'Otro',
]


def populate_insurers(apps, schema_editor):
    InsuranceCompany = apps.get_model('medico', 'InsuranceCompany')
    for name in INSURERS:
        InsuranceCompany.objects.get_or_create(name=name)


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0024_add_insurance_company'),
    ]

    operations = [
        # 1. Create InsuranceCompany table
        migrations.CreateModel(
            name='InsuranceCompany',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, unique=True, verbose_name='Nombre')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Aseguradora',
                'verbose_name_plural': 'Aseguradoras',
                'ordering': ['name'],
            },
        ),
        # 2. Populate with Guatemalan insurers
        migrations.RunPython(populate_insurers, migrations.RunPython.noop),
        # 3. Remove the old CharField
        migrations.RemoveField(
            model_name='surgicalcase',
            name='insurance_company',
        ),
        # 4. Add the ForeignKey
        migrations.AddField(
            model_name='surgicalcase',
            name='insurance_company',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cases',
                to='medico.insurancecompany',
                verbose_name='Seguro médico',
            ),
        ),
    ]
