from django.urls import path
from .views import create_checkout, lemonsqueezy_webhook

urlpatterns = [
    path('checkout/', create_checkout, name='ls_checkout'),
    path('webhook/', lemonsqueezy_webhook, name='ls_webhook'),
]
