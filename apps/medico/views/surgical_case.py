"""
ViewSets para casos quirúrgicos
"""
from django.db.models import Sum, Count, Q
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
    - GET /api/cases/ - Listar casos del usuario
    - POST /api/cases/ - Crear nuevo caso
    - GET /api/cases/{id}/ - Ver detalle de caso
    - PUT/PATCH /api/cases/{id}/ - Actualizar caso
    - DELETE /api/cases/{id}/ - Eliminar caso
    - GET /api/cases/stats/ - Obtener estadísticas
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retornar solo casos del usuario autenticado"""
        queryset = SurgicalCase.objects.filter(
            created_by=self.request.user
        ).select_related('hospital', 'created_by').prefetch_related('procedures')
        
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
        
        return queryset
    
    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action == 'list':
            return SurgicalCaseListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return SurgicalCaseCreateUpdateSerializer
        else:
            return SurgicalCaseDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """Crear un nuevo caso quirúrgico"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        case = serializer.save(created_by=request.user)
        
        detail_serializer = SurgicalCaseDetailSerializer(case)
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Actualizar caso completo"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        case = serializer.save()
        
        # Retornar con serializer detallado
        detail_serializer = SurgicalCaseDetailSerializer(case)
        return Response(detail_serializer.data)
    
    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        """
        Obtener estadísticas de casos del usuario
        """
        queryset = self.get_queryset()
        
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
        
        # Casos por estado
        cases_by_status = {}
        for status_choice in SurgicalCase.STATUS_CHOICES:
            status_code = status_choice[0]
            count = queryset.filter(status=status_code).count()
            cases_by_status[status_code] = {
                'count': count,
                'label': status_choice[1]
            }
        
        # Casos por especialidad (top 5)
        cases_by_specialty = CaseProcedure.objects.filter(
            case__in=queryset
        ).values('specialty').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        specialty_dict = {
            item['specialty']: item['count'] 
            for item in cases_by_specialty
        }
        
        # Casos recientes (últimos 5)
        recent_cases = queryset.order_by('-surgery_date', '-created_at')[:5]
        recent_serializer = SurgicalCaseListSerializer(recent_cases, many=True)
        
        stats_data = {
            'total_cases': total_cases,
            'total_procedures': total_procedures,
            'total_value': float(total_value),
            'cases_by_status': cases_by_status,
            'cases_by_specialty': specialty_dict,
            'recent_cases': recent_serializer.data,
        }
        
        return Response(stats_data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='add-procedure')
    def add_procedure(self, request, pk=None):
        """
        Agregar un procedimiento a un caso existente
        Body: { "surgery_code": "...", "surgery_name": "...", ... }
        """
        case = self.get_object()
        
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
        Body: { "status": "completed" }
        """
        case = self.get_object()
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
        
        serializer = SurgicalCaseDetailSerializer(case)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CaseProcedureViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar procedimientos individuales (si se necesita acceso directo)
    """
    serializer_class = CaseProcedureSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retornar solo procedimientos de casos del usuario"""
        return CaseProcedure.objects.filter(
            case__created_by=self.request.user
        ).select_related('case', 'case__hospital')
