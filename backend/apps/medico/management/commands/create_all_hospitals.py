"""
Management command to create all hospitals in Guatemala
"""
from django.core.management.base import BaseCommand
from apps.medico.models import Hospital


class Command(BaseCommand):
    help = 'Creates all hospitals in Guatemala (public, IGSS, and private)'

    def handle(self, *args, **options):
        # Hospitales Públicos
        public_hospitals = [
            "Hospital General San Juan de Dios",
            "Hospital Roosevelt",
            "Hospital Nacional de Especialidades de Villa Nueva",
            "Hospital Nacional de Amatitlán",
            'Hospital Nacional de Antigua Guatemala "Pedro de Bethancourt"',
            "Hospital Nacional de Escuintla",
            "Hospital Nacional de Cuilapa",
            "Hospital Nacional de Jalapa",
            "Hospital Nacional de Jutiapa",
            "Hospital Nacional de Mazatenango",
            "Hospital Nacional de Retalhuleu",
            'Hospital Nacional de Quetzaltenango "Rodolfo Robles"',
            "Hospital Regional de Occidente",
            "Hospital Nacional de Huehuetenango",
            'Hospital Nacional de Cobán "Hellen Lossi de Laugerud"',
            "Hospital Nacional de Chiquimula",
            "Hospital Nacional de Zacapa",
            "Hospital Nacional de Puerto Barrios",
            "Hospital Nacional de Santa Elena (Petén)",
            "Hospital Nacional de Totonicapán",
            "Hospital Nacional de San Marcos",
            "Hospital Nacional de Sololá",
            "Hospital Nacional de Chimaltenango",
            "Hospital Nacional de Salamá",
            "Hospital Nacional de Rabinal",
            "Hospital Nacional de El Progreso",
            "Hospital Nacional de Jalpatagua",
            "Hospital Nacional de Tecpán",
            "Hospital Nacional de Coatepeque",
            "Hospital Nacional de Nebaj",
            "Hospital Nacional de San Benito (Petén)",
            "Hospital de Especialidades Pediátricas",
            "Hospital Nacional de Maternidad",
            "Hospital Regional de Cobán",
            "Hospital Regional de Oriente (Zacapa)",
            "Hospital Regional de Occidente (Quetzaltenango)",
            "Hospital Militar Central",
            "Hospital de Salud Mental Federico Mora",
            "Hospital Nacional de Rehabilitación",
            "Hospital Infantil de Infectología y Rehabilitación",
        ]
        
        # Hospitales IGSS
        igss_hospitals = [
            "Hospital General de Enfermedades del IGSS",
            "Hospital General Dr. Juan José Arévalo Bermejo (IGSS zona 6)",
            "Hospital Materno Infantil del IGSS",
            "Hospital Dr. Carlos Archer Monroy (IGSS zona 5)",
            "Hospital de Rehabilitación del IGSS",
            "Hospital de Gineco-Obstetricia del IGSS",
            "Hospital de Mazatenango IGSS",
            "Hospital de Quetzaltenango IGSS",
            "Hospital de Escuintla IGSS",
            "Hospital de Cobán IGSS",
            "Hospital de Puerto Barrios IGSS",
            "Hospital de Zacapa IGSS",
            "Hospital de Huehuetenango IGSS",
            "Hospital de San Benito IGSS",
        ]
        
        # Hospitales Privados
        private_hospitals = [
            "Hospital Herrera Llerandi",
            "Hospital El Pilar",
            "Hospital La Paz",
            "Hospital Centro Médico",
            "Hospital Universitario Esperanza",
            "Hospital Santa Bárbara",
            "Hospital Maranatha",
            "Hospital Betania",
            "Hospital Ángeles",
            "Hospital Montserrat",
            "Hospital Jerusalén",
            "Hospital Privado Sanatorio Nuestra Señora del Pilar",
            "Hospital Los Pinares",
            "Hospital Metropolitano",
            "Hospital María",
            "Hospital Hermano Pedro",
            "Hospital CEMESA",
            "Hospital Guatemala",
            "Hospital Ciudad Vieja",
            "Hospital Infantil Privado",
            "Hospital Colonia Médica",
            "Hospital Del Valle",
            "Hospital San Nicolás",
            "Hospital Nuestra Señora de Fátima",
            "Hospital Vida",
            "Hospital Madre Bernarda",
            "Hospital Salud Integral",
            "Hospital Los Altos (Quetzaltenango)",
            "Hospital Privado Quetzaltenango",
            "Hospital Montserrat Quetzaltenango",
            "Hospital El Buen Samaritano (Quetzaltenango)",
            "Hospital Privado de Occidente",
            "Hospital Privado Cobán",
            "Hospital de la Divina Providencia",
            "Hospital San Juan Bautista (Cobán)",
            "Hospital Privado Zacapa",
            "Hospital Bethel (Chiquimula)",
            "Hospital Monte Sinaí (Jalapa)",
            "Hospital de Oriente",
            "Hospital San Marcos Privado",
            "Hospital La Misericordia (Totonicapán)",
            "Hospital Shaddai (Huehuetenango)",
            "Hospital Central (Escuintla)",
            "Hospital El Shaddai (Puerto Barrios)",
            "Hospital Privado Petén",
            "Hospital Vida y Esperanza (Petén)",
            "Hospital La Esperanza (Cuilapa)",
            "Hospital de la Paz (Chimaltenango)",
            "Hospital San Lucas",
            "Hospital Sanatorio La Asunción",
            "Hospital La Fe",
            "Hospital Privado Las Américas",
            "Hospital Villa Nueva Privado",
            "Hospital Santa Teresa",
            "Hospital Privado Vida Nueva",
            "Hospital Monte Carmelo",
        ]
        
        # Multiplicadores base según tipo
        # Públicos: 1.0 (tarifa base)
        # IGSS: 1.2 (20% más que públicos)
        # Privados: 1.8-2.5 (80-150% más que públicos)
        
        created_count = 0
        updated_count = 0
        
        # Crear hospitales públicos
        for hospital_name in public_hospitals:
            hospital, created = Hospital.objects.get_or_create(
                name=hospital_name,
                defaults={
                    'location': 'Guatemala',
                    'rate_multiplier': 1.0
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Creado: {hospital_name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'→ Ya existe: {hospital_name}'))
        
        # Crear hospitales IGSS
        for hospital_name in igss_hospitals:
            hospital, created = Hospital.objects.get_or_create(
                name=hospital_name,
                defaults={
                    'location': 'Guatemala',
                    'rate_multiplier': 1.2
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Creado: {hospital_name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'→ Ya existe: {hospital_name}'))
        
        # Crear hospitales privados con diferentes multiplicadores
        # Los más prestigiosos tienen multiplicadores más altos
        premium_hospitals = [
            "Hospital Herrera Llerandi",
            "Hospital Centro Médico",
            "Hospital Universitario Esperanza",
            "Hospital El Pilar",
            "Hospital Ángeles",
        ]
        
        for hospital_name in private_hospitals:
            if hospital_name in premium_hospitals:
                multiplier = 2.5  # Hospitales premium
            else:
                multiplier = 1.8  # Hospitales privados estándar
                
            hospital, created = Hospital.objects.get_or_create(
                name=hospital_name,
                defaults={
                    'location': 'Guatemala',
                    'rate_multiplier': multiplier
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Creado: {hospital_name} (x{multiplier})'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'→ Ya existe: {hospital_name}'))
        
        total = created_count + updated_count
        self.stdout.write(self.style.SUCCESS(
            f'\n{"="*60}\n'
            f'Resumen:\n'
            f'  • Total de hospitales: {total}\n'
            f'  • Creados: {created_count}\n'
            f'  • Ya existían: {updated_count}\n'
            f'  • Públicos: {len(public_hospitals)}\n'
            f'  • IGSS: {len(igss_hospitals)}\n'
            f'  • Privados: {len(private_hospitals)}\n'
            f'{"="*60}'
        ))
