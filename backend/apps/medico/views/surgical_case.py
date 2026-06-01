# apps/medico/views/surgical_case.py

import logging
import calendar
from datetime import date
from django.db.models import Sum, Count, Q, Min, Max
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework import serializers as rest_serializers
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from apps.medio_auth.permissions import IsEmailVerified
from rest_framework.response import Response
from rest_framework.decorators import action
from decimal import Decimal

logger = logging.getLogger(__name__)

from apps.medico.models import SurgicalCase, CaseProcedure
from apps.medico.serializers import (
    SurgicalCaseListSerializer,
    SurgicalCaseDetailSerializer,
    SurgicalCaseCreateUpdateSerializer,
    CaseProcedureSerializer,
)


class SurgicalCaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar casos quirúrgicos completos.

    Endpoints:
    - GET /api/cases/ - Listar casos del usuario (propios + asistidos)
    - POST /api/cases/ - Crear nuevo caso
    - GET /api/cases/{id}/ - Ver detalle de caso
    - PUT/PATCH /api/cases/{id}/ - Actualizar caso
    - DELETE /api/cases/{id}/ - Eliminar caso
    - GET /api/cases/stats/ - Obtener estadísticas
    - GET /api/cases/assisted/ - Ver casos donde soy ayudante
    - POST /api/cases/{id}/accept-invitation/ - Aceptar invitación como ayudante
    - POST /api/cases/{id}/reject-invitation/ - Rechazar invitación como ayudante
    """
    permission_classes = [IsAuthenticated, IsEmailVerified]

    def get_queryset(self):
        """Retornar casos del usuario autenticado (propios + donde es ayudante)"""
        user = self.request.user

        # accept/reject necesitan ver invitaciones pendientes para poder procesarlas
        if self.action in ('accept_invitation', 'reject_invitation', 'retrieve'):
            return SurgicalCase.objects.filter(
                Q(created_by=user) | Q(assistant_doctor=user)
            ).select_related('hospital', 'created_by', 'assistant_doctor').prefetch_related('procedures').distinct()

        # Por defecto ocultar archivados; ?archived=true los muestra
        show_archived = self.request.query_params.get('archived', 'false').lower() == 'true'

        # Verificar si se pide solo casos asistidos
        assisted_only = self.request.query_params.get('assisted_only', 'false').lower() == 'true'

        if assisted_only:
            # Solo casos aceptados donde soy ayudante
            queryset = SurgicalCase.objects.filter(
                assistant_doctor=user, assistant_accepted=True
            )
        else:
            # Casos propios O donde fui aceptado como ayudante
            # Las invitaciones pendientes NO aparecen aquí — solo en /assisted/
            queryset = SurgicalCase.objects.filter(
                Q(created_by=user) |
                Q(assistant_doctor=user, assistant_accepted=True)
            )

        # El filtro de archivado solo aplica en el listado, no en detalle/edición
        if self.action == 'list':
            if show_archived:
                queryset = queryset.filter(Q(archived_at__isnull=False) | Q(is_paid=True))
            else:
                queryset = queryset.filter(archived_at__isnull=True, is_paid=False)

        # Optimizamos con select_related y prefetch_related para evitar el problema N+1
        queryset = queryset.select_related(
            'hospital', 
            'created_by',
            'assistant_doctor'
        ).prefetch_related('procedures').distinct()

        # Filtros opcionales
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        hospital_filter = self.request.query_params.get('hospital', None)
        if hospital_filter:
            queryset = queryset.filter(hospital_id=hospital_filter)

        date_from = self.request.query_params.get('date_from', None)
        if date_from:
            parsed_from = parse_date(date_from)
            if not parsed_from:
                raise DRFValidationError({'date_from': 'Formato inválido. Use YYYY-MM-DD'})
            queryset = queryset.filter(surgery_date__gte=parsed_from)

        date_to = self.request.query_params.get('date_to', None)
        if date_to:
            parsed_to = parse_date(date_to)
            if not parsed_to:
                raise DRFValidationError({'date_to': 'Formato inválido. Use YYYY-MM-DD'})
            queryset = queryset.filter(surgery_date__lte=parsed_to)

        # Búsqueda por nombre de paciente
        search = self.request.query_params.get('search', '').strip()
        if search:
            if len(search) > 100:
                raise DRFValidationError({'search': 'Búsqueda demasiado larga (máximo 100 caracteres)'})
            queryset = queryset.filter(
                Q(patient_name__icontains=search) |
                Q(patient_id__icontains=search)
            )

        # Ordenamiento explícito para aprovechar los índices
        return queryset.order_by('-surgery_date', '-created_at')

    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action == 'list':
            return SurgicalCaseListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return SurgicalCaseCreateUpdateSerializer
        else:
            return SurgicalCaseDetailSerializer

    def get_serializer_context(self):
        """Agregar request al contexto del serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def retrieve(self, request, *args, **kwargs):
        """Obtener detalle de un caso (verificando permisos)"""
        instance = self.get_object()

        # Verificar que el usuario pueda ver este caso
        if not instance.can_be_viewed_by(request.user):
            return Response(
                {'error': 'No tienes permiso para ver este caso'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Crear un nuevo caso quirúrgico"""
        if request.user.plan == 'free':
            active_count = SurgicalCase.objects.filter(
                created_by=request.user,
                archived_at__isnull=True,
            ).count()
            if active_count >= 5:
                return Response(
                    {'error': 'Durante tu prueba Premium operaste sin límites. Reactiva Premium para continuar sin interrupciones.', 'upgrade_required': True},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            case = serializer.save(created_by=request.user)

            case = SurgicalCase.objects.prefetch_related('procedures').select_related(
                'hospital', 'created_by', 'assistant_doctor'
            ).get(pk=case.pk)

            response_serializer = SurgicalCaseDetailSerializer(case, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except rest_serializers.ValidationError as e:
            logger.warning("Validation error creating case for user %s", request.user.id)
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Error creating case for user %s", request.user.id)
            return Response(
                {'error': 'Error al crear el caso', 'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def update(self, request, *args, **kwargs):
        """Actualizar caso completo"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Verificar permisos de edición
        if not instance.can_be_edited_by(request.user):
            return Response(
                {'error': 'Solo el creador del caso puede editarlo'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        case = serializer.save()

        # Retornar con serializer detallado
        detail_serializer = SurgicalCaseDetailSerializer(case, context={'request': request})
        return Response(detail_serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Archivar caso en lugar de eliminarlo permanentemente.
        Se marca como completado con fecha de archivado.
        El management command purge_archived_cases lo borra definitivamente a los 6 meses.
        """
        instance = self.get_object()

        if instance.created_by != request.user:
            return Response(
                {'error': 'Solo el creador del caso puede archivarlo'},
                status=status.HTTP_403_FORBIDDEN
            )

        if instance.archived_at is not None:
            return Response(
                {'error': 'El caso ya está archivado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.archive()
        return Response(
            {'message': 'Caso archivado. Se eliminará permanentemente en 6 meses.'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path='assisted')
    def get_assisted_cases(self, request):
        """
        Obtener casos donde el usuario actual es ayudante
        """
        cases = SurgicalCase.objects.filter(
            assistant_doctor=request.user,
            is_paid=False,
            archived_at__isnull=True,
        ).select_related(
            'hospital',
            'created_by'
        ).prefetch_related('procedures')

        # Separar en pendientes y aceptados
        pending_cases = cases.filter(assistant_accepted__isnull=True)
        accepted_cases = cases.filter(assistant_accepted=True)

        pending_serializer = SurgicalCaseListSerializer(
            pending_cases, 
            many=True,
            context={'request': request}
        )
        accepted_serializer = SurgicalCaseListSerializer(
            accepted_cases, 
            many=True,
            context={'request': request}
        )

        return Response({
            'pending_invitations': pending_serializer.data,
            'accepted_cases': accepted_serializer.data,
            'total_pending': pending_cases.count(),
            'total_accepted': accepted_cases.count()
        })

    @action(detail=True, methods=['post'], url_path='accept-invitation')
    def accept_invitation(self, request, pk=None):
        """
        Aceptar invitación como médico ayudante
        """
        case = self.get_object()

        # Verificar que el usuario es el ayudante asignado
        if case.assistant_doctor != request.user:
            return Response(
                {'error': 'No eres el médico ayudante asignado a este caso'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar que no haya aceptado ya
        if case.assistant_accepted is True:
            return Response(
                {'message': 'Ya has aceptado esta invitación'},
                status=status.HTTP_200_OK
            )

        # Verificar límite de casos para plan gratuito
        if request.user.plan == 'free':
            own_cases = SurgicalCase.objects.filter(
                created_by=request.user,
                archived_at__isnull=True,
                is_paid=False,
            ).count()
            accepted_assisted = SurgicalCase.objects.filter(
                assistant_doctor=request.user,
                assistant_accepted=True,
                archived_at__isnull=True,
                is_paid=False,
            ).count()
            if own_cases + accepted_assisted >= 5:
                return Response(
                    {'error': 'Durante tu prueba Premium operaste sin límites. Reactiva Premium para continuar sin interrupciones.', 'upgrade_required': True},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Aceptar invitación
        case.assistant_accepted = True
        case.save()

        serializer = SurgicalCaseDetailSerializer(case, context={'request': request})
        return Response({
            'message': 'Invitación aceptada exitosamente',
            'case': serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reject-invitation')
    def reject_invitation(self, request, pk=None):
        """
        Rechazar invitación como médico ayudante
        """
        case = self.get_object()

        # Verificar que el usuario es el ayudante asignado
        if case.assistant_doctor != request.user:
            return Response(
                {'error': 'No eres el médico ayudante asignado a este caso'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Rechazar invitación — limpiar la asignación completamente
        # para que el médico principal pueda invitar a alguien más
        case.assistant_doctor = None
        case.assistant_accepted = None
        case.save(update_fields=['assistant_doctor', 'assistant_accepted'])

        return Response({
            'message': 'Invitación rechazada.'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        """
        Obtener estadísticas de casos del usuario (solo casos propios, no asistidos)
        """
        queryset = SurgicalCase.objects.filter(
            created_by=request.user
        ).select_related('hospital').prefetch_related('procedures')

        # Total de casos
        total_cases = queryset.count()

        # Total de procedimientos
        total_procedures = CaseProcedure.objects.filter(
            case__in=queryset
        ).count()

        # Valor total calculado
        total_value = CaseProcedure.objects.filter(
            case__in=queryset
        ).aggregate(
            total=Sum('calculated_value')
        )['total'] or Decimal('0.00')

        # Helper: conteo exclusivo por estado para cualquier sub-queryset
        def pipeline_counts(qs):
            cancelled = qs.filter(status='cancelled').count()
            active = qs.exclude(status='cancelled')
            return {
                'scheduled': {'count': active.filter(is_operated=False).count(), 'total_value': 0},
                'completed': {'count': active.filter(is_operated=True, is_billed=False).count(), 'total_value': 0},
                'billed':    {'count': active.filter(is_billed=True, is_paid=False).count(), 'total_value': 0},
                'paid':      {'count': active.filter(is_paid=True).count(), 'total_value': 0},
                'cancelled': {'count': cancelled, 'total_value': 0},
            }

        # Pipeline por período — calculados aquí antes de redefinir today
        from datetime import timedelta as _td
        _today = timezone.now().date()
        _week_start  = _today - _td(days=_today.weekday())  # lunes
        _month_start = _today.replace(day=1)

        cases_by_status   = pipeline_counts(queryset)
        pipeline_month    = pipeline_counts(queryset.filter(surgery_date__gte=_month_start))
        pipeline_week     = pipeline_counts(queryset.filter(surgery_date__gte=_week_start))

        # Casos recientes (últimos 5)
        recent_cases = queryset.order_by('-surgery_date', '-created_at')[:5]
        recent_serializer = SurgicalCaseListSerializer(
            recent_cases,
            many=True,
            context={'request': request}
        )

        # ── Extended stats ────────────────────────────────────────
        today = timezone.now().date()
        this_month_start = today.replace(day=1)
        # last month start/end
        first_of_this = this_month_start
        last_month_last = first_of_this - timezone.timedelta(days=1)
        last_month_start = last_month_last.replace(day=1)

        cases_this_month = queryset.filter(surgery_date__gte=this_month_start).count()
        cases_last_month = queryset.filter(
            surgery_date__gte=last_month_start,
            surgery_date__lt=this_month_start
        ).count()

        # Total RVU
        all_procedures_qs = CaseProcedure.objects.filter(case__in=queryset)
        total_rvu = float(all_procedures_qs.aggregate(t=Sum('rvu'))['t'] or 0)
        avg_rvu_per_case = round(total_rvu / total_cases, 2) if total_cases > 0 else 0.0

        # RVU this month / last month
        cases_this_month_qs = queryset.filter(surgery_date__gte=this_month_start)
        cases_last_month_qs = queryset.filter(
            surgery_date__gte=last_month_start,
            surgery_date__lt=this_month_start
        )
        rvu_this_month = float(
            CaseProcedure.objects.filter(case__in=cases_this_month_qs)
            .aggregate(t=Sum('rvu'))['t'] or 0
        )
        rvu_last_month = float(
            CaseProcedure.objects.filter(case__in=cases_last_month_qs)
            .aggregate(t=Sum('rvu'))['t'] or 0
        )

        # Monthly trend — last 6 months (cases + RVU)
        MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                       'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        monthly_trend = []
        for i in range(5, -1, -1):
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            first_day = date(y, m, 1)
            last_day = date(y, m, calendar.monthrange(y, m)[1])
            month_cases = queryset.filter(surgery_date__gte=first_day, surgery_date__lte=last_day)
            count = month_cases.count()
            rvu = float(
                CaseProcedure.objects.filter(case__in=month_cases)
                .aggregate(t=Sum('rvu'))['t'] or 0
            )
            monthly_trend.append({
                'month': MONTH_NAMES[m - 1], 'year': y,
                'count': count, 'rvu': round(rvu, 1),
            })

        # Top 5 procedures by count + total RVU
        top_procedures = list(
            CaseProcedure.objects.filter(case__in=queryset)
            .values('surgery_name')
            .annotate(count=Count('id'), total_rvu=Sum('rvu'))
            .order_by('-count')[:5]
        )
        top_procedures_list = [
            {'name': p['surgery_name'], 'count': p['count'], 'total_rvu': round(float(p['total_rvu'] or 0), 1)}
            for p in top_procedures
        ]

        # Top 5 procedures by RVU
        top_procedures_by_rvu = list(
            CaseProcedure.objects.filter(case__in=queryset)
            .values('surgery_name')
            .annotate(count=Count('id'), total_rvu=Sum('rvu'))
            .order_by('-total_rvu')[:5]
        )
        top_procedures_by_rvu_list = [
            {'name': p['surgery_name'], 'count': p['count'], 'total_rvu': round(float(p['total_rvu'] or 0), 1)}
            for p in top_procedures_by_rvu
        ]

        # Top 5 hospitals by count
        top_hospitals = list(
            queryset.exclude(hospital__isnull=True)
            .values('hospital__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )
        top_hospitals_list = [{'name': h['hospital__name'], 'count': h['count']} for h in top_hospitals]

        # Top 5 hospitals by RVU
        top_hospitals_by_rvu = list(
            CaseProcedure.objects.filter(case__in=queryset, case__hospital__isnull=False)
            .values('case__hospital__name')
            .annotate(total_rvu=Sum('rvu'), count=Count('case', distinct=True))
            .order_by('-total_rvu')[:5]
        )
        top_hospitals_by_rvu_list = [
            {'name': h['case__hospital__name'], 'total_rvu': round(float(h['total_rvu'] or 0), 1), 'count': h['count']}
            for h in top_hospitals_by_rvu
        ]

        # Specialty stats — add RVU
        specialty_stats_rvu = CaseProcedure.objects.filter(
            case__in=queryset
        ).values('specialty').annotate(
            count=Count('id'),
            total_rvu=Sum('rvu'),
        ).order_by('-count')[:8]
        cases_by_specialty = {
            item['specialty']: {
                'count': item['count'],
                'total_value': 0,
                'total_rvu': round(float(item['total_rvu'] or 0), 1),
            }
            for item in specialty_stats_rvu
        }

        # Collaborators this month (distinct assistant doctors)
        collaborators_this_month = queryset.filter(
            surgery_date__gte=this_month_start,
            assistant_doctor__isnull=False
        ).values('assistant_doctor').distinct().count()

        # Active specialties (distinct)
        active_specialties = CaseProcedure.objects.filter(
            case__in=queryset
        ).values('specialty').distinct().count()

        # Avg per week
        if total_cases > 0:
            date_range = queryset.aggregate(min_date=Min('surgery_date'), max_date=Max('surgery_date'))
            if date_range['min_date'] and date_range['max_date']:
                days_span = max((date_range['max_date'] - date_range['min_date']).days, 7)
                avg_per_week = round(total_cases / (days_span / 7), 1)
            else:
                avg_per_week = 0.0
        else:
            avg_per_week = 0.0

        # Top 5 insurers by case count
        top_insurers_by_count = list(
            queryset.exclude(insurance_company__isnull=True)
            .values('insurance_company__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )
        top_insurers_by_count_list = [
            {'name': i['insurance_company__name'], 'count': i['count']}
            for i in top_insurers_by_count
        ]

        # Top 5 insurers by RVU
        top_insurers_by_rvu = list(
            CaseProcedure.objects.filter(
                case__in=queryset.exclude(insurance_company__isnull=True)
            )
            .values('case__insurance_company__name')
            .annotate(total_rvu=Sum('rvu'), count=Count('case', distinct=True))
            .order_by('-total_rvu')[:5]
        )
        top_insurers_by_rvu_list = [
            {'name': i['case__insurance_company__name'], 'total_rvu': round(float(i['total_rvu'] or 0), 1), 'count': i['count']}
            for i in top_insurers_by_rvu
        ]

        stats_data = {
            'total_cases': total_cases,
            'total_procedures': total_procedures,
            'total_value': float(total_value),
            'cases_by_status': cases_by_status,
            'cases_by_specialty': cases_by_specialty,
            'recent_cases': recent_serializer.data,
            # extended
            'cases_this_month': cases_this_month,
            'cases_last_month': cases_last_month,
            'monthly_trend': monthly_trend,
            'top_procedures': top_procedures_list,
            'top_procedures_by_rvu': top_procedures_by_rvu_list,
            'top_hospitals': top_hospitals_list,
            'top_hospitals_by_rvu': top_hospitals_by_rvu_list,
            'collaborators_this_month': collaborators_this_month,
            'active_specialties': active_specialties,
            'avg_per_week': avg_per_week,
            'total_rvu': total_rvu,
            'avg_rvu_per_case': avg_rvu_per_case,
            'rvu_this_month': rvu_this_month,
            'rvu_last_month': rvu_last_month,
            'pipeline_month': pipeline_month,
            'pipeline_week': pipeline_week,
            'top_insurers_by_count': top_insurers_by_count_list,
            'top_insurers_by_rvu': top_insurers_by_rvu_list,
        }

        return Response(stats_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='add-procedure')
    def add_procedure(self, request, pk=None):
        """
        Agregar un procedimiento a un caso existente
        """
        case = self.get_object()

        # Verificar permisos de edición
        if not case.can_be_edited_by(request.user):
            return Response(
                {'error': 'Solo el creador del caso puede agregar procedimientos'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CaseProcedureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Determinar orden (último + 1)
        last_order = case.procedures.aggregate(
            max_order=Count('order')
        )['max_order'] or 0

        procedure = serializer.save(
            case=case,
            order=last_order
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['delete'], url_path='remove-procedure/(?P<procedure_id>[^/.]+)')
    def remove_procedure(self, request, pk=None, procedure_id=None):
        """
        Eliminar un procedimiento de un caso
        """
        case = self.get_object()

        # Verificar permisos de edición
        if not case.can_be_edited_by(request.user):
            return Response(
                {'error': 'Solo el creador del caso puede eliminar procedimientos'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            procedure = case.procedures.get(id=procedure_id)
            procedure.delete()
            return Response(
                {'message': 'Procedimiento eliminado correctamente'},
                status=status.HTTP_200_OK
            )
        except CaseProcedure.DoesNotExist:
            return Response(
                {'error': 'Procedimiento no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='sync-calendar')
    def sync_calendar(self, request, pk=None):
        """
        Persist the Google Calendar event ID for a case.
        Only the case owner can call this; only calendar_event_id is written.
        """
        case = self.get_object()

        if case.created_by != request.user:
            return Response(
                {'error': 'Solo el creador del caso puede sincronizar el calendario'},
                status=status.HTTP_403_FORBIDDEN
            )

        calendar_event_id = request.data.get('calendar_event_id')
        if not calendar_event_id or not isinstance(calendar_event_id, str):
            return Response(
                {'error': 'calendar_event_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Direct DB update — bypasses full_clean() / business-logic validators
        # that are irrelevant for this single-field write.
        SurgicalCase.objects.filter(pk=case.pk).update(calendar_event_id=calendar_event_id)

        return Response({'calendar_event_id': calendar_event_id}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='update-status')
    def update_status(self, request, pk=None):
        """
        Actualizar solo el estado de un caso
        """
        case = self.get_object()

        # Verificar permisos de edición
        if not case.can_be_edited_by(request.user):
            return Response(
                {'error': 'Solo el creador del caso puede cambiar el estado'},
                status=status.HTTP_403_FORBIDDEN
            )

        new_status = request.data.get('status')

        if not new_status:
            return Response(
                {'error': 'El campo status es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_statuses = [choice[0] for choice in SurgicalCase.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Estado inválido. Opciones: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        case.status = new_status
        case.save()

        serializer = SurgicalCaseDetailSerializer(case, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CaseProcedureViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar procedimientos individuales
    """
    serializer_class = CaseProcedureSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Retornar solo procedimientos de casos del usuario"""
        return CaseProcedure.objects.filter(
            Q(case__created_by=self.request.user) | 
            Q(case__assistant_doctor=self.request.user)
        ).select_related('case', 'case__hospital').distinct()