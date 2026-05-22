"""
Script para crear datos iniciales de hospitales
"""
from django.core.management.base import BaseCommand
from apps.medico.models import Hospital


class Command(BaseCommand):
    help = 'Crea hospitales iniciales para testing'

    def handle(self, *args, **kwargs):
        hospitals_data = [
            {
                'name': 'Clínica Santa María',
                'location': 'Bogotá',
            },
            {
                'name': 'Hospital San José',
                'location': 'Medellín',
            },
            {
                'name': 'Clínica Los Andes',
                'location': 'Cali',
            },
            {
                'name': 'Hospital Universitario',
                'location': 'Barranquilla',
            },
            {
                'name': 'Centro Médico Del Norte',
                'location': 'Cartagena',
            },
        ]

        created_count = 0
        for hospital_data in hospitals_data:
            hospital, created = Hospital.objects.get_or_create(
                name=hospital_data['name'],
                defaults=hospital_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Hospital creado: {hospital.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'○ Hospital ya existe: {hospital.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\n✓ Proceso completado. {created_count} hospitales creados.')
        )
