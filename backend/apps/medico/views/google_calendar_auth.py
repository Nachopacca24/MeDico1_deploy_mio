import requests
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.medico.models.google_calendar_token import GoogleCalendarToken

GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
# Must match exactly what's registered in Google Cloud Console and sent by the frontend
REDIRECT_URI = 'https://medicoapp.app/calendar'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def connect_google_calendar(request):
    """Exchange a one-time auth code for access + refresh tokens and persist them."""
    code = request.data.get('code')
    if not code:
        return Response({'error': 'code requerido'}, status=status.HTTP_400_BAD_REQUEST)

    resp = requests.post(GOOGLE_TOKEN_URL, data={
        'code': code,
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI,
        'grant_type': 'authorization_code',
    }, timeout=10)

    if not resp.ok:
        try:
            google_error = resp.json()
        except Exception:
            google_error = resp.text
        return Response(
            {'error': f'Google rechazó el código: {google_error}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    token_data = resp.json()
    access_token = token_data.get('access_token')
    refresh_token = token_data.get('refresh_token')
    expires_in = int(token_data.get('expires_in', 3600))

    if not access_token or not refresh_token:
        return Response(
            {'error': 'Google no devolvió refresh_token. Revoca el acceso en myaccount.google.com y reintenta.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = ''
    try:
        info = requests.get(
            'https://www.googleapis.com/oauth2/v3/tokeninfo',
            params={'access_token': access_token},
            timeout=5,
        )
        if info.ok:
            email = info.json().get('email', '')
    except Exception:
        pass

    expiry = timezone.now() + timedelta(seconds=expires_in)
    try:
        token_obj = GoogleCalendarToken.objects.get(user=request.user)
    except GoogleCalendarToken.DoesNotExist:
        token_obj = GoogleCalendarToken(user=request.user)
    token_obj.set_refresh_token(refresh_token)
    token_obj.set_access_token(access_token)
    token_obj.token_expiry = expiry
    token_obj.google_email = email
    token_obj.save()

    return Response({'access_token': access_token, 'email': email, 'expires_in': expires_in})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_google_token(request):
    """Return a valid access token, transparently refreshing it when needed."""
    try:
        token_obj = GoogleCalendarToken.objects.get(user=request.user)
    except GoogleCalendarToken.DoesNotExist:
        return Response({'connected': False}, status=status.HTTP_404_NOT_FOUND)

    # Refresh proactively when fewer than 5 minutes remain
    if timezone.now() >= token_obj.token_expiry - timedelta(minutes=5):
        refresh_token = token_obj.get_refresh_token()
        if not refresh_token:
            token_obj.delete()
            return Response({'connected': False}, status=status.HTTP_404_NOT_FOUND)

        resp = requests.post(GOOGLE_TOKEN_URL, data={
            'refresh_token': refresh_token,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'grant_type': 'refresh_token',
        }, timeout=10)

        if not resp.ok:
            return Response(
                {'connected': False, 'error': 'refresh_failed'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token_data = resp.json()
        access_token = token_data.get('access_token')
        expires_in = int(token_data.get('expires_in', 3600))
        token_obj.set_access_token(access_token)
        token_obj.token_expiry = timezone.now() + timedelta(seconds=expires_in)
        token_obj.save()
    else:
        access_token = token_obj.get_access_token()

    seconds_left = int((token_obj.token_expiry - timezone.now()).total_seconds())
    return Response({
        'connected': True,
        'access_token': access_token,
        'email': token_obj.google_email,
        'expires_in': max(seconds_left, 0),
        'calendar_color_id': token_obj.calendar_color_id or '',
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_calendar_status(request):
    """Check whether the current user has a stored Google Calendar connection."""
    try:
        token_obj = GoogleCalendarToken.objects.get(user=request.user)
        return Response({'connected': True, 'email': token_obj.google_email})
    except GoogleCalendarToken.DoesNotExist:
        return Response({'connected': False})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_calendar_preferences(request):
    """Guarda preferencias del calendario (por ahora: color de eventos)."""
    try:
        token_obj = GoogleCalendarToken.objects.get(user=request.user)
    except GoogleCalendarToken.DoesNotExist:
        return Response({'error': 'No conectado a Google Calendar.'}, status=status.HTTP_404_NOT_FOUND)

    color_id = request.data.get('calendar_color_id', '')
    # Acepta '' (ninguno) o '1'–'11'
    if color_id != '' and color_id not in [str(i) for i in range(1, 12)]:
        return Response({'error': 'colorId inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    token_obj.calendar_color_id = color_id
    token_obj.save(update_fields=['calendar_color_id'])
    return Response({'calendar_color_id': token_obj.calendar_color_id})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def disconnect_google_calendar(request):
    """Revoke Google token and delete the stored record."""
    try:
        token_obj = GoogleCalendarToken.objects.get(user=request.user)
        access_token = token_obj.get_access_token()
        if access_token:
            try:
                requests.post(GOOGLE_REVOKE_URL, params={'token': access_token}, timeout=5)
            except Exception:
                pass
        token_obj.delete()
    except GoogleCalendarToken.DoesNotExist:
        pass
    return Response({'success': True})
