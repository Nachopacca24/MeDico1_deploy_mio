# advertising/management/commands/clean_orphan_images.py

import os
from django.core.management.base import BaseCommand
from django.conf import settings
from advertising.models import Advertisement


class Command(BaseCommand):
    help = 'Elimina imágenes de anuncios que ya no existen en la base de datos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la limpieza sin eliminar archivos',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        media_path = os.path.join(settings.MEDIA_ROOT, 'advertisements')
        
        if not os.path.exists(media_path):
            self.stdout.write(self.style.WARNING('❌ No existe la carpeta de advertisements'))
            return
        
        self.stdout.write(self.style.SUCCESS('🔍 Buscando imágenes huérfanas...\n'))
        
        # Obtener todas las rutas de imágenes en la BD
        db_images = set()
        for ad in Advertisement.objects.all():
            if ad.image:
                db_images.add(ad.image.path)
        
        self.stdout.write(f"📊 Imágenes en BD: {len(db_images)}")
        
        # Recorrer carpeta y encontrar huérfanas
        deleted_count = 0
        total_size = 0
        orphan_files = []
        
        for root, dirs, files in os.walk(media_path):
            for filename in files:
                file_path = os.path.join(root, filename)
                
                if file_path not in db_images:
                    file_size = os.path.getsize(file_path)
                    orphan_files.append((file_path, filename, file_size))
                    total_size += file_size
        
        if not orphan_files:
            self.stdout.write(self.style.SUCCESS('\n✅ No hay imágenes huérfanas. Todo limpio!'))
            return
        
        # Mostrar resumen
        self.stdout.write(f"\n📋 Encontradas {len(orphan_files)} imágenes huérfanas:")
        self.stdout.write(f"💾 Espacio total: {total_size/1024/1024:.2f} MB\n")
        
        # Listar archivos
        for file_path, filename, file_size in orphan_files:
            size_kb = file_size / 1024
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(f'  [DRY-RUN] {filename} ({size_kb:.2f} KB)')
                )
            else:
                try:
                    os.remove(file_path)
                    deleted_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Eliminada: {filename} ({size_kb:.2f} KB)')
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Error eliminando {filename}: {e}')
                    )
        
        # Resumen final
        self.stdout.write('')
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'⚠️  [DRY-RUN] Se eliminarían {len(orphan_files)} imágenes '
                    f'({total_size/1024/1024:.2f} MB)'
                )
            )
            self.stdout.write(
                self.style.WARNING('💡 Ejecuta sin --dry-run para eliminar realmente\n')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Eliminadas: {deleted_count} imágenes '
                    f'({total_size/1024/1024:.2f} MB liberados)\n'
                )
            )