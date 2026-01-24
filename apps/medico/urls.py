# apps/medico/urls.py - ACTUALIZAR

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.medico.views import (
    FavoriteViewSet, 
    SurgicalCaseViewSet, 
    CaseProcedureViewSet,
    AdminUserViewSet
)
from apps.medico.serializers.hospital import HospitalViewSet

# 🆕 Importar vistas de Google Calendar
from apps.medico.views.google_calendar import (
    google_calendar_auth,
    google_calendar_callback,
    google_calendar_refresh,
    google_calendar_revoke
)

app_name = 'medico'

# Router principal
router = DefaultRouter()
router.register(r'favorites', FavoriteViewSet, basename='favorite')
router.register(r'cases', SurgicalCaseViewSet, basename='surgical-case')
router.register(r'procedures', CaseProcedureViewSet, basename='case-procedure')
router.register(r'hospitals', HospitalViewSet, basename='hospital')
router.register(r'admin/users', AdminUserViewSet, basename='admin-users')

urlpatterns = [
    path('', include(router.urls)),

    # 🆕 Google Calendar OAuth endpoints
    path('google-calendar/auth/', google_calendar_auth, name='google-calendar-auth'),
    path('google-calendar/callback/', google_calendar_callback, name='google-calendar-callback'),
    path('google-calendar/refresh/', google_calendar_refresh, name='google-calendar-refresh'),
    path('google-calendar/revoke/', google_calendar_revoke, name='google-calendar-revoke'),
]