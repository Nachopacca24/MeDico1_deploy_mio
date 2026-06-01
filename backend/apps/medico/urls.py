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
from apps.medico.serializers.insurance import InsuranceCompanyViewSet
from apps.medico.views.pdf_export import export_case_pdf, export_cases_bulk_pdf
from apps.medico.views.surgery_images import list_surgery_images, upload_surgery_image, delete_surgery_image

app_name = 'medico'

router = DefaultRouter()
router.register(r'favorites', FavoriteViewSet, basename='favorite')
router.register(r'cases', SurgicalCaseViewSet, basename='surgical-case')
router.register(r'procedures', CaseProcedureViewSet, basename='case-procedure')
router.register(r'hospitals', HospitalViewSet, basename='hospital')
router.register(r'insurances', InsuranceCompanyViewSet, basename='insurance')
router.register(r'admin/users', AdminUserViewSet, basename='admin-users')

urlpatterns = [
    # Custom paths BEFORE router so they aren't swallowed by cases/{pk}/
    path('cases/<int:case_id>/pdf/', export_case_pdf, name='case-pdf'),
    path('cases/export-pdf/', export_cases_bulk_pdf, name='cases-bulk-pdf'),
    path('cases/<int:case_id>/images/', list_surgery_images, name='case-images-list'),
    path('cases/<int:case_id>/images/upload/', upload_surgery_image, name='case-images-upload'),
    path('cases/<int:case_id>/images/<int:image_id>/', delete_surgery_image, name='case-images-delete'),
    path('', include(router.urls)),
]