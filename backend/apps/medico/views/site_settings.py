from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from apps.medico.models.site_setting import SiteSetting


ALLOWED_KEYS = {'PREMIUM_PRICE', 'ANNUAL_PRICE', 'TRIAL_DAYS', 'ANDROID_TESTERS_COUNT', 'ANDROID_MIN_VERSION', 'FREE_FOR_ALL_PREMIUM'}


def _build_settings(raw):
    monthly = float(raw.get('PREMIUM_PRICE', '7'))
    annual_default = str(round(monthly * 12, 2))
    return {
        'PREMIUM_PRICE': raw.get('PREMIUM_PRICE', '7'),
        'ANNUAL_PRICE': raw.get('ANNUAL_PRICE', annual_default),
        'TRIAL_DAYS': raw.get('TRIAL_DAYS', '30'),
        'ANDROID_TESTERS_COUNT': raw.get('ANDROID_TESTERS_COUNT', '12'),
        'ANDROID_MIN_VERSION': raw.get('ANDROID_MIN_VERSION', '1.0'),
        'FREE_FOR_ALL_PREMIUM': raw.get('FREE_FOR_ALL_PREMIUM', '0'),
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

    if 'ANDROID_MIN_VERSION' in data:
        v = str(data['ANDROID_MIN_VERSION']).strip()
        if not v:
            return Response({'error': 'Versión inválida'}, status=400)
        SiteSetting.set('ANDROID_MIN_VERSION', v)
        updated['ANDROID_MIN_VERSION'] = v

    granted_users = None
    if 'FREE_FOR_ALL_PREMIUM' in data:
        value = '1' if str(data['FREE_FOR_ALL_PREMIUM']) in ('1', 'true', 'True') else '0'
        was_active = SiteSetting.get('FREE_FOR_ALL_PREMIUM', '0') == '1'
        bonus_days = None
        try:
            with transaction.atomic():
                SiteSetting.set('FREE_FOR_ALL_PREMIUM', value)
                # Deactivating (on → off): apply accumulated credit_days + the
                # configured TRIAL_DAYS bonus (same "days" the admin already sets
                # for new-signup trials) to all users.
                if value == '0' and was_active:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    bonus_days = int(SiteSetting.get('TRIAL_DAYS', '30'))
                    granted_users = User.apply_credits_on_promo_end(bonus_days)
            updated['FREE_FOR_ALL_PREMIUM'] = value
        except Exception:
            return Response({'error': 'Error al cambiar el modo gratis total. No se realizaron cambios.'}, status=500)

    response = {'updated': updated}
    if granted_users is not None:
        response['granted_users'] = granted_users
        response['granted_days'] = bonus_days
    return Response(response)
