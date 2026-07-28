# apps/medico/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.medico.views import (
    FavoriteViewSet,
    SurgicalCaseViewSet,
    CaseProcedureViewSet,
    AdminUserViewSet,
    AdminHospitalViewSet,
    AdminInsuranceViewSet,
)
from apps.medico.serializers.hospital import HospitalViewSet
from apps.medico.serializers.insurance import InsuranceCompanyViewSet
from apps.medico.views.pdf_export import export_case_pdf, export_cases_bulk_pdf, export_anesthesia_pdf
from apps.medico.views.surgery_images import list_surgery_images, upload_surgery_image, delete_surgery_image
from apps.medico.views.google_calendar_auth import (
    connect_google_calendar,
    get_google_token,
    google_calendar_status,
    disconnect_google_calendar,
    update_calendar_preferences,
)
from apps.medico.views.push_token import manage_push_token
from apps.medico.views.anesthesia import anesthesia_case, add_anesthesia_item, remove_anesthesia_item, respond_anesthesia_invitation, anesthesia_pending_invitations

app_name = 'medico'

router = DefaultRouter()
router.register(r'favorites', FavoriteViewSet, basename='favorite')
router.register(r'cases', SurgicalCaseViewSet, basename='surgical-case')
router.register(r'procedures', CaseProcedureViewSet, basename='case-procedure')
router.register(r'hospitals', HospitalViewSet, basename='hospital')
router.register(r'insurances', InsuranceCompanyViewSet, basename='insurance')
router.register(r'admin/users', AdminUserViewSet, basename='admin-users')
router.register(r'admin/hospitals', AdminHospitalViewSet, basename='admin-hospitals')
router.register(r'admin/insurances', AdminInsuranceViewSet, basename='admin-insurances')

urlpatterns = [
    # Google Calendar OAuth (Authorization Code flow)
    path('google-calendar/connect/', connect_google_calendar, name='google-calendar-connect'),
    path('google-calendar/token/', get_google_token, name='google-calendar-token'),
    path('google-calendar/status/', google_calendar_status, name='google-calendar-status'),
    path('google-calendar/disconnect/', disconnect_google_calendar, name='google-calendar-disconnect'),
    path('google-calendar/preferences/', update_calendar_preferences, name='google-calendar-preferences'),

    # Push notifications
    path('push-token/', manage_push_token, name='push-token'),

    # Custom paths BEFORE router so they aren't swallowed by cases/{pk}/
    path('cases/<int:case_id>/pdf/', export_case_pdf, name='case-pdf'),
    path('cases/<int:case_id>/anesthesia/pdf/', export_anesthesia_pdf, name='case-anesthesia-pdf'),
    path('cases/export-pdf/', export_cases_bulk_pdf, name='cases-bulk-pdf'),
    path('cases/anesthesia-invitations/', anesthesia_pending_invitations, name='anesthesia-invitations'),
    path('cases/<int:case_id>/anesthesia/', anesthesia_case, name='case-anesthesia'),
    path('cases/<int:case_id>/anesthesia/respond/', respond_anesthesia_invitation, name='case-anesthesia-respond'),
    path('cases/<int:case_id>/anesthesia/items/', add_anesthesia_item, name='case-anesthesia-items'),
    path('cases/<int:case_id>/anesthesia/items/<int:item_id>/', remove_anesthesia_item, name='case-anesthesia-item-delete'),
    path('cases/<int:case_id>/images/', list_surgery_images, name='case-images-list'),
    path('cases/<int:case_id>/images/upload/', upload_surgery_image, name='case-images-upload'),
    path('cases/<int:case_id>/images/<int:image_id>/', delete_surgery_image, name='case-images-delete'),
    path('', include(router.urls)),
]