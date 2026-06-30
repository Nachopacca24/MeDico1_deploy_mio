"""
Serializers y Views para Hospitales
"""
from django.db.models import Exists, OuterRef, Case, When, IntegerField
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
        fields = ['id', 'name', 'location', 'created_at', 'updated_at', 'is_favorite']
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_favorite']

    def get_is_favorite(self, obj):
        # Uses annotation from queryset — no extra DB query
        if hasattr(obj, 'is_fav_annotated'):
            return obj.is_fav_annotated
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return FavoriteHospital.objects.filter(user=request.user, hospital=obj).exists()
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
        user = self.request.user
        fav_subquery = FavoriteHospital.objects.filter(
            user=user, hospital=OuterRef('pk')
        )
        queryset = Hospital.objects.annotate(
            is_fav_annotated=Exists(fav_subquery),
            is_fav_order=Case(
                When(is_fav_annotated=True, then=0),
                default=1,
                output_field=IntegerField()
            )
        ).order_by('is_fav_order', 'name')
        return queryset
    
    @action(detail=True, methods=['post'])
    def favorite(self, request, pk=None):
        """Agregar hospital a favoritos"""
        hospital = self.get_object()

        if not request.user.has_premium_access:
            current_count = FavoriteHospital.objects.filter(user=request.user).count()
            if current_count >= 2:
                return Response(
                    {'error': 'Plan gratuito: máximo 2 hospitales favoritos. Actualiza a Premium para favoritos ilimitados.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

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
