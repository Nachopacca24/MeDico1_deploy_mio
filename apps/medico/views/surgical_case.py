# apps/medico/views/surgical_case.py

"""
ViewSets para casos quirúrgicos
"""
from django.db.models import Sum, Count, Q
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from decimal import Decimal

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
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retornar casos del usuario autenticado (propios + donde es ayudante)"""
        user = self.request.user
        
        # Verificar si se pide solo casos asistidos
        assisted_only = self.request.query_params.get('assisted_only', 'false').lower() == 'true'
        
        if assisted_only:
            # Solo casos donde soy ayudante
            queryset = SurgicalCase.objects.filter(
                assistant_doctor=user
            )
        else:
            # Casos propios O donde soy ayudante
            queryset = SurgicalCase.objects.filter(
                Q(created_by=user) | Q(assistant_doctor=user)
            )
        
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
            queryset = queryset.filter(surgery_date__gte=date_from)
        
        date_to = self.request.query_params.get('date_to', None)
        if date_to:
            queryset = queryset.filter(surgery_date__lte=date_to)
        
        # Búsqueda por nombre de paciente
        search = self.request.query_params.get('search', None)
        if search:
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
        # Log incoming data
        print(f"DEBUG VIEW: Incoming case data: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            # Pasamos explícitamente el usuario al save
            case = serializer.save(created_by=request.user)
            print(f"DEBUG VIEW: Case created successfully: {case.id}")
            
            # Devolvemos el ID y un mensaje de éxito rápido
            return Response({
                'id': case.id,
                'status': 'success',
                'message': 'Caso creado correctamente'
            }, status=status.HTTP_201_CREATED)
        except serializers.ValidationError as e:
            print(f"DEBUG VIEW VALIDATION ERROR: {e.detail}")
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            print(f"DEBUG VIEW ERROR: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': 'Error interno del servidor', 'detail': str(e)},
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
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        case = serializer.save()
        
        # Retornar con serializer detallado
        detail_serializer = SurgicalCaseDetailSerializer(case, context={'request': request})
        return Response(detail_serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Eliminar caso (validando permisos)"""
        instance = self.get_object()
        
        # Verificar permisos
        if not instance.can_be_deleted_by(request.user):
            return Response(
                {'error': 'No tienes permiso para eliminar este caso'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Intentar eliminar
        try:
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except DjangoValidationError as e:
            return Response(
                {'error': str(e.message) if hasattr(e, 'message') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], url_path='assisted')
    def get_assisted_cases(self, request):
        """
        Obtener casos donde el usuario actual es ayudante
        """
        cases = SurgicalCase.objects.filter(
            assistant_doctor=request.user
        ).select_related(
            'hospital', 
            'created_by'
        ).prefetch_related('procedures')
        
        # Separar en pendientes y aceptados
        # Solo mostrar pendientes (null) y aceptados (true)
        # Los rechazados (false) NO aparecen
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
        
        # Rechazar invitación (marcar como false)
        case.assistant_accepted = False
        case.save()
        
        return Response({
            'message': 'Invitación rechazada. El creador del caso será notificado.'
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
        
        # Casos por estado con valor total
        cases_by_status = {}
        for status_choice in SurgicalCase.STATUS_CHOICES:
            status_code = status_choice[0]
            status_cases = queryset.filter(status=status_code)
            count = status_cases.count()
            
            # Calcular valor total para este estado
            status_value = CaseProcedure.objects.filter(
                case__in=status_cases
            ).aggregate(
                total=Sum('calculated_value')
            )['total'] or Decimal('0.00')
            
            cases_by_status[status_code] = {
                'count': count,
                'total_value': float(status_value)
            }
        
        # Casos por especialidad (top 5) con valor total
        specialty_stats = CaseProcedure.objects.filter(
            case__in=queryset
        ).values('specialty').annotate(
            count=Count('id'),
            total_value=Sum('calculated_value')
        ).order_by('-count')[:5]
        
        cases_by_specialty = {
            item['specialty']: {
                'count': item['count'],
                'total_value': float(item['total_value'] or 0)
            }
            for item in specialty_stats
        }
        
        # Casos recientes (últimos 5)
        recent_cases = queryset.order_by('-surgery_date', '-created_at')[:5]
        recent_serializer = SurgicalCaseListSerializer(
            recent_cases, 
            many=True,
            context={'request': request}
        )
        
        stats_data = {
            'total_cases': total_cases,
            'total_procedures': total_procedures,
            'total_value': float(total_value),
            'cases_by_status': cases_by_status,
            'cases_by_specialty': cases_by_specialty,
            'recent_cases': recent_serializer.data,
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