# apps/medio_auth/views/__init__.py

import logging
logger = logging.getLogger(__name__)

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.utils.html import escape
from django.db.models import Q
from datetime import timedelta
import requests
import uuid
from apps.medico.models.site_setting import SiteSetting
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.decorators import throttle_classes, api_view, permission_classes
from core.throttles import LoginRateThrottle, RegisterRateThrottle, PasswordResetThrottle, ColleagueSearchThrottle, RefreshTokenThrottle

from ..serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    UserUpdateSerializer,
    ColleagueSerializer,
    FriendshipSerializer,
    FriendRequestSerializer,
)
from ..models import Friendship, FriendRequest

User = get_user_model()


# ============================================
# VISTAS EXISTENTES DE AUTENTICACIÓN
# ============================================

class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()

        # Reactivación: email conocido, cuenta inactiva, ya usó trial → plan free sin trial
        returning = User.objects.filter(email=email, is_active=False, had_trial=True).first()
        if returning:
            password = request.data.get('password', '')
            from django.contrib.auth.password_validation import validate_password as _vp
            from django.core.exceptions import ValidationError as DjangoValidationError
            try:
                _vp(password, returning)
            except DjangoValidationError as e:
                return Response({'password': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

            returning.set_password(password)
            returning.first_name = request.data.get('first_name', '')
            returning.last_name  = request.data.get('last_name', '')
            returning.phone      = request.data.get('phone', '')
            returning.specialty  = request.data.get('specialty', '')
            returning.license_number = request.data.get('license_number', '')
            returning.plan = 'free'
            returning.trial_ends_at = None
            returning.ls_subscription_id = None
            returning.ls_renews_at = None
            returning.ls_cancelled = False
            returning.is_active = True
            returning.deletion_requested_at = None
            returning.is_email_verified = False
            returning.save()

            refresh = RefreshToken.for_user(returning)
            return Response({
                'message': 'Cuenta reactivada. Comenzás con el plan gratuito.',
                'user': UserSerializer(returning).data,
                'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)},
                'email_verification_sent': False,
            }, status=status.HTTP_201_CREATED)

        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()
            trial_days = int(SiteSetting.get('TRIAL_DAYS', '30'))
            user.trial_ends_at = timezone.now() + timedelta(days=trial_days)
            user.plan = 'premium'
            user.had_trial = True
            user.save(update_fields=['trial_ends_at', 'plan', 'had_trial'])
            refresh = RefreshToken.for_user(user)
            user_data = UserSerializer(user).data

            # Generar token de verificación y enviar email
            email_sent = False
            try:
                verification_token = user.generate_verification_token()
                verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}&email={user.email}"
                display_name = escape(user.first_name or user.username)

                send_mail(
                    subject='¡Bienvenido a MeDico App! - Verifica tu email',
                    message=f'¡Bienvenido a MeDico App! Verifica tu email: {verification_url}\n\nEste enlace expira en 24 horas.',
                    html_message=f'''
<div style="background-color:#111827;padding:40px 20px;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#1f2937;border-radius:12px;overflow:hidden;border:1px solid #374151;">
    <div style="background-color:#00BCD4;padding:28px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">MeDico App</h1>
    </div>
    <div style="padding:36px;">
      <h2 style="color:#00BCD4;font-size:20px;font-weight:700;margin:0 0 16px;">¡Bienvenido, {display_name}!</h2>
      <p style="color:#f9fafb;margin:0 0 12px;line-height:1.6;">Estamos encantados de tenerte con nosotros. Para activar todas las funciones de tu cuenta, verifica tu dirección de correo electrónico.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{verification_url}" style="background-color:#00BCD4;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block;font-size:15px;">Verificar mi email</a>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 6px;">O copia y pega esta URL en tu navegador:</p>
      <p style="font-size:12px;word-break:break-all;"><a href="{verification_url}" style="color:#00BCD4;">{verification_url}</a></p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">Este enlace expirará en 24 horas.</p>
    </div>
    <div style="padding:20px 36px;border-top:1px solid #374151;text-align:center;">
      <p style="color:#6b7280;font-size:12px;margin:0;">El equipo de MeDico App</p>
    </div>
  </div>
</div>
                    ''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
                email_sent = True
            except Exception as e:
                print(f"Error enviando email de verificación: {e}")
            
            # Conectar como colegas y registrar referido si vino con referral_code
            referral_code = request.data.get('referral_code', '').strip()
            if referral_code:
                try:
                    referrer = User.objects.get(friend_code=referral_code)
                    if referrer.id != user.id:
                        from apps.medio_auth.models import Friendship
                        Friendship.objects.get_or_create(
                            user=min(referrer, user, key=lambda u: u.id),
                            friend=max(referrer, user, key=lambda u: u.id),
                        )
                        _apply_referral(user, referrer)
                except Exception:
                    pass  # No bloquear el registro por ningún error de referral

            return Response({
                'message': 'Usuario registrado exitosamente',
                'user': user_data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'email_verification_sent': email_sent
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            user.check_trial_expiry()
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            refresh = RefreshToken.for_user(user)
            user_data = UserSerializer(user).data

            return Response({
                'message': 'Login exitoso',
                'user': user_data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            
            if not refresh_token:
                return Response(
                    {'error': 'Se requiere el refresh token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response(
                {'message': 'Logout exitoso'},
                status=status.HTTP_200_OK
            )
        except TokenError:
            return Response(
                {'error': 'Token inválido o expirado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception("Unexpected error during logout for user %s", request.user.id)
            return Response(
                {'error': 'Error al cerrar sesión. Intentá de nuevo.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RefreshTokenThrottle]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            
            if not refresh_token:
                return Response(
                    {'error': 'Se requiere el refresh token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            token = RefreshToken(refresh_token)
            
            return Response({
                'access': str(token.access_token),
            }, status=status.HTTP_200_OK)
        except TokenError:
            return Response(
                {'error': 'Token inválido o expirado'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        request.user.check_trial_expiry()
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=False,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            user_data = UserSerializer(request.user).data
            return Response({
                'message': 'Perfil actualizado exitosamente',
                'user': user_data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            user_data = UserSerializer(request.user).data
            return Response({
                'message': 'Perfil actualizado exitosamente',
                'user': user_data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            # Invalidate all existing sessions so stolen tokens can't be reused
            try:
                from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
                for token in OutstandingToken.objects.filter(user=request.user):
                    BlacklistedToken.objects.get_or_create(token=token)
            except Exception:
                pass
            return Response({'message': 'Contraseña cambiada exitosamente'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# VISTAS DE VERIFICACIÓN DE EMAIL
# ============================================

class SendVerificationEmailView(APIView):
    """
    Envía email de verificación a un usuario por su email.
    Público - no requiere autenticación.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'Email es requerido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Por seguridad, no revelar si el email existe
            return Response(
                {'message': 'Si el email existe, se enviará un código de verificación'}, 
                status=status.HTTP_200_OK
            )
        
        if user.is_email_verified:
            return Response(
                {'message': 'Este email ya está verificado'}, 
                status=status.HTTP_200_OK
            )
        
        # Limitar reenvíos (no más de 1 cada 5 minutos)
        if user.email_verification_sent_at:
            time_since_last = timezone.now() - user.email_verification_sent_at
            if time_since_last < timedelta(minutes=5):
                minutes_left = 5 - (time_since_last.seconds // 60)
                return Response(
                    {'error': f'Debes esperar {minutes_left} minutos antes de solicitar otro email'}, 
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
        
        # Generar token y enviar email
        try:
            token = user.generate_verification_token()
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}&email={user.email}"
            display_name = escape(user.first_name or user.username)

            send_mail(
                subject='Verifica tu email - MeDico App',
                message=f'Hola {user.first_name or user.username}! Verifica tu email: {verification_url}\n\nEste enlace expira en 24 horas.',
                html_message=f'''
<div style="background-color:#111827;padding:40px 20px;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#1f2937;border-radius:12px;overflow:hidden;border:1px solid #374151;">
    <div style="background-color:#00BCD4;padding:28px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">MeDico App</h1>
    </div>
    <div style="padding:36px;">
      <h2 style="color:#00BCD4;font-size:20px;font-weight:700;margin:0 0 16px;">Verifica tu email</h2>
      <p style="color:#f9fafb;margin:0 0 12px;line-height:1.6;">Hola <strong style="color:#ffffff;">{display_name}</strong>, has solicitado verificar tu cuenta en MeDico App.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{verification_url}" style="background-color:#00BCD4;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block;font-size:15px;">Verificar mi email</a>
      </div>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">Este enlace expirará en 24 horas.</p>
    </div>
    <div style="padding:20px 36px;border-top:1px solid #374151;text-align:center;">
      <p style="color:#6b7280;font-size:12px;margin:0;">El equipo de MeDico App</p>
    </div>
  </div>
</div>
                ''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

            return Response({
                'message': 'Email de verificación enviado correctamente',
                'email': email
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error enviando email: {e}")
            return Response(
                {'error': 'Error al enviar el email de verificación'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyEmailView(APIView):
    """
    Verifica el email usando el token.
    Público - no requiere autenticación.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get('token')
        
        if not token:
            return Response(
                {'error': 'Token es requerido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email_verification_token=token)
        except User.DoesNotExist:
            return Response(
                {'error': 'Token inválido o expirado'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if user.is_email_verified:
            return Response(
                {'message': 'Este email ya ha sido verificado previamente'}, 
                status=status.HTTP_200_OK
            )
        
        # Verificar expiración (24 horas)
        if user.email_verification_sent_at:
            expiration_time = user.email_verification_sent_at + timedelta(hours=24)
            if timezone.now() > expiration_time:
                return Response(
                    {'error': 'El token ha expirado. Solicita uno nuevo.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Verificar email
        user.is_email_verified = True
        user.clear_verification_token()
        
        return Response({
            'message': 'Email verificado correctamente',
            'email': user.email,
            'username': user.username
        }, status=status.HTTP_200_OK)


class ResendVerificationEmailView(APIView):
    """
    Reenvía el email de verificación al usuario autenticado.
    Requiere autenticación JWT.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        if user.is_email_verified:
            return Response(
                {'message': 'Tu email ya está verificado'}, 
                status=status.HTTP_200_OK
            )
        
        # Limitar reenvíos
        if user.email_verification_sent_at:
            time_since_last = timezone.now() - user.email_verification_sent_at
            if time_since_last < timedelta(minutes=5):
                minutes_left = 5 - (time_since_last.seconds // 60)
                return Response(
                    {'error': f'Debes esperar {minutes_left} minutos antes de solicitar otro email'}, 
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
        
        try:
            token = user.generate_verification_token()
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}&email={user.email}"
            display_name = escape(user.first_name or user.username)

            send_mail(
                subject='Nuevo enlace de verificación - MeDico App',
                message=f'Hola {user.first_name or user.username}! Tu nuevo enlace de verificación: {verification_url}\n\nEste enlace expira en 24 horas.',
                html_message=f'''
<div style="background-color:#111827;padding:40px 20px;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#1f2937;border-radius:12px;overflow:hidden;border:1px solid #374151;">
    <div style="background-color:#00BCD4;padding:28px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">MeDico App</h1>
    </div>
    <div style="padding:36px;">
      <h2 style="color:#00BCD4;font-size:20px;font-weight:700;margin:0 0 16px;">Nuevo enlace de verificación</h2>
      <p style="color:#f9fafb;margin:0 0 12px;line-height:1.6;">Hola <strong style="color:#ffffff;">{display_name}</strong>, aquí tienes un nuevo enlace para verificar tu cuenta en MeDico App.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{verification_url}" style="background-color:#00BCD4;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block;font-size:15px;">Verificar mi email</a>
      </div>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">Este enlace expirará en 24 horas.</p>
    </div>
    <div style="padding:20px 36px;border-top:1px solid #374151;text-align:center;">
      <p style="color:#6b7280;font-size:12px;margin:0;">El equipo de MeDico App</p>
    </div>
  </div>
</div>
                ''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

            return Response({
                'message': 'Email de verificación reenviado correctamente'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error enviando email: {e}")
            return Response(
                {'error': 'Error al enviar el email'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CheckVerificationStatusView(APIView):
    """
    Verifica el estado de verificación del email del usuario.
    Requiere autenticación JWT.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        can_resend = True
        if user.email_verification_sent_at:
            time_since_last = timezone.now() - user.email_verification_sent_at
            can_resend = time_since_last >= timedelta(minutes=5)
        
        return Response({
            'is_email_verified': user.is_email_verified,
            'email': user.email,
            'username': user.username,
            'can_resend': can_resend
        }, status=status.HTTP_200_OK)


# ============================================
# NUEVAS VISTAS DE AMISTAD/COLEGAS
# ============================================

class SearchColleagueView(APIView):
    """
    Buscar un colega por su friend_code
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ColleagueSearchThrottle]

    def post(self, request):
        friend_code = request.data.get('friend_code', '').strip().upper()
        
        if not friend_code:
            return Response(
                {'error': 'El código de colega es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # No permitir buscar el propio código
        if friend_code == request.user.friend_code:
            return Response(
                {'error': 'No puedes agregarte a ti mismo como colega'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            colleague = User.objects.get(friend_code=friend_code)
        except User.DoesNotExist:
            return Response(
                {'error': 'No se encontró ningún usuario con ese código'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar si ya son amigos
        are_friends = Friendship.objects.filter(
            Q(user=request.user, friend=colleague) |
            Q(user=colleague, friend=request.user)
        ).exists()
        
        # Verificar si ya existe una solicitud pendiente
        pending_request = FriendRequest.objects.filter(
            Q(from_user=request.user, to_user=colleague, status='pending') |
            Q(from_user=colleague, to_user=request.user, status='pending')
        ).exists()
        
        colleague_data = ColleagueSerializer(colleague).data
        colleague_data['are_friends'] = are_friends
        colleague_data['pending_request'] = pending_request
        
        return Response(colleague_data, status=status.HTTP_200_OK)


class SendFriendRequestView(APIView):
    """
    Enviar una solicitud de amistad a otro usuario por su friend_code
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ColleagueSearchThrottle]

    def post(self, request):
        friend_code = request.data.get('friend_code', '').strip().upper()
        
        if not friend_code:
            return Response(
                {'error': 'El código de colega es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # No permitir enviar solicitud a uno mismo
        if friend_code == request.user.friend_code:
            return Response(
                {'error': 'No puedes enviarte una solicitud a ti mismo'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Límite de plan gratuito
        if request.user.plan == 'free':
            colleague_count = Friendship.objects.filter(
                Q(user=request.user) | Q(friend=request.user)
            ).count()
            if colleague_count >= 3:
                return Response(
                    {'error': 'Plan gratuito: máximo 3 colegas. Actualiza a Premium para colegas ilimitados.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        try:
            to_user = User.objects.get(friend_code=friend_code)
        except User.DoesNotExist:
            return Response(
                {'error': 'No se encontró ningún usuario con ese código'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar si ya son amigos
        are_friends = Friendship.objects.filter(
            Q(user=request.user, friend=to_user) |
            Q(user=to_user, friend=request.user)
        ).exists()
        
        if are_friends:
            return Response(
                {'error': 'Ya son colegas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar si ya existe una solicitud pendiente
        existing_request = FriendRequest.objects.filter(
            Q(from_user=request.user, to_user=to_user) |
            Q(from_user=to_user, to_user=request.user)
        ).filter(status='pending').first()
        
        if existing_request:
            return Response(
                {'error': 'Ya existe una solicitud pendiente'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear la solicitud
        friend_request = FriendRequest.objects.create(
            from_user=request.user,
            to_user=to_user,
            status='pending'
        )

        # Notificar al receptor que llegó una solicitud de colega
        try:
            from apps.medico.services.firebase import notify_user
            sender_name = request.user.get_full_name() or request.user.username
            notify_user(
                to_user,
                title='Nueva solicitud de colega',
                body=f'{sender_name} quiere agregarte como colega en MeDico App.',
                data={'route': '/colleagues'},
            )
        except Exception:
            logger.exception('Error sending colleague request notification to user=%s', to_user.pk)

        serializer = FriendRequestSerializer(friend_request)

        return Response({
            'message': 'Solicitud enviada correctamente',
            'friend_request': serializer.data
        }, status=status.HTTP_201_CREATED)


class ListColleaguesView(APIView):
    """
    Listar todos los colegas (amigos) del usuario autenticado
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Obtener todas las amistades donde el usuario participa
        friendships = Friendship.objects.filter(
            Q(user=user) | Q(friend=user)
        ).select_related('user', 'friend')
        
        # Extraer los colegas
        colleagues = []
        for friendship in friendships:
            if friendship.user == user:
                colleagues.append(friendship.friend)
            else:
                colleagues.append(friendship.user)
        
        serializer = ColleagueSerializer(colleagues, many=True)
        
        return Response({
            'count': len(colleagues),
            'colleagues': serializer.data
        }, status=status.HTTP_200_OK)


class ListFriendRequestsView(APIView):
    """
    Listar todas las solicitudes de amistad del usuario (enviadas y recibidas)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Solicitudes recibidas (pendientes)
        received_requests = FriendRequest.objects.filter(
            to_user=user,
            status='pending'
        ).select_related('from_user', 'to_user')

        # Solicitudes enviadas (pendientes)
        sent_requests = FriendRequest.objects.filter(
            from_user=user,
            status='pending'
        ).select_related('from_user', 'to_user')
        
        received_serializer = FriendRequestSerializer(received_requests, many=True)
        sent_serializer = FriendRequestSerializer(sent_requests, many=True)
        
        return Response({
            'received': {
                'count': received_requests.count(),
                'requests': received_serializer.data
            },
            'sent': {
                'count': sent_requests.count(),
                'requests': sent_serializer.data
            }
        }, status=status.HTTP_200_OK)


class AcceptFriendRequestView(APIView):
    """
    Aceptar una solicitud de amistad
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        try:
            friend_request = FriendRequest.objects.get(
                id=request_id,
                to_user=request.user,
                status='pending'
            )
        except FriendRequest.DoesNotExist:
            return Response(
                {'error': 'Solicitud no encontrada o ya procesada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar límite de plan gratuito del usuario que acepta
        if request.user.plan == 'free':
            colleague_count = Friendship.objects.filter(
                Q(user=request.user) | Q(friend=request.user)
            ).count()
            if colleague_count >= 3:
                return Response(
                    {'error': 'Plan gratuito: máximo 3 colegas. Actualiza a Premium para aceptar más colegas.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Marcar solicitud como aceptada
        friend_request.status = 'accepted'
        friend_request.save()

        # Crear la amistad bidireccional
        Friendship.objects.create(
            user=friend_request.from_user,
            friend=friend_request.to_user
        )
        
        return Response({
            'message': 'Solicitud aceptada correctamente',
            'colleague': ColleagueSerializer(friend_request.from_user).data
        }, status=status.HTTP_200_OK)


class RejectFriendRequestView(APIView):
    """
    Rechazar una solicitud de amistad
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        try:
            friend_request = FriendRequest.objects.get(
                id=request_id,
                to_user=request.user,
                status='pending'
            )
        except FriendRequest.DoesNotExist:
            return Response(
                {'error': 'Solicitud no encontrada o ya procesada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Marcar solicitud como rechazada
        friend_request.status = 'rejected'
        friend_request.save()
        
        return Response({
            'message': 'Solicitud rechazada correctamente'
        }, status=status.HTTP_200_OK)


class RemoveColleagueView(APIView):
    """
    Eliminar un colega (terminar la amistad)
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, colleague_id):
        try:
            colleague = User.objects.get(id=colleague_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Buscar la amistad (puede estar en cualquier dirección)
        friendship = Friendship.objects.filter(
            Q(user=request.user, friend=colleague) |
            Q(user=colleague, friend=request.user)
        ).first()
        
        if not friendship:
            return Response(
                {'error': 'No existe una relación de colegas con este usuario'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Eliminar la amistad
        friendship.delete()
        
        return Response({
            'message': 'Colega eliminado correctamente'
        }, status=status.HTTP_200_OK)


# SOCIAL AUTHENTICATION (GOOGLE)
# ============================================

class GoogleLoginView(APIView):
    """
    Inicia sesión o registra a un usuario mediante Google OAuth.
    Soporta tanto ID Tokens (JWT) como Access Tokens (OAuth2).
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get('token')
        
        if not token:
            return Response(
                {'error': 'Se requiere el token de Google'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        idinfo = None
        
        # 1. Intentar validar como ID Token (JWT)
        try:
            idinfo = id_token.verify_oauth2_token(
                token, 
                google_requests.Request(), 
                settings.GOOGLE_CLIENT_ID
            )
            # Verificar el emisor para ID Token
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                idinfo = None
        except Exception:
            # Si falla, idinfo permanece None y probaremos como Access Token
            pass

        # 2. Si no es un ID Token válido, intentar como Access Token
        if not idinfo:
            try:
                # Consultar el endpoint de usuario de Google usando el Access Token
                response = requests.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    headers={'Authorization': f'Bearer {token}'},
                    timeout=5
                )
                if response.status_code == 200:
                    idinfo = response.json()
                    # Normalizar nombres de campos para que coincidan con idinfo del ID Token
                    if 'sub' in idinfo and 'email' in idinfo:
                        # Éxito obteniendo info del Access Token
                        pass
                    else:
                        idinfo = None
                else:
                    return Response(
                        {'error': 'Token de Google inválido o expirado'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
            except Exception as e:
                logger.exception("Error verifying Google access token")
                return Response(
                    {'error': 'Error verificando token de Google. Intentá de nuevo.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if not idinfo:
            return Response(
                {'error': 'No se pudo validar la identidad con Google'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        email = idinfo.get('email')
        first_name = idinfo.get('given_name', idinfo.get('name', '').split(' ')[0])
        last_name = idinfo.get('family_name', ' '.join(idinfo.get('name', '').split(' ')[1:]))
        
        if not email:
            return Response(
                {'error': 'No se pudo obtener el email de Google'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Buscar o crear el usuario
            user = User.objects.filter(email=email).first()
            created = False
            
            if not user:
                base_username = email.split('@')[0]
                unique_username = f"{base_username}_{uuid.uuid4().hex[:6]}"

                user = User.objects.create(
                    email=email,
                    username=unique_username,
                    first_name=first_name,
                    last_name=last_name,
                    is_email_verified=True,
                    role=1,
                    trial_ends_at=timezone.now() + timedelta(days=int(SiteSetting.get('TRIAL_DAYS', '30'))),
                    plan='premium',
                    had_trial=True,
                )
                user.set_unusable_password()
                user.save(update_fields=['password'])
                created = True
            else:
                # Verificar si la cuenta está pendiente de eliminación
                if user.deletion_requested_at:
                    deletion_date = (user.deletion_requested_at + timedelta(days=30)).strftime('%d/%m/%Y')
                    return Response(
                        {'error': f'Esta cuenta está programada para eliminación el {deletion_date}. Si fue un error, contactá a soporte en contacto@medicoapp.app.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                # Cuenta inactiva con trial usado → reactivar sin trial (anti-abuso)
                if not user.is_active and user.had_trial:
                    user.first_name = first_name
                    user.last_name = last_name
                    user.plan = 'free'
                    user.trial_ends_at = None
                    user.ls_subscription_id = None
                    user.ls_renews_at = None
                    user.ls_cancelled = False
                    user.is_active = True
                    user.deletion_requested_at = None
                    user.is_email_verified = True
                    user.set_unusable_password()
                    user.save()
                    created = True
                elif not user.is_active:
                    return Response(
                        {'error': 'Esta cuenta está desactivada. Contactá a soporte en contacto@medicoapp.app.'},
                        status=status.HTTP_403_FORBIDDEN
                    )

            # Autoverificar email si viene de Google
            if not user.is_email_verified:
                user.is_email_verified = True
                user.save(update_fields=['is_email_verified'])

            user.check_trial_expiry()
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])

            # Referral solo para usuarios nuevos
            if created:
                referral_code = request.data.get('referral_code', '').strip()
                if referral_code:
                    try:
                        referrer = User.objects.get(friend_code=referral_code)
                        if referrer.id != user.id:
                            from apps.medio_auth.models import Friendship
                            Friendship.objects.get_or_create(
                                user=min(referrer, user, key=lambda u: u.id),
                                friend=max(referrer, user, key=lambda u: u.id),
                            )
                            _apply_referral(user, referrer)
                    except Exception:
                        pass

            # Generar tokens nativos
            refresh = RefreshToken.for_user(user)
            user_data = UserSerializer(user).data

            return Response({
                'message': 'Login con Google exitoso' if not created else 'Registro con Google exitoso',
                'user': user_data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.exception("Error during Google login/registration")
            return Response(
                {'error': 'Error interno. Intentá de nuevo.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# ELIMINACIÓN DE CUENTA
# ============================================

class DeleteAccountView(APIView):
    """
    Solicitud de eliminación de cuenta (soft delete).
    - La cuenta se desactiva inmediatamente (el usuario no puede volver a entrar).
    - Se notifica al admin por email.
    - La eliminación definitiva ocurre a los 30 días mediante el comando
      manage.py delete_pending_accounts.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user

        # Verificar que no tenga ya una solicitud pendiente
        if user.deletion_requested_at:
            return Response(
                {'error': 'Ya existe una solicitud de eliminación pendiente para esta cuenta.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Confirmar identidad: todos los usuarios escriben "ELIMINAR"
        # (usuarios con contraseña pueden además confirmar con su password)
        confirmation = request.data.get('confirmation', '')
        password = request.data.get('password', '')

        if confirmation == 'ELIMINAR':
            pass  # confirmación válida para cualquier usuario
        elif user.has_usable_password() and password:
            if not user.check_password(password):
                return Response(
                    {'error': 'Contraseña incorrecta.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {'error': 'Escribí ELIMINAR en el campo de confirmación para continuar.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Cancelar suscripción de Lemon Squeezy si tiene una activa
            from apps.payment.views import cancel_ls_subscription_for_user
            sub_cancelled = cancel_ls_subscription_for_user(user)
            if not sub_cancelled:
                logger.warning(
                    'DeleteAccount: subscription cancellation failed for user=%s — proceeding anyway',
                    user.id
                )

            # Revocar y eliminar token de Google Calendar si existe
            try:
                from apps.medico.models.google_calendar_token import GoogleCalendarToken
                import requests as http_requests
                gc_token = GoogleCalendarToken.objects.filter(user=user).first()
                if gc_token:
                    access_token = gc_token.get_access_token()
                    if access_token:
                        http_requests.post(
                            'https://oauth2.googleapis.com/revoke',
                            params={'token': access_token},
                            timeout=5,
                        )
                    gc_token.delete()
            except Exception:
                pass  # best-effort — no bloquear la eliminación de cuenta

            # Invalidar refresh token
            refresh_token = request.data.get('refresh')
            if refresh_token:
                try:
                    RefreshToken(refresh_token).blacklist()
                except TokenError:
                    pass

            # Soft delete: desactivar cuenta y registrar fecha de solicitud
            user.is_active = False
            user.deletion_requested_at = timezone.now()
            user.save(update_fields=['is_active', 'deletion_requested_at'])

            # Notificar al admin por email
            deletion_date = (timezone.now() + timedelta(days=30)).strftime('%d/%m/%Y')
            sub_status = 'Cancelada correctamente' if sub_cancelled else '⚠ Error al cancelar — revisar en Lemon Squeezy'
            try:
                send_mail(
                    subject=f'[MeDico App App] Solicitud de eliminación de cuenta — {user.email}',
                    message=(
                        f'El usuario {user.get_full_name() or user.username} ({user.email}) '
                        f'solicitó eliminar su cuenta.\n\n'
                        f'ID de usuario: {user.id}\n'
                        f'Especialidad: {user.specialty or "No especificada"}\n'
                        f'Plan: {user.plan}\n'
                        f'Suscripción Lemon Squeezy: {sub_status}\n'
                        f'Fecha de solicitud: {timezone.now().strftime("%d/%m/%Y %H:%M")} UTC\n'
                        f'Fecha de eliminación definitiva: {deletion_date}\n\n'
                        f'La cuenta fue desactivada inmediatamente. '
                        f'Para cancelar la eliminación antes de esa fecha, '
                        f'reactivá la cuenta desde el panel de administración.'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[settings.DEFAULT_FROM_EMAIL],
                    fail_silently=True,
                )
            except Exception:
                pass  # El email de aviso no debe bloquear el proceso

            logger.info(
                "Account deletion requested: user=%s id=%s scheduled_for=%s",
                user.email, user.id, deletion_date
            )
            return Response(
                {
                    'message': (
                        'Tu cuenta fue desactivada. '
                        f'Los datos serán eliminados definitivamente el {deletion_date}. '
                        'Si fue un error, contacta a soporte en contacto@medicoapp.app.'
                    )
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.exception("Error processing account deletion for user %s", user.id)
            return Response(
                {'error': 'Error al procesar la solicitud. Intentá de nuevo.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# PASSWORD RESET
# ============================================

class ForgotPasswordView(APIView):
    """
    Paso 1: el usuario ingresa su email y recibe un link de reseteo.
    Siempre responde 200 para no revelar si el email existe.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response(
                {'error': 'El email es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
            token = user.generate_password_reset_token()
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}&email={user.email}"
            display_name = escape(user.first_name or user.username)

            logger.info("Sending password reset email to %s (backend: %s, host: %s)",
                        user.email, settings.EMAIL_BACKEND, settings.EMAIL_HOST)
            try:
                send_mail(
                    subject='Restablecer contraseña — MeDico App',
                    message=f'Usá este link para restablecer tu contraseña: {reset_url}\n\nExpira en 1 hora.',
                    html_message=f'''
<div style="background-color:#111827;padding:40px 20px;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#1f2937;border-radius:12px;overflow:hidden;border:1px solid #374151;">
    <div style="background-color:#00BCD4;padding:28px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">MeDico App</h1>
    </div>
    <div style="padding:36px;">
      <h2 style="color:#00BCD4;font-size:20px;font-weight:700;margin:0 0 16px;">Restablecer contraseña</h2>
      <p style="color:#f9fafb;margin:0 0 12px;line-height:1.6;">Hola <strong style="color:#ffffff;">{display_name}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta en MeDico App.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{reset_url}" style="background-color:#00BCD4;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block;font-size:15px;">Restablecer contraseña</a>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 8px;">Este enlace expira en <strong style="color:#f9fafb;">1 hora</strong>.</p>
      <p style="color:#6b7280;font-size:12px;margin:0;">Si no solicitaste esto, ignorá este correo.</p>
    </div>
    <div style="padding:20px 36px;border-top:1px solid #374151;text-align:center;">
      <p style="color:#6b7280;font-size:12px;margin:0;">El equipo de MeDico App</p>
    </div>
  </div>
</div>
                    ''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                logger.info("Password reset email sent successfully to %s", user.email)
            except Exception as mail_error:
                logger.error("Failed to send password reset email to %s: %s",
                             user.email, str(mail_error), exc_info=True)
        except User.DoesNotExist:
            pass  # No revelar si el email existe

        return Response(
            {'message': 'Si ese email está registrado, recibirás instrucciones en breve.'},
            status=status.HTTP_200_OK
        )


class ResetPasswordView(APIView):
    """
    Paso 2: el usuario envía el token y la nueva contraseña.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        token = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not token or not new_password:
            return Response(
                {'error': 'Token y nueva contraseña son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != confirm_password:
            return Response(
                {'error': 'Las contraseñas no coinciden'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            django_validate_password(new_password)
        except DjangoValidationError as e:
            return Response(
                {'error': ' '.join(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(password_reset_token=token)
        except User.DoesNotExist:
            return Response(
                {'error': 'Token inválido o expirado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar expiración (1 hora)
        if not user.password_reset_sent_at:
            return Response(
                {'error': 'Token inválido o expirado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        expiry = user.password_reset_sent_at + timedelta(hours=1)
        if timezone.now() > expiry:
            user.clear_password_reset_token()
            return Response(
                {'error': 'El token expiró. Solicitá uno nuevo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save(update_fields=['password'])
        user.clear_password_reset_token()
        # Invalidate all existing sessions after password reset
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            for token in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=token)
        except Exception:
            pass

        return Response(
            {'message': 'Contraseña restablecida exitosamente. Ya podés iniciar sesión.'},
            status=status.HTTP_200_OK
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_tutorial(request):
    """Mark the onboarding tutorial as completed for the authenticated user."""
    request.user.tutorial_completed = True
    request.user.save(update_fields=['tutorial_completed'])
    return Response({'ok': True})


def _apply_referral(new_user, referrer):
    """Registra referred_by y aplica recompensa al referidor si corresponde."""
    if new_user.referred_by_id:
        return  # ya tiene referidor, no pisar
    new_user.referred_by = referrer
    new_user.save(update_fields=['referred_by'])
    referral_count = User.objects.filter(referred_by=referrer).count()
    if referral_count > 0 and referral_count % 5 == 0:
        base = max(referrer.trial_ends_at or timezone.now(), timezone.now())
        referrer.trial_ends_at = base + timedelta(days=10)
        if referrer.plan == 'free':
            referrer.plan = 'premium'
        referrer.save(update_fields=['trial_ends_at', 'plan'])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def referral_stats(request):
    count = User.objects.filter(referred_by=request.user).count()
    threshold = 5
    rewards_given = count // threshold
    progress = count % threshold
    return Response({
        'count': count,
        'progress': progress,
        'threshold': threshold,
        'rewards_given': rewards_given,
        'reward_days': 10,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_invite(request):
    """Crea una amistad directa a partir de un friend_code de invitación."""
    friend_code = request.data.get('friend_code', '').strip().upper()
    if not friend_code:
        return Response({'error': 'Código requerido'}, status=400)
    try:
        other = User.objects.get(friend_code=friend_code)
    except User.DoesNotExist:
        return Response({'error': 'Código inválido'}, status=404)
    if other == request.user:
        return Response({'error': 'No podés agregarte a vos mismo'}, status=400)
    from apps.medio_auth.models import Friendship
    # Enforce free plan colleague limit
    if request.user.plan == 'free':
        colleague_count = Friendship.objects.filter(
            Q(user=request.user) | Q(friend=request.user)
        ).count()
        if colleague_count >= 3:
            return Response(
                {'error': 'Plan gratuito: máximo 3 colegas. Actualizá a Premium para colegas ilimitados.'},
                status=status.HTTP_403_FORBIDDEN,
            )
    _, created = Friendship.objects.get_or_create(
        user=min(other, request.user, key=lambda u: u.id),
        friend=max(other, request.user, key=lambda u: u.id),
    )
    return Response({
        'ok': True,
        'created': created,
        'colleague_name': f"{other.first_name} {other.last_name}".strip() or other.username,
    })
