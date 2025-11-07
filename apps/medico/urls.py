from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.medico.views import FavoriteViewSet

app_name = 'medico'

router = DefaultRouter()
router.register(r'favorites', FavoriteViewSet, basename='favorite')

urlpatterns = [
    path('', include(router.urls)),
]
