# apps/medico/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.medico.views import (
    FavoriteViewSet, 
    SurgicalCaseViewSet, 
    CaseProcedureViewSet,
    AdminUserViewSet
)
from apps.medico.serializers.hospital import HospitalViewSet

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
]