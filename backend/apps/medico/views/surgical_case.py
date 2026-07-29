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

_MONTHS = ['enero','febrero','marzo','abril','mayo','junio',
           'julio','agosto','septiembre','octubre','noviembre','diciembre']

def _fmt_date(d):
    if not d:
        return ''
    return f"{d.day} de {_MONTHS[d.month - 1]}"

from apps.medico.models import SurgicalCase, CaseProcedure, CollaboratorRemoval
from apps.medico.services.firebase import notify_user
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

        # accept/reject/dismiss/leave necesitan acceso más amplio
        if self.action in ('accept_invitation', 'reject_invitation', 'retrieve', 'dismiss_removal', 'leave_case'):
            return SurgicalCase.objects.filter(
                Q(created_by=user) | Q(assistant_doctor=user) |
                Q(anesthesia__anesthesiologist=user) |
                Q(collaborator_removals__removed_user=user, collaborator_removals__acknowledged=False)
            ).select_related(
                'hospital', 'created_by', 'assistant_doctor', 'insurance_company'
            ).prefetch_related('procedures', 'images').distinct()

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
            # Casos propios, donde fui aceptado como ayudante, donde acepté como anestesiólogo,
            # o donde fui removido (mientras no lo descarte)
            queryset = SurgicalCase.objects.filter(
                Q(created_by=user) |
                Q(assistant_doctor=user, assistant_accepted=True) |
                Q(anesthesia__anesthesiologist=user, anesthesia__anesthesiologist_accepted=True) |
                Q(collaborator_removals__removed_user=user, collaborator_removals__acknowledged=False)
            )

        # El filtro de archivado solo aplica en el listado, no en detalle/edición.
        # Regla por rol:
        #   - Cirujano/ayudante: usa el archived_at/is_paid del SurgicalCase (controlado por el cirujano)
        #   - Anestesiólogo (no dueño): usa su propio anesthesia.is_paid — el cirujano cobrar no lo archiva
        if self.action == 'list':
            if show_archived:
                queryset = queryset.filter(
                    # Cirujano: cobrado/archivado por él
                    Q(created_by=user) & (Q(archived_at__isnull=False) | Q(is_paid=True)) |
                    # Ayudante (no dueño): cobrado por él mismo
                    Q(assistant_doctor=user, assistant_accepted=True, assistant_is_paid=True) & ~Q(created_by=user) |
                    # Anestesiólogo (no dueño): cobrado por él mismo
                    Q(anesthesia__anesthesiologist=user, anesthesia__anesthesiologist_accepted=True,
                      anesthesia__is_paid=True) & ~Q(created_by=user)
                )
            else:
                queryset = queryset.filter(
                    # Cirujano: casos activos
                    Q(created_by=user, archived_at__isnull=True, is_paid=False) |
                    # Ayudante (no dueño): visible hasta que ÉL marque como cobrado
                    Q(assistant_doctor=user, assistant_accepted=True, assistant_is_paid=False) & ~Q(created_by=user) |
                    # Anestesiólogo (no dueño): visible hasta que ÉL marque como cobrado
                    Q(anesthesia__anesthesiologist=user, anesthesia__anesthesiologist_accepted=True,
                      anesthesia__is_paid=False) & ~Q(created_by=user) |
                    # Removido (no dueño): visible hasta que descarte la notificación
                    Q(collaborator_removals__removed_user=user, collaborator_removals__acknowledged=False) & ~Q(created_by=user)
                )

        # Optimizamos con select_related y prefetch_related para evitar el problema N+1
        queryset = queryset.select_related(
            'hospital',
            'created_by',
            'assistant_doctor',
            'insurance_company',
            'anesthesia',
        ).prefetch_related('procedures', 'images', 'anesthesia__items', 'collaborator_removals').distinct()

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
        return queryset.order_by('-created_at', '-surgery_date')

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
        if not request.user.has_premium_access:
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

            case = SurgicalCase.objects.select_related(
                'hospital', 'created_by', 'assistant_doctor', 'insurance_company'
            ).prefetch_related('procedures').get(pk=case.pk)

            response_serializer = SurgicalCaseDetailSerializer(case, context={'request': request})

            # Notify assistant if invited
            if case.assistant_doctor:
                try:
                    principal_name = request.user.get_full_name() or request.user.username
                    date_str = _fmt_date(case.surgery_date)
                    time_str = case.surgery_time.strftime('%H:%M') if case.surgery_time else ''
                    inv_body = f'{principal_name} te invitó a asistir el {date_str}'
                    if time_str:
                        inv_body += f' a las {time_str}'
                    inv_body += '. Revisá la sección Cirugías.'
                    notify_user(
                        case.assistant_doctor,
                        title='Nueva invitación a cirugía',
                        body=inv_body,
                        data={'route': '/cases/assisted'},
                    )
                except Exception:
                    logger.exception('Error sending push notification on case create case=%s', case.pk)

            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except rest_serializers.ValidationError as e:
            logger.warning("Validation error creating case for user %s", request.user.id)
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Error creating case for user %s", request.user.id)
            return Response(
                {'error': 'Error al crear el caso. Por favor intentá de nuevo.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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

        prev_assistant_id = instance.assistant_doctor_id
        prev_assistant_accepted = instance.assistant_accepted
        prev_surgery_date = instance.surgery_date
        prev_surgery_time = instance.surgery_time

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        case = serializer.save()

        # Si el ayudante había aceptado y fue reemplazado → notificación de remoción
        if (
            prev_assistant_id and
            prev_assistant_accepted is True and
            case.assistant_doctor_id != prev_assistant_id
        ):
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                old_assistant = User.objects.get(pk=prev_assistant_id)
                CollaboratorRemoval.objects.update_or_create(
                    case=case, removed_user=old_assistant, role='assistant',
                    defaults={'acknowledged': False},
                )
                notify_user(
                    old_assistant,
                    title='Actualización en una cirugía',
                    body='Hubo un cambio en el equipo de una cirugía en la que participabas. Revisá tus casos.',
                    data={'route': '/cases'},
                )
            except Exception:
                logger.exception('Error creating collaborator removal notification case=%s', case.pk)

        case = SurgicalCase.objects.select_related(
            'hospital', 'created_by', 'assistant_doctor', 'insurance_company'
        ).prefetch_related('procedures').get(pk=case.pk)

        principal_name = request.user.get_full_name() or request.user.username

        try:
            if case.assistant_doctor and case.assistant_doctor_id != prev_assistant_id:
                date_str = _fmt_date(case.surgery_date)
                time_str = case.surgery_time.strftime('%H:%M') if case.surgery_time else ''
                inv_body = f'{principal_name} te invitó a asistir el {date_str}'
                if time_str:
                    inv_body += f' a las {time_str}'
                inv_body += '. Revisá la sección Cirugías.'
                notify_user(
                    case.assistant_doctor,
                    title='Nueva invitación a cirugía',
                    body=inv_body,
                    data={'route': '/cases/assisted'},
                )
            elif case.assistant_doctor and case.assistant_accepted is True:
                notify_user(
                    case.assistant_doctor,
                    title='Caso actualizado',
                    body=f'{principal_name} editó un caso en el que participás.',
                    data={'route': f'/cases/{case.pk}'},
                )
        except Exception:
            logger.exception('Error sending push notification on case update case=%s', case.pk)

        # Notificar al equipo si cambió la fecha u hora
        date_changed = case.surgery_date != prev_surgery_date
        time_changed = case.surgery_time != prev_surgery_time
        if date_changed or time_changed:
            date_str = _fmt_date(case.surgery_date)
            time_str = case.surgery_time.strftime('%H:%M') if case.surgery_time else ''
            schedule_body = f'{principal_name} actualizó el horario de una cirugía en la que participás: {date_str}'
            if time_str:
                schedule_body += f' a las {time_str}'
            schedule_body += '.'
            try:
                if case.assistant_doctor and case.assistant_accepted is True:
                    notify_user(
                        case.assistant_doctor,
                        title='Cambio de horario',
                        body=schedule_body,
                        data={'route': f'/cases/{case.pk}'},
                    )
                anesthesia = getattr(case, 'anesthesia', None)
                if anesthesia and anesthesia.anesthesiologist and anesthesia.anesthesiologist_accepted is True:
                    notify_user(
                        anesthesia.anesthesiologist,
                        title='Cambio de horario',
                        body=schedule_body,
                        data={'route': f'/cases/{case.pk}'},
                    )
            except Exception:
                logger.exception('Error sending schedule-change notification case=%s', case.pk)

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

    @action(detail=True, methods=['patch'], url_path='assistant-status')
    def assistant_status(self, request, pk=None):
        """El médico ayudante actualiza sus propios estados de cobro (independientes del cirujano)."""
        instance = self.get_object()

        if instance.assistant_doctor != request.user or instance.assistant_accepted is not True:
            return Response(
                {'error': 'Solo el médico ayudante aceptado puede actualizar su estado.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        allowed = {'assistant_is_operated', 'assistant_is_billed', 'assistant_is_paid', 'assistant_invoice_number'}
        data = {k: v for k, v in request.data.items() if k in allowed}

        if not data:
            return Response({'error': 'Sin campos válidos para actualizar.'}, status=status.HTTP_400_BAD_REQUEST)

        for field, value in data.items():
            setattr(instance, field, value)
        instance.save(update_fields=list(data.keys()) + ['updated_at'])

        return Response(SurgicalCaseListSerializer(instance, context={'request': request}).data)

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
        if not request.user.has_premium_access:
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

        assistant_name = request.user.get_full_name() or request.user.username
        try:
            date_str = _fmt_date(case.surgery_date)
            notify_user(
                case.created_by,
                title='Equipo confirmado',
                body=f'{assistant_name} confirmó su participación como ayudante en tu cirugía del {date_str}.',
                data={'route': f'/cases/{case.pk}'},
            )
        except Exception:
            logger.exception('Error sending push notification on accept invitation case=%s', case.pk)

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

        principal = case.created_by
        assistant_name = request.user.get_full_name() or request.user.username

        # Rechazar invitación — limpiar la asignación completamente
        # para que el médico principal pueda invitar a alguien más
        case.assistant_doctor = None
        case.assistant_accepted = None
        case.save(update_fields=['assistant_doctor', 'assistant_accepted'])

        try:
            date_str = _fmt_date(case.surgery_date)
            notify_user(
                principal,
                title='Cambio en tu equipo',
                body=f'{assistant_name} no pudo aceptar la cirugía del {date_str}. Podés asignar otro ayudante.',
                data={'route': f'/cases/{case.pk}'},
            )
        except Exception:
            logger.exception('Error sending push notification on reject invitation case=%s', case.pk)

        return Response({
            'message': 'Invitación rechazada.'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        """
        Obtener estadísticas de casos del usuario: propios, más los casos donde
        colabora como médico ayudante o anestesiólogo aceptado (también operó).
        """
        queryset = SurgicalCase.objects.filter(
            Q(created_by=request.user) |
            Q(assistant_doctor=request.user, assistant_accepted=True) |
            Q(anesthesia__anesthesiologist=request.user, anesthesia__anesthesiologist_accepted=True)
        ).distinct().select_related('hospital').prefetch_related('procedures')

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

        # Collaborators this month (distinct assistant doctors on cases I own —
        # not cases where I'm the one collaborating)
        collaborators_this_month = queryset.filter(
            created_by=request.user,
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

        # Insurers by case count — "Sin seguro" is a synthetic bucket for cases
        # with no insurance_company set, so doctors can see how many surgeries
        # they operate without insurance (default until they pick one).
        insured_by_count = (
            queryset.exclude(insurance_company__isnull=True)
            .values('insurance_company__name')
            .annotate(count=Count('id'))
        )
        top_insurers_by_count_list = [
            {'name': i['insurance_company__name'], 'count': i['count']}
            for i in insured_by_count
        ]
        no_insurance_count = queryset.filter(insurance_company__isnull=True).count()
        if no_insurance_count > 0:
            top_insurers_by_count_list.append({'name': 'Sin seguro', 'count': no_insurance_count})
        top_insurers_by_count_list.sort(key=lambda x: -x['count'])
        top_insurers_by_count_list = top_insurers_by_count_list[:5]

        # Insurers by RVU — same "Sin seguro" bucket
        insured_by_rvu = (
            CaseProcedure.objects.filter(
                case__in=queryset.exclude(insurance_company__isnull=True)
            )
            .values('case__insurance_company__name')
            .annotate(total_rvu=Sum('rvu'), count=Count('case', distinct=True))
        )
        top_insurers_by_rvu_list = [
            {'name': i['case__insurance_company__name'], 'total_rvu': round(float(i['total_rvu'] or 0), 1), 'count': i['count']}
            for i in insured_by_rvu
        ]
        no_insurance_rvu = CaseProcedure.objects.filter(
            case__in=queryset.filter(insurance_company__isnull=True)
        ).aggregate(total_rvu=Sum('rvu'), count=Count('case', distinct=True))
        if no_insurance_rvu['count']:
            top_insurers_by_rvu_list.append({
                'name': 'Sin seguro',
                'total_rvu': round(float(no_insurance_rvu['total_rvu'] or 0), 1),
                'count': no_insurance_rvu['count'],
            })
        top_insurers_by_rvu_list.sort(key=lambda x: -x['total_rvu'])
        top_insurers_by_rvu_list = top_insurers_by_rvu_list[:5]

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
        if not calendar_event_id or not isinstance(calendar_event_id, str) or len(calendar_event_id) > 255:
            return Response(
                {'error': 'calendar_event_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Direct DB update — bypasses full_clean() / business-logic validators
        # that are irrelevant for this single-field write.
        SurgicalCase.objects.filter(pk=case.pk).update(calendar_event_id=calendar_event_id)

        return Response({'calendar_event_id': calendar_event_id}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='sync-assistant-calendar')
    def sync_assistant_calendar(self, request, pk=None):
        """
        Persist the assistant's Google Calendar event ID for a case.
        Only the assigned assistant can call this.
        """
        case = self.get_object()

        if case.assistant_doctor != request.user:
            return Response(
                {'error': 'Solo el ayudante del caso puede sincronizar su calendario'},
                status=status.HTTP_403_FORBIDDEN
            )

        calendar_event_id = request.data.get('calendar_event_id')
        if not calendar_event_id or not isinstance(calendar_event_id, str) or len(calendar_event_id) > 255:
            return Response(
                {'error': 'calendar_event_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        SurgicalCase.objects.filter(pk=case.pk).update(assistant_calendar_event_id=calendar_event_id)
        return Response({'assistant_calendar_event_id': calendar_event_id}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='sync-anesthesiologist-calendar')
    def sync_anesthesiologist_calendar(self, request, pk=None):
        """
        Persist the invited anesthesiologist's Google Calendar event ID for a case.
        Only the accepted anesthesiologist on the case can call this.
        """
        case = self.get_object()

        try:
            anesthesia = case.anesthesia
        except Exception:
            anesthesia = None

        if not anesthesia or anesthesia.anesthesiologist != request.user or anesthesia.anesthesiologist_accepted is not True:
            return Response(
                {'error': 'Solo el anestesiólogo aceptado del caso puede sincronizar su calendario'},
                status=status.HTTP_403_FORBIDDEN
            )

        calendar_event_id = request.data.get('calendar_event_id')
        if not calendar_event_id or not isinstance(calendar_event_id, str) or len(calendar_event_id) > 255:
            return Response(
                {'error': 'calendar_event_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        SurgicalCase.objects.filter(pk=case.pk).update(anesthesiologist_calendar_event_id=calendar_event_id)
        return Response({'anesthesiologist_calendar_event_id': calendar_event_id}, status=status.HTTP_200_OK)

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

    @action(detail=True, methods=['post'], url_path='dismiss-removal')
    def dismiss_removal(self, request, pk=None):
        """El colaborador removido descarta la notificación de remoción."""
        instance = self.get_object()
        updated = CollaboratorRemoval.objects.filter(
            case=instance, removed_user=request.user, acknowledged=False
        ).update(acknowledged=True)
        if not updated:
            return Response({'error': 'No hay notificación de remoción para descartar.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'status': 'acknowledged'})

    @action(detail=True, methods=['post'], url_path='leave')
    def leave_case(self, request, pk=None):
        """Un colaborador aceptado se retira voluntariamente del caso."""
        instance = self.get_object()
        user = request.user
        user_name = user.get_full_name() or user.username

        # Ayudante dejando el caso
        if instance.assistant_doctor == user and instance.assistant_accepted is True:
            instance.assistant_accepted = False
            instance.save(update_fields=['assistant_accepted'])
            try:
                notify_user(
                    instance.created_by,
                    title='Médico ayudante salió del caso',
                    body=f'{user_name} salió de un caso en el que participaba como ayudante.',
                    data={'route': f'/cases/{instance.pk}'},
                )
            except Exception:
                logger.exception('Error notifying surgeon on leave case=%s', instance.pk)
            return Response({'status': 'left', 'role': 'assistant'})

        # Anestesiólogo dejando el caso
        try:
            anesthesia = instance.anesthesia
            if anesthesia.anesthesiologist == user and anesthesia.anesthesiologist_accepted is True:
                anesthesia.anesthesiologist_accepted = False
                anesthesia.save(update_fields=['anesthesiologist_accepted'])
                try:
                    notify_user(
                        instance.created_by,
                        title='Anestesiólogo salió del caso',
                        body=f'{user_name} salió de un caso en el que participaba como anestesiólogo.',
                        data={'route': f'/cases/{instance.pk}'},
                    )
                except Exception:
                    logger.exception('Error notifying surgeon on leave case=%s', instance.pk)
                return Response({'status': 'left', 'role': 'anesthesiologist'})
        except Exception:
            pass

        return Response({'error': 'No sos colaborador activo de este caso.'}, status=status.HTTP_403_FORBIDDEN)


class CaseProcedureViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar procedimientos individuales
    """
    serializer_class = CaseProcedureSerializer
    permission_classes = [IsAuthenticated, IsEmailVerified]

    def get_queryset(self):
        user = self.request.user
        # Write operations: only the case owner can modify or delete procedures
        if self.action in ('update', 'partial_update', 'destroy'):
            return CaseProcedure.objects.filter(
                case__created_by=user
            ).select_related('case', 'case__hospital')
        # Read operations: owner + accepted assistant
        return CaseProcedure.objects.filter(
            Q(case__created_by=user) |
            Q(case__assistant_doctor=user, case__assistant_accepted=True)
        ).select_related('case', 'case__hospital').distinct()