import logging
from django.http import HttpResponse, JsonResponse
from django.views.generic import View
from django.conf import settings
from django.http import HttpResponse
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from datetime import timedelta
from decimal import Decimal
import os
import requests
from django.shortcuts import render

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({'status': 'ok', 'timestamp': timezone.now().isoformat()})



# Importar modelos de medico
from apps.medico.models import SurgicalCase, CaseProcedure, Hospital, Operation, Specialty

User = get_user_model()




class IndexView(View):
    def get(self, request, *args, **kwargs):
        if settings.DEBUG:
            try:
                frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
                if frontend_url.endswith('/'):
                    frontend_url = frontend_url[:-1]
                vite_response = requests.get(f'{frontend_url}/', timeout=2)
                html_content = vite_response.text
                html_content = html_content.replace('src="/', f'src="{frontend_url}/')
                html_content = html_content.replace('href="/', f'href="{frontend_url}/')
                return HttpResponse(html_content, content_type='text/html')
            except:
                return HttpResponse("""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>MéDico - Error</title>
                        <style>
                            body { 
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                margin: 0;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            }
                            .container {
                                background: white;
                                padding: 40px;
                                border-radius: 10px;
                                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                                text-align: center;
                                max-width: 500px;
                            }
                            h1 { color: #e74c3c; margin-bottom: 20px; }
                            p { color: #555; line-height: 1.6; }
                            code {
                                background: #f4f4f4;
                                padding: 15px;
                                display: block;
                                border-radius: 5px;
                                margin: 20px 0;
                                font-family: 'Courier New', monospace;
                            }
                            .status {
                                background: #ecf0f1;
                                padding: 15px;
                                border-radius: 5px;
                                margin-top: 20px;
                            }
                            .ok { color: #27ae60; }
                            .error { color: #e74c3c; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>⚠️ Frontend no disponible</h1>
                            <p>El servidor de Vite no está corriendo. Django está funcionando correctamente, pero necesitas iniciar el frontend.</p>
                            
                            <p><strong>En otra terminal ejecuta:</strong></p>
                            <code>npm run dev</code>
                            
                            <div class="status">
                                <p class="ok">✅ Backend Django: Funcionando</p>
                                <p class="error">❌ Frontend Vite: No disponible</p>
                            </div>
                            
                            <p style="margin-top: 20px; font-size: 14px; color: #999;">
                                O usa el comando personalizado que inicia ambos:<br>
                                <code style="display: inline; padding: 5px;">python manage.py runserver</code>
                            </p>
                        </div>
                    </body>
                    </html>
                """, content_type='text/html')
        else:
            try:
                return render(request, 'index.html')
            except Exception:
                from django.http import HttpResponseRedirect
                frontend_url = os.environ.get('FRONTEND_URL', 'https://medicoapp.app')
                return HttpResponseRedirect(frontend_url)


