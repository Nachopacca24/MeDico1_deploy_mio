from django.urls import path
from apps.communication.views import list_announcements

urlpatterns = [
    path('announcements/', list_announcements, name='announcements'),
]
