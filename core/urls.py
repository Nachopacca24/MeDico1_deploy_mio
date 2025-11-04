from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from core.views import IndexView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/medico/', include('apps.medico.urls')),
    path('api/v1/auth/', include('apps.medio_auth.urls')),
    path('api/v1/communication/', include('apps.communication.urls')),
    path('api/v1/invoice/', include('apps.invoice.urls')),
    path('api/v1/payment/', include('apps.payment.urls')),
    path('api-auth/', include('rest_framework.urls')),
    re_path(r'^.*$', IndexView.as_view(), name='index'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

admin.site.site_header = "MéDico1 Administration"
admin.site.site_title = "MéDico1 Admin Portal"
admin.site.index_title = "Welcome to MéDico1 Admin"
