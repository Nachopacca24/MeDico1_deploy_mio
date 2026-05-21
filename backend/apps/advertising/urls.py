# apps/advertising/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClientViewSet,
    AdvertisementViewSet,
    get_active_ads,
    get_feed,
    track_ad_impression,
    track_ad_click,
)

router = DefaultRouter()
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'advertisements', AdvertisementViewSet, basename='advertisement')

urlpatterns = [
    # Rutas del router (admin)
    path('', include(router.urls)),
    
    # Rutas públicas (para la app)
    path('public/ads/', get_active_ads, name='get_active_ads'),
    path('public/feed/', get_feed, name='get_feed'),
    path('public/ads/<int:ad_id>/impression/', track_ad_impression, name='track_impression'),
    path('public/ads/<int:ad_id>/click/', track_ad_click, name='track_click'),
]