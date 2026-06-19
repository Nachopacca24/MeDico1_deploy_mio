from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from apps.medico.models.site_setting import SiteSetting


ALLOWED_KEYS = {'PREMIUM_PRICE', 'ANNUAL_PRICE', 'TRIAL_DAYS', 'ANDROID_TESTERS_COUNT'}


def _build_settings(raw):
    monthly = float(raw.get('PREMIUM_PRICE', '7'))
    annual_default = str(round(monthly * 12, 2))
    return {
        'PREMIUM_PRICE': raw.get('PREMIUM_PRICE', '7'),
        'ANNUAL_PRICE': raw.get('ANNUAL_PRICE', annual_default),
        'TRIAL_DAYS': raw.get('TRIAL_DAYS', '30'),
        'ANDROID_TESTERS_COUNT': raw.get('ANDROID_TESTERS_COUNT', '12'),
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def site_settings_public(request):
    raw = {s.key: s.value for s in SiteSetting.objects.filter(key__in=ALLOWED_KEYS)}
    return Response(_build_settings(raw))


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated, IsAdminUser])
def site_settings_admin(request):
    if request.method == 'GET':
        raw = {s.key: s.value for s in SiteSetting.objects.filter(key__in=ALLOWED_KEYS)}
        return Response(_build_settings(raw))

    data = request.data
    updated = {}

    if 'PREMIUM_PRICE' in data:
        try:
            price = float(data['PREMIUM_PRICE'])
            if price <= 0:
                return Response({'error': 'El precio debe ser mayor a 0'}, status=400)
            SiteSetting.set('PREMIUM_PRICE', str(price))
            updated['PREMIUM_PRICE'] = str(price)
        except (ValueError, TypeError):
            return Response({'error': 'Precio mensual inválido'}, status=400)

    if 'ANNUAL_PRICE' in data:
        try:
            price = float(data['ANNUAL_PRICE'])
            if price <= 0:
                return Response({'error': 'El precio anual debe ser mayor a 0'}, status=400)
            SiteSetting.set('ANNUAL_PRICE', str(price))
            updated['ANNUAL_PRICE'] = str(price)
        except (ValueError, TypeError):
            return Response({'error': 'Precio anual inválido'}, status=400)

    if 'TRIAL_DAYS' in data:
        try:
            days = int(data['TRIAL_DAYS'])
            if days < 1:
                return Response({'error': 'Los días de prueba deben ser al menos 1'}, status=400)
            SiteSetting.set('TRIAL_DAYS', str(days))
            updated['TRIAL_DAYS'] = str(days)
        except (ValueError, TypeError):
            return Response({'error': 'Días inválidos'}, status=400)

    if 'ANDROID_TESTERS_COUNT' in data:
        try:
            count = int(data['ANDROID_TESTERS_COUNT'])
            if count < 0:
                return Response({'error': 'El contador debe ser 0 o más'}, status=400)
            SiteSetting.set('ANDROID_TESTERS_COUNT', str(count))
            updated['ANDROID_TESTERS_COUNT'] = str(count)
        except (ValueError, TypeError):
            return Response({'error': 'Contador inválido'}, status=400)

    return Response({'updated': updated})