# ============================================
# ADMIN API VIEWS - CON DATOS REALES
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_stats(request):
    """Estadísticas generales del dashboard."""
    from apps.advertising.models import Advertisement
    from django.db.models import Sum

    total_users = User.objects.count()
    total_cases = SurgicalCase.objects.count()
    first_day = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    cases_this_month = SurgicalCase.objects.filter(created_at__gte=first_day).count()

    # Plan breakdown
    premium_count = User.objects.filter(plan='premium').count()
    free_count = User.objects.filter(plan='free').count()

    # Specialty breakdown (top 10, skip null/blank)
    specialty_stats = (
        User.objects
        .exclude(specialty__isnull=True)
        .exclude(specialty='')
        .values('specialty')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    # Advertising stats
    ad_agg = Advertisement.objects.aggregate(
        total_impressions=Sum('impressions'),
        total_clicks=Sum('clicks'),
    )
    total_impressions = ad_agg['total_impressions'] or 0
    total_clicks = ad_agg['total_clicks'] or 0
    active_ads = Advertisement.objects.filter(status='active').count()
    top_ads = (
        Advertisement.objects
        .filter(impressions__gt=0)
        .values('id', 'campaign_name', 'impressions', 'clicks')
        .order_by('-impressions')[:5]
    )

    week_ago = timezone.now() - timedelta(days=7)
    active_this_week = User.objects.filter(last_login__gte=week_ago).count()
    new_this_week = User.objects.filter(date_joined__gte=week_ago).count()

    return Response({
        'totalUsers': total_users,
        'totalCases': total_cases,
        'casesThisMonth': cases_this_month,
        'premiumUsers': premium_count,
        'freeUsers': free_count,
        'activeThisWeek': active_this_week,
        'newThisWeek': new_this_week,
        'specialtyStats': list(specialty_stats),
        'adStats': {
            'activeAds': active_ads,
            'totalImpressions': total_impressions,
            'totalClicks': total_clicks,
            'ctr': round((total_clicks / total_impressions * 100), 2) if total_impressions > 0 else 0,
            'topAds': list(top_ads),
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_activity(request):
    """
    Obtiene actividad reciente del sistema con datos reales.
    Combina usuarios nuevos, casos quirúrgicos y hospitales.
    Requiere autenticación JWT y que el usuario sea staff.
    """
    
    activities = []
    
    # 1. Últimos usuarios registrados (3 más recientes)
    recent_users = User.objects.order_by('-date_joined')[:3]
    for user in recent_users:
        activities.append({
            'id': f'user-{user.id}',
            'type': 'user',
            'description': f'Nuevo usuario registrado: {user.username}',
            'timestamp': user.date_joined.isoformat(),
            'user_name': user.get_full_name() or user.username
        })
    
    # 2. Últimos casos quirúrgicos creados (5 más recientes)
    recent_cases = SurgicalCase.objects.select_related('hospital', 'created_by').order_by('-created_at')[:5]
    for case in recent_cases:
        # Obtener el nombre del médico que creó el caso
        doctor_name = case.created_by.get_full_name() or case.created_by.username if case.created_by else 'Sistema'
        
        activities.append({
            'id': f'case-{case.id}',
            'type': 'case',
            'description': f'Nuevo caso quirúrgico en {case.hospital.name if case.hospital else "Sin hospital"}',
            'timestamp': case.created_at.isoformat(),
            'user_name': doctor_name
        })
    
    # 3. Últimos hospitales agregados (2 más recientes)
    recent_hospitals = Hospital.objects.order_by('-created_at')[:2]
    for hospital in recent_hospitals:
        activities.append({
            'id': f'hospital-{hospital.id}',
            'type': 'hospital',
            'description': f'Nuevo hospital registrado: {hospital.name}',
            'timestamp': hospital.created_at.isoformat(),
            'user_name': hospital.location or 'Sin ubicación'
        })
    
    # Ordenar todas las actividades por timestamp (más reciente primero)
    activities.sort(key=lambda x: x['timestamp'], reverse=True)
    
    # Retornar las 10 actividades más recientes
    return Response(activities[:10])


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_users(request):
    """Lista completa de usuarios con plan, especialidad y conteo de casos."""
    from apps.medico.models import Favorite, FavoriteHospital, FavoriteInsurance
    from apps.medico.models.google_calendar_token import GoogleCalendarToken
    from apps.medio_auth.models import Friendship

    users = User.objects.all().values(
        'id', 'username', 'email', 'first_name', 'last_name',
        'is_staff', 'is_active', 'is_superuser', 'is_verified',
        'date_joined', 'last_login', 'plan', 'specialty', 'phone',
        'trial_ends_at', 'is_permanent_premium', 'role',
        'ls_renews_at', 'ls_cancelled', 'ls_subscription_id',
        'tutorial_completed',
    )

    # Feature adoption — simple flat ID sets
    calendar_ids = set(GoogleCalendarToken.objects.values_list('user_id', flat=True))
    colleague_ids = set(
        list(Friendship.objects.values_list('user_id', flat=True)) +
        list(Friendship.objects.values_list('friend_id', flat=True))
    )

    # Contar casos en una sola consulta
    case_counts = {
        row['created_by_id']: row['total']
        for row in SurgicalCase.objects.values('created_by_id').annotate(total=Count('id'))
    }

    # Contar favoritos (suma de los 3 tipos) en una sola consulta por tipo
    fav_counts = {
        row['user_id']: row['total']
        for row in Favorite.objects.values('user_id').annotate(total=Count('id'))
    }
    fav_hosp_counts = {
        row['user_id']: row['total']
        for row in FavoriteHospital.objects.values('user_id').annotate(total=Count('id'))
    }
    fav_ins_counts = {
        row['user_id']: row['total']
        for row in FavoriteInsurance.objects.values('user_id').annotate(total=Count('id'))
    }

    now = timezone.now()
    users_list = []
    for user in users:
        if user['date_joined']:
            user['date_joined'] = user['date_joined'].isoformat()
        if user['last_login']:
            user['last_login'] = user['last_login'].isoformat()
        if user['trial_ends_at']:
            user['trial_ends_at'] = user['trial_ends_at'].isoformat()
            user['trial_active'] = user['trial_ends_at'] > now.isoformat()
        else:
            user['trial_active'] = False
        if user.get('ls_renews_at'):
            user['ls_renews_at'] = user['ls_renews_at'].isoformat()
        full_name = f"{user['first_name']} {user['last_name']}".strip()
        user['full_name'] = full_name if full_name else user['username']
        user['has_google_calendar'] = user['id'] in calendar_ids
        user['has_colleagues'] = user['id'] in colleague_ids
        user['tutorial_completed'] = user.get('tutorial_completed', False)
        user['total_cases'] = case_counts.get(user['id'], 0)
        user['total_favorites'] = (
            fav_counts.get(user['id'], 0) +
            fav_hosp_counts.get(user['id'], 0) +
            fav_ins_counts.get(user['id'], 0)
        )
        users_list.append(user)

    return Response(users_list)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def set_permanent_premium(request, user_id):
    """Otorgar o revocar Premium Permanente a un usuario."""
    is_permanent = request.data.get('is_permanent', True)
    try:
        target = User.objects.get(id=user_id)
        target.is_permanent_premium = bool(is_permanent)
        update_fields = ['is_permanent_premium', 'plan', 'updated_at']
        if bool(is_permanent):
            target.plan = 'premium'
        else:
            # On revoke: keep premium only if something else still covers the user.
            # Without this, the user would be stuck on plan='premium' indefinitely
            # because check_trial_expiry only fires when trial_ends_at is set.
            has_active_sub = target.ls_subscription_id and not target.ls_cancelled
            has_grace = (
                target.ls_cancelled
                and target.ls_renews_at
                and target.ls_renews_at > timezone.now()
            )
            has_bonus = target.trial_ends_at and target.trial_ends_at > timezone.now()
            if not has_active_sub and not has_grace and not has_bonus:
                target.plan = 'free'
        target.save(update_fields=update_fields)
        return Response({
            'success': True,
            'is_permanent_premium': target.is_permanent_premium,
            'plan': target.plan,
        })
    except User.DoesNotExist:
        return Response({'message': 'Usuario no encontrado'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def cancel_account_deletion(request, user_id):
    """Cancela la solicitud de eliminación de cuenta y reactiva al usuario."""
    try:
        target = User.objects.get(id=user_id)
        if not target.deletion_requested_at:
            return Response({'message': 'Este usuario no tiene una solicitud de eliminación pendiente.'}, status=400)
        target.is_active = True
        target.deletion_requested_at = None
        target.save(update_fields=['is_active', 'deletion_requested_at'])
        return Response({'success': True, 'message': f'Cuenta de {target.email} reactivada exitosamente.'})
    except User.DoesNotExist:
        return Response({'message': 'Usuario no encontrado.'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def update_user_plan(request, user_id):
    """Cambiar el plan de un usuario (free/premium)."""
    new_plan = request.data.get('plan')
    if new_plan not in ('free', 'premium'):
        return Response({'message': 'Plan inválido. Use free o premium.'}, status=400)
    try:
        target_user = User.objects.get(id=user_id)
        target_user.plan = new_plan
        update_fields = ['plan']
        if new_plan == 'free':
            # Clean all LS subscription state on admin-forced downgrade
            target_user.ls_subscription_id = None
            target_user.ls_renews_at = None
            target_user.ls_cancelled = False
            update_fields += ['ls_subscription_id', 'ls_renews_at', 'ls_cancelled']
        target_user.save(update_fields=update_fields)
        return Response({'success': True, 'plan': new_plan})
    except User.DoesNotExist:
        return Response({'message': 'Usuario no encontrado'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def extend_trial(request, user_id):
    """Extiende el trial de un usuario X días."""
    try:
        days = int(request.data.get('days', 15))
        if days < 1:
            return Response({'message': 'Los días deben ser al menos 1'}, status=400)
    except (ValueError, TypeError):
        return Response({'message': 'Días inválidos'}, status=400)
    try:
        target = User.objects.get(pk=user_id)
        target.grant_bonus_days(days)
        target.save(update_fields=['trial_ends_at', 'plan'])
        return Response({'success': True, 'trial_ends_at': target.trial_ends_at.isoformat()})
    except User.DoesNotExist:
        return Response({'message': 'Usuario no encontrado'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_hospitals(request):
    """
    Obtiene lista de hospitales con estadísticas de casos.
    Endpoint opcional para futura expansión del dashboard.
    """
    
    hospitals = Hospital.objects.annotate(
        cases_count=Count('surgical_cases')
    ).values(
        'id',
        'name',
        'location',
        'cases_count',
        'created_at'
    )

    hospitals_list = list(hospitals)

    for hospital in hospitals_list:
        if hospital['created_at']:
            hospital['created_at'] = hospital['created_at'].isoformat()

    return Response(hospitals_list)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_procedures(request):
    """
    Obtiene lista de procedimientos más comunes.
    Endpoint opcional para futura expansión del dashboard.
    """
    
    # Top 10 procedimientos más usados
    top_procedures = CaseProcedure.objects.values(
        'surgery_code',
        'surgery_name',
        'specialty'
    ).annotate(
        usage_count=Count('id')
    ).order_by('-usage_count')[:10]
    
    return Response(list(top_procedures))


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_user(request, user_id):
    """
    Elimina un usuario del sistema.
    Solo superusuarios pueden eliminar usuarios.
    Los superusuarios no pueden ser eliminados.
    """
    try:
        # Verificar que el usuario que hace la petición sea superusuario
        if not request.user.is_superuser:
            return Response({
                'success': False,
                'message': 'Solo los superusuarios pueden eliminar usuarios'
            }, status=403)
        
        # Buscar el usuario a eliminar
        user_to_delete = User.objects.get(id=user_id)

        # Prevenir auto-eliminación
        if user_to_delete.id == request.user.id:
            return Response({
                'success': False,
                'message': 'No puedes eliminar tu propia cuenta'
            }, status=400)
        
        # Guardar información antes de eliminar
        user_name = user_to_delete.get_full_name() or user_to_delete.username
        cases_count = SurgicalCase.objects.filter(created_by=user_to_delete).count()
        
        # Eliminar el usuario (Django eliminará automáticamente sus casos en cascada si está configurado)
        user_to_delete.delete()
        
        return Response({
            'success': True,
            'message': f'Usuario {user_name} eliminado exitosamente',
            'deleted_cases': cases_count
        })
        
    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Usuario no encontrado'
        }, status=404)
    except Exception as e:
        logger.exception("Admin error deleting user_id=%s", user_id)
        return Response({
            'success': False,
            'message': 'Error al eliminar usuario. Intentá de nuevo.'
        }, status=500)
