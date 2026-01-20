# core/urls.py
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from core.views import (
    IndexView, 
    admin_stats, 
    admin_activity, 
    admin_users,
    admin_hospitals,
    admin_procedures,
    delete_user
)

urlpatterns = [
    # Django Admin Panel
    path('django-admin/', admin.site.urls),

    path('api/auth/', include('apps.medio_auth.urls')),
    path('api/v1/medico/', include('apps.medico.urls')),
    path('api/v1/communication/', include('apps.communication.urls')),
    path('api/v1/invoice/', include('apps.invoice.urls')),
    path('api/v1/payment/', include('apps.payment.urls')),
    path('api/v1/advertising/', include('apps.advertising.urls')),
    
    # Admin Dashboard
    path('api/admin/stats/', admin_stats, name='admin_stats'),
    path('api/admin/activity/', admin_activity, name='admin_activity'),
    path('api/admin/users/', admin_users, name='admin_users'),
    path('api/admin/users/<int:user_id>/delete/', delete_user, name='delete_user'),
    path('api/admin/hospitals/', admin_hospitals, name='admin_hospitals'),
    path('api/admin/procedures/', admin_procedures, name='admin_procedures'),
    
    # Django REST Framework
    path('api-auth/', include('rest_framework.urls')),
    
    # Catch-all para React - DEBE IR AL FINAL
    re_path(r'^(?!api/|django-admin/|media/|static/).*$', IndexView.as_view(), name='index'),
]

# Servir archivos media
from django.views.static import serve
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT, 'insecure': True}),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

admin.site.site_header = "MéDico1 Administration"
admin.site.site_title = "MéDico1 Admin Portal"
admin.site.index_title = "Welcome to MéDico1 Admin"
