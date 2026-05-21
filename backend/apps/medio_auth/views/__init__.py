# apps/medio_auth/views/__init__.py

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
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from core.throttles import LoginRateThrottle, RegisterRateThrottle, PasswordResetThrottle

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
        serializer = RegisterSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            user_data = UserSerializer(user).data
            
            # Generar token de verificación y enviar email
            email_sent = False
            try:
                verification_token = user.generate_verification_token()
                verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
                
                send_mail(
                    subject='¡Bienvenido a MéDico! - Verifica tu email',
                    message=f'''
¡Hola {user.first_name or user.username}!

¡Bienvenido a MéDico! Estamos encantados de tenerte con nosotros.

Para activar todas las funciones de tu cuenta, verifica tu email:

{verification_url}

Este enlace expirará en 24 horas.

Saludos,
El equipo de MéDico
                    ''',
                html_message=f'''
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #2563eb;">¡Bienvenido a MéDico!</h2>
                    <p>Hola <strong>{user.first_name or user.username}</strong>,</p>
                    <p>Estamos encantados de tenerte con nosotros. Para activar todas las funciones de tu cuenta, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente enlace:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verificar mi email</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">O copia y pega esta URL en tu navegador:</p>
                    <p style="color: #666; font-size: 14px; word-break: break-all;"><a href="{verification_url}">{verification_url}</a></p>
                    <p style="color: #999; font-size: 12px; margin-top: 40px;">Este enlace expirará en 24 horas.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="color: #999; font-size: 12px; text-align: center;">El equipo de MéDico</p>
                </div>
                ''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
                email_sent = True
            except Exception as e:
                print(f"Error enviando email de verificación: {e}")
            
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
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

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
            return Response({
                'message': 'Contraseña cambiada exitosamente'
            }, status=status.HTTP_200_OK)
        
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
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
            
            send_mail(
                subject='Verifica tu email - MéDico',
                message=f'Hola {user.first_name or user.username}! Verifica tu email usando el siguiente enlace: {verification_url}',
                html_message=f'''
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #2563eb;">Verificación de email</h2>
                    <p>Hola <strong>{user.first_name or user.username}</strong>,</p>
                    <p>Has solicitado verificar tu cuenta. Por favor haz clic en el siguiente enlace:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verificar mi email</a>
                    </div>
                    <p style="color: #999; font-size: 12px; margin-top: 40px;">Este enlace expirará en 24 horas.</p>
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
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
            
            send_mail(
                subject='Verifica tu email - MéDico',
                message=f'Hola {user.first_name or user.username}! Aquí está tu nuevo enlace para verificar tu email: {verification_url}',
                html_message=f'''
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #2563eb;">Verificación de email (Nuevo enlace)</h2>
                    <p>Hola <strong>{user.first_name or user.username}</strong>,</p>
                    <p>Aquí tienes un nuevo enlace para verificar tu cuenta en MéDico. Por favor haz clic a continuación:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verificar mi email</a>
                    </div>
                    <p style="color: #999; font-size: 12px; margin-top: 40px;">Este enlace expirará en 24 horas.</p>
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
        )
        
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
        )
        
        # Solicitudes enviadas (pendientes)
        sent_requests = FriendRequest.objects.filter(
            from_user=user,
            status='pending'
        )
        
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
                return Response(
                    {'error': f'Error verificando Access Token: {str(e)}'},
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
                    role=1
                )
                created = True
            
            # Autoverificar email si viene de Google
            if not user.is_email_verified:
                user.is_email_verified = True
                user.save(update_fields=['is_email_verified'])
            
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
            return Response(
                {'error': f'Error en la base de datos: {str(e)}'},
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
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            display_name = escape(user.first_name or user.username)

            send_mail(
                subject='Restablecer contraseña — MéDico',
                message=f'Usá este link para restablecer tu contraseña: {reset_url}\n\nExpira en 1 hora.',
                html_message=f'''
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #2563eb;">Restablecer contraseña</h2>
                    <p>Hola <strong>{display_name}</strong>,</p>
                    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en MéDico.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            Restablecer contraseña
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">Este link expira en <strong>1 hora</strong>.</p>
                    <p style="color: #999; font-size: 12px;">Si no solicitaste esto, ignorá este correo.</p>
                </div>
                ''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
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

        return Response(
            {'message': 'Contraseña restablecida exitosamente. Ya podés iniciar sesión.'},
            status=status.HTTP_200_OK
        )
