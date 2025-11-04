"""
Comando personalizado para iniciar Django + Vite en modo desarrollo
"""
import subprocess
import os
import sys
import shutil
import time
import socket
from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Inicia Django y Vite dev server simultáneamente (modo desarrollo)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--port',
            type=str,
            default='8000',
            help='Puerto para Django (default: 8000)',
        )
        parser.add_argument(
            '--skip-vite',
            action='store_true',
            help='No iniciar Vite (útil si ya está corriendo)',
        )
    
    def check_port(self, port):
        """Verifica si un puerto está en uso"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind(('localhost', port))
            sock.close()
            return False  # Puerto disponible
        except OSError:
            return True  # Puerto en uso
    
    def start_vite(self, base_dir):
        """Inicia Vite en un proceso separado"""
        try:
            # Verificar si Vite ya está corriendo
            if self.check_port(5173):
                self.stdout.write(self.style.WARNING('⚠️  Vite ya está corriendo en puerto 5173'))
                self.stdout.write(self.style.SUCCESS('✅ Usando servidor Vite existente'))
                return True
            
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
                    f.write(f'title Vite Dev Server - MeDico\n')
                    f.write(f'color 0A\n')
                    f.write(f'cd /d "{base_dir}"\n')
                    f.write(f'echo.\n')
                    f.write(f'echo ================================\n')
                    f.write(f'echo   VITE DEV SERVER - MEDICO\n')
                    f.write(f'echo ================================\n')
                    f.write(f'echo.\n')
                    f.write(f'echo Directorio: {base_dir}\n')
                    f.write(f'echo.\n')
                    f.write(f'npm run dev\n')
                    f.write(f'echo.\n')
                    f.write(f'echo Vite se ha detenido. Presiona cualquier tecla para cerrar...\n')
                    f.write(f'pause > nul\n')
                
                # Ejecutar el batch en nueva ventana
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                
                subprocess.Popen(
                    ['cmd', '/c', 'start', 'cmd', '/k', batch_file],
                    cwd=base_dir,
                    startupinfo=startupinfo
                )
                
                self.stdout.write(self.style.SUCCESS(f'✓ Comando ejecutado'))
                
                # Limpiar el archivo batch después de un momento
                def cleanup():
                    time.sleep(10)
                    try:
                        if os.path.exists(batch_file):
                            os.remove(batch_file)
                    except:
                        pass
                
                import threading
                threading.Thread(target=cleanup, daemon=True).start()
            else:
                # Linux/Mac
                subprocess.Popen(
                    ['gnome-terminal', '--', 'bash', '-c', f'cd {base_dir} && npm run dev; exec bash'],
                    cwd=base_dir
                )
            
            # Esperar a que Vite inicie
            self.stdout.write('⏳ Esperando 6 segundos para que Vite inicie...')
            time.sleep(6)
            
            self.stdout.write(self.style.SUCCESS('✅ Vite debería estar en http://localhost:5173'))
            return True
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error al iniciar Vite: {e}'))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))
            return False

    def handle(self, *args, **options):
        """Ejecuta Django + Vite"""
        
        # Obtener el directorio base del proyecto
        from django.conf import settings
        base_dir = str(settings.BASE_DIR)
        port = options['port']
        skip_vite = options.get('skip_vite', False)
        
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('  MEDICO - Iniciando Entorno de Desarrollo Completo'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(f'📁 Directorio: {base_dir}')
        self.stdout.write(f'🔌 Puerto Django: {port}\n')
        
        # Iniciar Vite solo si no se especificó --skip-vite
        if not skip_vite:
            vite_started = self.start_vite(base_dir)
            
            if not vite_started:
                self.stdout.write(self.style.WARNING('\n⚠️  Vite no se inició automáticamente'))
                self.stdout.write(self.style.WARNING('   Ábrelo manualmente: npm run dev\n'))
            else:
                self.stdout.write(self.style.WARNING('\n📝 Vite está en una ventana CMD separada'))
                self.stdout.write(self.style.WARNING('   Cierra AMBAS ventanas cuando termines\n'))
        else:
            self.stdout.write(self.style.WARNING('\n⏭️  Saltando inicio de Vite (--skip-vite)\n'))
        
        # Iniciar Django
        self.stdout.write(self.style.SUCCESS('🐍 Iniciando servidor Django...'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.HTTP_INFO(f'\n🌐 Accede a: http://127.0.0.1:{port}'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.WARNING('\n💡 Tip: Para detener ambos servidores, presiona CTRL+C'))
        self.stdout.write(self.style.WARNING('   y cierra manualmente la ventana de Vite\n'))
        
        # Llamar al comando runserver de Django SIN auto-reload
        try:
            call_command('runserver', f'{port}', use_reloader=False, skip_checks=True)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\n\n👋 Servidor Django detenido'))
            if not options.get('skip_vite'):
                self.stdout.write(self.style.WARNING('   ⚠️  Recuerda cerrar la ventana de Vite manualmente\n'))
