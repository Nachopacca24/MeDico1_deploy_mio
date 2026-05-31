from django.urls import path
from .views import create_checkout, cancel_subscription, lemonsqueezy_webhook

urlpatterns = [
    path('checkout/', create_checkout, name='ls_checkout'),
    path('cancel/', cancel_subscription, name='ls_cancel'),
    path('webhook/', lemonsqueezy_webhook, name='ls_webhook'),
]
