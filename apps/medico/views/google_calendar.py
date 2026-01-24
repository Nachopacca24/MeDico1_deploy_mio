# apps/medico/views/google_calendar.py

from django.shortcuts import redirect
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import requests
from urllib.parse import urlencode
import logging

logger = logging.getLogger(__name__)

# Configuración de Google OAuth
GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email'
]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_calendar_auth(request):
    """
    Inicia el flujo de OAuth de Google Calendar
    Redirige al usuario a la página de autorización de Google
    """
    # Guardar el user_id en la sesión para recuperarlo después
    request.session['google_oauth_user_id'] = request.user.id

    # Parámetros para la URL de autorización de Google
    params = {
        'client_id': settings.GOOGLE_CLIENT_ID,
        'redirect_uri': settings.GOOGLE_REDIRECT_URI,
        'response_type': 'code',
        'scope': ' '.join(SCOPES),
        'access_type': 'offline',  # Para obtener refresh token
        'prompt': 'consent',  # Forzar consentimiento para siempre obtener refresh token
        'state': str(request.user.id),  # Para verificar después
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    logger.info(f"🔗 Redirigiendo usuario {request.user.id} a Google OAuth")

    return Response({
        'auth_url': auth_url,
        'message': 'Redirige al usuario a esta URL'
    })


@api_view(['GET'])
def google_calendar_callback(request):
    """
    Callback de Google OAuth
    Google redirige aquí después de que el usuario autoriza
    """
    code = request.GET.get('code')
    state = request.GET.get('state')
    error = request.GET.get('error')

    # URL del frontend para redirigir
    frontend_url = settings.FRONTEND_URL

    if error:
        logger.error(f"❌ Error en OAuth: {error}")
        return redirect(f"{frontend_url}/calendar?error={error}")

    if not code:
        logger.error("❌ No se recibió código de autorización")
        return redirect(f"{frontend_url}/calendar?error=no_code")

    try:
        # Intercambiar código por tokens
        token_data = {
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': settings.GOOGLE_REDIRECT_URI,
            'grant_type': 'authorization_code',
        }

        logger.info("🔄 Intercambiando código por tokens...")
        token_response = requests.post(GOOGLE_TOKEN_URL, data=token_data)
        token_response.raise_for_status()
        tokens = token_response.json()

        access_token = tokens.get('access_token')
        refresh_token = tokens.get('refresh_token')

        if not access_token:
            logger.error("❌ No se recibió access_token")
            return redirect(f"{frontend_url}/calendar?error=no_token")

        logger.info("✅ Tokens recibidos exitosamente")

        # Redirigir al frontend con el token
        redirect_url = f"{frontend_url}/calendar?access_token={access_token}"
        if refresh_token:
            redirect_url += f"&refresh_token={refresh_token}"

        return redirect(redirect_url)

    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Error al obtener tokens: {str(e)}")
        return redirect(f"{frontend_url}/calendar?error=token_exchange_failed")
    except Exception as e:
        logger.error(f"❌ Error inesperado: {str(e)}")
        return redirect(f"{frontend_url}/calendar?error=unexpected_error")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def google_calendar_refresh(request):
    """
    Endpoint para refrescar el access token usando el refresh token
    """
    refresh_token = request.data.get('refresh_token')

    if not refresh_token:
        return Response(
            {'error': 'refresh_token es requerido'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        token_data = {
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token',
        }

        response = requests.post(GOOGLE_TOKEN_URL, data=token_data)
        response.raise_for_status()
        tokens = response.json()

        return Response({
            'access_token': tokens.get('access_token'),
            'expires_in': tokens.get('expires_in')
        })

    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Error al refrescar token: {str(e)}")
        return Response(
            {'error': 'No se pudo refrescar el token'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def google_calendar_revoke(request):
    """
    Revocar el token de Google Calendar
    """
    token = request.data.get('token')

    if not token:
        return Response(
            {'error': 'token es requerido'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        revoke_url = f'https://oauth2.googleapis.com/revoke?token={token}'
        response = requests.post(revoke_url)
        response.raise_for_status()

        logger.info(f"✅ Token revocado para usuario {request.user.id}")
        return Response({'message': 'Token revocado exitosamente'})

    except Exception as e:
        logger.error(f"❌ Error al revocar token: {str(e)}")
        return Response(
            {'error': 'No se pudo revocar el token'},
            status=status.HTTP_400_BAD_REQUEST
        )