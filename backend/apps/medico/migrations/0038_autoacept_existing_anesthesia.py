from django.db import migrations


def auto_accept_existing(apps, schema_editor):
    """Casos con anestesiólogo ya asignado antes del flujo de invitación → aceptar."""
    AnesthesiaCase = apps.get_model('medico', 'AnesthesiaCase')
    AnesthesiaCase.objects.filter(
        anesthesiologist__isnull=False,
        anesthesiologist_accepted__isnull=True,
    ).update(anesthesiologist_accepted=True)


class Migration(migrations.Migration):

    dependencies = [
        ('medico', '0037_anesthesiacase_accepted'),
    ]

    operations = [
        migrations.RunPython(auto_accept_existing, migrations.RunPython.noop),
    ]
