from django.shortcuts import render
from django.views.generic import TemplateView
from django.conf import settings
from django.http import HttpResponse
import os


class IndexView(TemplateView):
    def get(self, request, *args, **kwargs):
        if settings.DEBUG:
            import requests
            try:
                vite_response = requests.get('http://localhost:5173/', timeout=2)
                html_content = vite_response.text
                html_content = html_content.replace('src="/', 'src="http://localhost:5173/')
                html_content = html_content.replace('href="/', 'href="http://localhost:5173/')
                return HttpResponse(html_content, content_type='text/html')
            except requests.exceptions.RequestException:
                return HttpResponse("""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>MéDico1 - Error</title>
                        <style>
                            body { 
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                margin: 0;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            }
                            .container {
                                background: white;
                                padding: 40px;
                                border-radius: 10px;
                                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                                text-align: center;
                                max-width: 500px;
                            }
                            h1 { color: #e74c3c; margin-bottom: 20px; }
                            p { color: #555; line-height: 1.6; }
                            code {
                                background: #f4f4f4;
                                padding: 15px;
                                display: block;
                                border-radius: 5px;
                                margin: 20px 0;
                                font-family: 'Courier New', monospace;
                            }
                            .status {
                                background: #ecf0f1;
                                padding: 15px;
                                border-radius: 5px;
                                margin-top: 20px;
                            }
                            .ok { color: #27ae60; }
                            .error { color: #e74c3c; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>⚠️ Frontend no disponible</h1>
                            <p>El servidor de Vite no está corriendo. Django está funcionando correctamente, pero necesitas iniciar el frontend.</p>
                            
                            <p><strong>En otra terminal ejecuta:</strong></p>
                            <code>npm run dev</code>
                            
                            <div class="status">
                                <p class="ok">✅ Backend Django: Funcionando</p>
                                <p class="error">❌ Frontend Vite: No disponible</p>
                            </div>
                            
                            <p style="margin-top: 20px; font-size: 14px; color: #999;">
                                O usa el comando personalizado que inicia ambos:<br>
                                <code style="display: inline; padding: 5px;">python manage.py runserver</code>
                            </p>
                        </div>
                    </body>
                    </html>
                """, content_type='text/html')
        else:
            return render(request, 'index.html')
