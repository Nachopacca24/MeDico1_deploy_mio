"""
Serializers y Views para Hospitales
"""
from rest_framework import serializers, viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.medico.models import Hospital, FavoriteHospital


class HospitalSerializer(serializers.ModelSerializer):
    """Serializer para hospitales"""
    is_favorite = serializers.SerializerMethodField()
    
    class Meta:
        model = Hospital
        fields = ['id', 'name', 'location', 'rate_multiplier', 'created_at', 'updated_at', 'is_favorite']
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_favorite']
    
    def get_is_favorite(self, obj):
        """Verifica si el hospital es favorito del usuario actual"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return FavoriteHospital.objects.filter(
                user=request.user,
                hospital=obj
            ).exists()
        return False


class FavoriteHospitalSerializer(serializers.ModelSerializer):
    """Serializer para hospitales favoritos"""
    hospital = HospitalSerializer(read_only=True)
    hospital_id = serializers.PrimaryKeyRelatedField(
        queryset=Hospital.objects.all(),
        source='hospital',
        write_only=True
    )
    
    class Meta:
        model = FavoriteHospital
        fields = ['id', 'hospital', 'hospital_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class HospitalViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet de solo lectura para hospitales
    Los usuarios pueden ver hospitales pero no crear/editar/eliminar
    """
    serializer_class = HospitalSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Desactivar paginación para mostrar todos los hospitales
    
    def get_queryset(self):
        """
        Ordena hospitales: favoritos primero, luego por nombre
        """
        from django.db.models import Case, When, IntegerField
        
        queryset = Hospital.objects.all()
        
        if self.request.user.is_authenticated:
            # Obtener IDs de hospitales favoritos
            favorite_ids = list(FavoriteHospital.objects.filter(
                user=self.request.user
            ).values_list('hospital_id', flat=True))
            
            if favorite_ids:
                # Ordenar: favoritos primero (0), luego no favoritos (1)
                queryset = queryset.annotate(
                    is_fav=Case(
                        When(id__in=favorite_ids, then=0),
                        default=1,
                        output_field=IntegerField()
                    )
                ).order_by('is_fav', 'name')
            else:
                queryset = queryset.order_by('name')
        else:
            queryset = queryset.order_by('name')
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def favorite(self, request, pk=None):
        """Agregar hospital a favoritos"""
        hospital = self.get_object()
        favorite, created = FavoriteHospital.objects.get_or_create(
            user=request.user,
            hospital=hospital
        )
        
        if created:
            return Response(
                {'status': 'added', 'message': f'{hospital.name} agregado a favoritos'},
                status=status.HTTP_201_CREATED
            )
        return Response(
            {'status': 'already_favorite', 'message': f'{hospital.name} ya está en favoritos'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['delete'])
    def unfavorite(self, request, pk=None):
        """Quitar hospital de favoritos"""
        hospital = self.get_object()
        deleted_count, _ = FavoriteHospital.objects.filter(
            user=request.user,
            hospital=hospital
        ).delete()
        
        if deleted_count > 0:
            return Response(
                {'status': 'removed', 'message': f'{hospital.name} quitado de favoritos'},
                status=status.HTTP_204_NO_CONTENT
            )
        return Response(
            {'status': 'not_favorite', 'message': f'{hospital.name} no estaba en favoritos'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=False, methods=['get'])
    def favorites(self, request):
        """Listar solo hospitales favoritos del usuario"""
        favorites = FavoriteHospital.objects.filter(
            user=request.user
        ).select_related('hospital')
        
        serializer = FavoriteHospitalSerializer(favorites, many=True, context={'request': request})
        return Response(serializer.data)
