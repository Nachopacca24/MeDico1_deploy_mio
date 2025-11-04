from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
# router.register(r'invoices', views.InvoiceViewSet, basename='invoice')
# router.register(r'items', views.InvoiceItemViewSet, basename='invoice-item')

urlpatterns = [
    path('', include(router.urls)),
]
