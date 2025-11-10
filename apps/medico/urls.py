from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.medico.views import FavoriteViewSet, SurgicalCaseViewSet, CaseProcedureViewSet
from apps.medico.serializers.hospital import HospitalViewSet

app_name = 'medico'

router = DefaultRouter()
router.register(r'favorites', FavoriteViewSet, basename='favorite')
router.register(r'cases', SurgicalCaseViewSet, basename='surgical-case')
router.register(r'procedures', CaseProcedureViewSet, basename='case-procedure')
router.register(r'hospitals', HospitalViewSet, basename='hospital')

urlpatterns = [
    path('', include(router.urls)),
]
