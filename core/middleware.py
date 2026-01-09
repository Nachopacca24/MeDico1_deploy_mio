# core/middleware.py

from django.conf import settings
from django.http import HttpResponse
import os
import mimetypes
import subprocess
import sys
import socket
import threading
import atexit


_vite_started = False
_vite_lock = threading.Lock()
_vite_process = None


def check_port(port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(('localhost', port))
        sock.close()
        return False
    except OSError:
        return True


def start_vite_server():
    global _vite_started, _vite_process
    
    with _vite_lock:
        if _vite_started:
            return
        
        if check_port(5173):
            print("✅ Vite ya está corriendo en puerto 5173")
            _vite_started = True
            return
        
        base_dir = str(settings.BASE_DIR)
        
        try:
            print("🚀 Iniciando servidor Vite en segundo plano...")
            
            if sys.platform == 'win32':
                import shutil
                npm_path = shutil.which('npm')
                if not npm_path:
                    npm_path = 'npm'
                
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE
                
                vite_log = os.path.join(base_dir, 'vite.log')
                
                with open(vite_log, 'w') as log_file:
                    _vite_process = subprocess.Popen(
                        f'"{npm_path}" run dev',
                        cwd=base_dir,
                        stdout=log_file,
                        stderr=subprocess.STDOUT,
                        startupinfo=startupinfo,
                        shell=True,
                        creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
                    )
                
                print("✅ Vite iniciado en segundo plano (sin ventana)")
                print(f"📝 URL: http://localhost:5173")
                print(f"📄 Logs de Vite: {vite_log}")
            else:
                subprocess.Popen(
                    ['npm', 'run', 'dev'],
                    cwd=base_dir,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                print("✅ Vite iniciado en segundo plano")
            
            _vite_started = True
            
        except Exception as e:
            print(f"❌ Error al iniciar Vite: {e}")
            print("⚠️  Inicia Vite manualmente con: npm run dev")


class ViteDevMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        if settings.DEBUG:
            threading.Thread(target=start_vite_server, daemon=True).start()

    def __call__(self, request):
        if not settings.DEBUG:
            return self.get_response(request)

        if request.path.startswith('/@') or request.path.startswith('/node_modules/'):
            try:
                import requests
                vite_url = f'http://localhost:5173{request.path}'
                if request.GET:
                    query_string = request.GET.urlencode()
                    vite_url = f'{vite_url}?{query_string}'
                
                vite_response = requests.get(vite_url, timeout=2)
                return HttpResponse(
                    vite_response.content,
                    content_type=vite_response.headers.get('content-type', 'application/javascript'),
                    status=vite_response.status_code
                )
            except Exception:
                pass
        
        if request.path.startswith('/surgeries/'):
            public_file_path = os.path.join(settings.BASE_DIR, 'public', request.path.lstrip('/'))
            if os.path.exists(public_file_path):
                mime_type, _ = mimetypes.guess_type(public_file_path)
                with open(public_file_path, 'rb') as f:
                    content = f.read()
                return HttpResponse(content, content_type=mime_type or 'text/csv')

        if request.path.startswith('/src/'):
            file_path = os.path.join(settings.BASE_DIR, request.path.lstrip('/'))
            if os.path.exists(file_path):
                mime_type, _ = mimetypes.guess_type(file_path)
                with open(file_path, 'rb') as f:
                    content = f.read()
                return HttpResponse(content, content_type=mime_type or 'application/octet-stream')

        if any(request.path.endswith(ext) for ext in ['.js', '.css', '.png', '.jpg', '.svg', '.ico', '.json', '.tsx', '.ts']):
            search_paths = [
                os.path.join(settings.BASE_DIR, request.path.lstrip('/')),
                os.path.join(settings.BASE_DIR, 'src', request.path.lstrip('/')),
                os.path.join(settings.BASE_DIR, 'public', request.path.lstrip('/')),
            ]
            
            for file_path in search_paths:
                if os.path.exists(file_path):
                    mime_type, _ = mimetypes.guess_type(file_path)
                    with open(file_path, 'rb') as f:
                        content = f.read()
                    return HttpResponse(content, content_type=mime_type or 'application/octet-stream')

        response = self.get_response(request)
        return response


def cleanup_vite():
    global _vite_process
    if _vite_process is not None:
        try:
            _vite_process.terminate()
            _vite_process.wait(timeout=5)
            print("\n✅ Vite detenido correctamente")
        except:
            try:
                _vite_process.kill()
            except:
                pass

atexit.register(cleanup_vite)


class DisableCSRFForAPIMiddleware:
    """
    Deshabilitar CSRF para todas las rutas /api/* ya que usamos JWT.
    
    SECURITY NOTE: Esto es seguro porque todas las rutas de API usan JWT authentication
    que no es vulnerable a CSRF. Las rutas de admin de Django mantienen CSRF habilitado.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Deshabilitar CSRF para TODAS las rutas que empiecen con /api/
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        
        return self.get_response(request)