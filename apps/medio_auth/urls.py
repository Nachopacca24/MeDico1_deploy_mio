from django.urls import path, include
from rest_framework.routers import DefaultRouter

app_name = 'medio_auth'

router = DefaultRouter()
# router.register(r'auth', AuthViewSet, basename='auth')

urlpatterns = [
    path('', include(router.urls)),
]
