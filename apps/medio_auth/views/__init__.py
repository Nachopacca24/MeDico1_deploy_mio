# apps/medio_auth/views/__init__.py

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

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
                    subject='¡Bienvenido a MéDico1! - Verifica tu email',
                    message=f'''
¡Hola {user.first_name or user.username}!

¡Bienvenido a MéDico1! Estamos encantados de tenerte con nosotros.

Para activar todas las funciones de tu cuenta, verifica tu email:

{verification_url}

Este enlace expirará en 24 horas.

Saludos,
El equipo de MéDico1
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
                subject='Verifica tu email - MéDico1',
                message=f'Hola {user.first_name or user.username}! Verifica tu email: {verification_url}',
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
                subject='Verifica tu email - MéDico1',
                message=f'Hola {user.first_name or user.username}! Aquí está tu nuevo enlace: {verification_url}',
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