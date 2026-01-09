# apps/medio_auth/urls.py

from django.urls import path
from .views import (
    # Vistas existentes
    RegisterView,
    LoginView,
    LogoutView,
    RefreshTokenView,
    UserProfileView,
    ChangePasswordView,
    
    # Vistas de verificación de email
    SendVerificationEmailView,
    VerifyEmailView,
    ResendVerificationEmailView,
    CheckVerificationStatusView,
    
    # Nuevas vistas de amistad/colegas
    SearchColleagueView,
    SendFriendRequestView,
    ListColleaguesView,
    ListFriendRequestsView,
    AcceptFriendRequestView,
    RejectFriendRequestView,
    RemoveColleagueView,
)

app_name = 'medio_auth'

urlpatterns = [
    # ============================================
    # RUTAS DE AUTENTICACIÓN
    # ============================================
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', RefreshTokenView.as_view(), name='refresh'),
    path('me/', UserProfileView.as_view(), name='me'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # ============================================
    # RUTAS DE VERIFICACIÓN DE EMAIL
    # ============================================
    path('send-verification/', SendVerificationEmailView.as_view(), name='send_verification_email'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('resend-verification/', ResendVerificationEmailView.as_view(), name='resend_verification_email'),
    path('verification-status/', CheckVerificationStatusView.as_view(), name='check_verification_status'),
    
    # ============================================
    # RUTAS DE AMISTAD/COLEGAS
    # ============================================
    # Buscar colega por código
    path('colleagues/search/', SearchColleagueView.as_view(), name='search_colleague'),
    
    # Listar colegas
    path('colleagues/', ListColleaguesView.as_view(), name='list_colleagues'),
    
    # Eliminar colega
    path('colleagues/<int:colleague_id>/', RemoveColleagueView.as_view(), name='remove_colleague'),
    
    # Solicitudes de amistad
    path('friend-requests/', ListFriendRequestsView.as_view(), name='list_friend_requests'),
    path('friend-requests/send/', SendFriendRequestView.as_view(), name='send_friend_request'),
    path('friend-requests/<int:request_id>/accept/', AcceptFriendRequestView.as_view(), name='accept_friend_request'),
    path('friend-requests/<int:request_id>/reject/', RejectFriendRequestView.as_view(), name='reject_friend_request'),
]