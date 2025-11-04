"""
Comando personalizado de Django para ejecutar el servidor de desarrollo
con Django y Vite simultáneamente
"""
import subprocess
import os
import sys
import shutil
import threading
import time
from django.core.management.commands.runserver import Command as RunServerCommand


class Command(RunServerCommand):
    help = 'Inicia Django y Vite dev server simultáneamente'
    
    def start_vite(self, base_dir):
        """Inicia Vite en un proceso separado"""
        try:
            self.stdout.write(self.style.SUCCESS('🚀 Iniciando servidor Vite...'))
            
            # Verificar que npm existe
            npm_path = shutil.which('npm')
            if not npm_path:
                self.stdout.write(self.style.ERROR('❌ npm no encontrado en el PATH'))
                return False
            
            self.stdout.write(self.style.SUCCESS(f'✓ npm encontrado en: {npm_path}'))
            
            if sys.platform == 'win32':
                # Windows - Crear archivo batch temporal
                batch_file = os.path.join(base_dir, 'start_vite.bat')
                with open(batch_file, 'w') as f:
                    f.write(f'@echo off\n')
                    f.write(f'title Vite Dev Server\n')
                    f.write(f'cd /d "{base_dir}"\n')
                    f.write(f'echo Iniciando Vite en {base_dir}\n')
                    f.write(f'npm run dev\n')
                    f.write(f'pause\n')
                
                # Ejecutar el batch en nueva ventana
                subprocess.Popen(
                    ['cmd', '/c', 'start', 'cmd', '/k', batch_file],
                    cwd=base_dir,
                    creationflags=subprocess.CREATE_NEW_CONSOLE if hasattr(subprocess, 'CREATE_NEW_CONSOLE') else 0
                )
                
                self.stdout.write(self.style.SUCCESS(f'✓ Archivo batch creado: {batch_file}'))
            else:
                # Linux/Mac
                subprocess.Popen(
                    ['gnome-terminal', '--', 'bash', '-c', f'cd {base_dir} && npm run dev; exec bash'],
                    cwd=base_dir
                )
            
            # Esperar a que Vite inicie
            self.stdout.write('⏳ Esperando 5 segundos para que Vite inicie...')
            time.sleep(5)
            
            self.stdout.write(self.style.SUCCESS('✅ Servidor Vite debería estar en http://localhost:5173'))
            self.stdout.write(self.style.WARNING('� Vite está en una ventana CMD separada - ciérrala cuando termines'))
            return True
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error al iniciar Vite: {e}'))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))
            return False

    def handle(self, *args, **options):
        """Override del método handle para iniciar Vite antes de Django"""
        
        # Obtener el directorio base del proyecto
        from django.conf import settings
        base_dir = str(settings.BASE_DIR)
        
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('  MEDICO - Iniciando Backend + Frontend'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'📁 Directorio: {base_dir}\n')
        
        # Iniciar Vite
        vite_started = self.start_vite(base_dir)
        
        if not vite_started:
            self.stdout.write(self.style.WARNING('\n⚠️  Vite no se inició automáticamente'))
            self.stdout.write(self.style.WARNING('   Ábrelo manualmente en otra terminal con: npm run dev\n'))
        
        # Iniciar Django
        self.stdout.write(self.style.SUCCESS('\n🐍 Iniciando servidor Django...'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        
        # Llamar al comando original de runserver
        super().handle(*args, **options)
