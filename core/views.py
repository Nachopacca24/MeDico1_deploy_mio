from django.http import HttpResponse, JsonResponse
from django.views.generic import View
from django.conf import settings
import requests

class IndexView(View):
    def get(self, request, *args, **kwargs):
        if settings.DEBUG:
            try:
                vite_response = requests.get('http://localhost:5173/', timeout=2)
                html_content = vite_response.text
                html_content = html_content.replace('src="/', 'src="http://localhost:5173/')
                html_content = html_content.replace('href="/', 'href="http://localhost:5173/')
                return HttpResponse(html_content, content_type='text/html')
            except:
                return HttpResponse("""
                    <h1>Frontend Vite no está corriendo</h1>
                    <p>Ejecuta: <code>npm run dev</code></p>
                """, content_type="text/html")

        return JsonResponse({"status": "ok", "message": "Backend running"}, status=200)
