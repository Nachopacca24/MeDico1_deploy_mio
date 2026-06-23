# core/urls.py
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from core.views import (
    IndexView,
    health_check,
    admin_stats,
    admin_activity,
    admin_users,
    admin_hospitals,
    admin_procedures,
    delete_user,
    update_user_plan,
    set_permanent_premium,
    cancel_account_deletion,
    extend_trial,
)
from apps.communication.views import admin_announcements, admin_announcement_detail
from apps.medico.views.site_settings import site_settings_public, site_settings_admin

def trigger_error(request):
    division_by_zero = 1 / 0

urlpatterns = [
    # Django Admin Panel
    path('django-admin/', admin.site.urls),

    # Health check — no auth required
    path('api/health/', health_check, name='health_check'),

    # Sentry Verify
    path('sentry-debug/', trigger_error),

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
    path('api/admin/users/<int:user_id>/plan/', update_user_plan, name='update_user_plan'),
    path('api/admin/users/<int:user_id>/permanent-premium/', set_permanent_premium, name='set_permanent_premium'),
    path('api/admin/users/<int:user_id>/cancel-deletion/', cancel_account_deletion, name='cancel_account_deletion'),
    path('api/admin/users/<int:user_id>/extend-trial/', extend_trial, name='extend_trial'),
    path('api/admin/hospitals/', admin_hospitals, name='admin_hospitals'),
    path('api/admin/procedures/', admin_procedures, name='admin_procedures'),
    path('api/admin/announcements/', admin_announcements, name='admin_announcements'),
    path('api/admin/announcements/<int:pk>/', admin_announcement_detail, name='admin_announcement_detail'),
    path('api/v1/settings/', site_settings_public, name='site_settings_public'),
    path('api/admin/settings/', site_settings_admin, name='site_settings_admin'),
    
    # Django REST Framework
    path('api-auth/', include('rest_framework.urls')),
    
    # Catch-all para React - DEBE IR AL FINAL
    re_path(r'^(?!api/|django-admin/|media/|static/|assets/).*$', IndexView.as_view(), name='index'),
]

# Servir archivos media (siempre en Replit)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

admin.site.site_header = "MéDico Administration"
admin.site.site_title = "MéDico Admin Portal"
admin.site.index_title = "Welcome to MéDico Admin"
