from django.db import migrations


def reset_registered_to_pending(apps, schema_editor):
    """Colegas registrados (FK) deben pasar por el flujo de aceptación."""
    AnesthesiaCase = apps.get_model('medico', 'AnesthesiaCase')
    AnesthesiaCase.objects.filter(
        anesthesiologist__isnull=False,
        anesthesiologist_accepted=True,
    ).update(anesthesiologist_accepted=None)


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0038_autoacept_existing_anesthesia'),
    ]

    operations = [
        migrations.RunPython(reset_registered_to_pending, migrations.RunPython.noop),
    ]
