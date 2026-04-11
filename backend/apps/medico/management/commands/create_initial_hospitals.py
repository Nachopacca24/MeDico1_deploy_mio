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
                'rate_multiplier': 1.00,
            },
            {
                'name': 'Hospital San José',
                'location': 'Medellín',
                'rate_multiplier': 1.20,
            },
            {
                'name': 'Clínica Los Andes',
                'location': 'Cali',
                'rate_multiplier': 1.15,
            },
            {
                'name': 'Hospital Universitario',
                'location': 'Barranquilla',
                'rate_multiplier': 0.95,
            },
            {
                'name': 'Centro Médico Del Norte',
                'location': 'Cartagena',
                'rate_multiplier': 1.10,
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
