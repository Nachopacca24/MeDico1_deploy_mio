# apps/medico/views/__init__.py

from django.shortcuts import render
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count

from apps.medico.models import Favorite, SurgicalCase
from apps.medico.serializers import FavoriteSerializer

# Import surgical case views
from .surgical_case import SurgicalCaseViewSet, CaseProcedureViewSet

User = get_user_model()


class FavoriteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar favoritos de cirugías.
    
    Endpoints:
    - GET /api/favorites/ - Listar favoritos del usuario
    - POST /api/favorites/ - Agregar favorito
    - DELETE /api/favorites/{id}/ - Eliminar favorito
    - DELETE /api/favorites/clear/ - Eliminar todos los favoritos
    """
    serializer_class = FavoriteSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retornar solo favoritos del usuario autenticado"""
        return Favorite.objects.filter(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """Listar todos los favoritos del usuario"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def create(self, request, *args, **kwargs):
        """Crear un nuevo favorito"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Añadir el usuario al favorito
        serializer.save(user=request.user)
        
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    def destroy(self, request, *args, **kwargs):
        """Eliminar un favorito específico"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'message': 'Favorito eliminado correctamente'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['delete'], url_path='clear')
    def clear_all(self, request):
        """Eliminar todos los favoritos del usuario"""
        count = self.get_queryset().count()
        self.get_queryset().delete()
        
        return Response(
            {
                'message': f'{count} favorito(s) eliminado(s) correctamente',
                'count': count
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle_favorite(self, request):
        """
        Alternar favorito: agregar si no existe, eliminar si existe
        Body: { "surgery_code": "12345", "surgery_name": "...", "specialty": "..." }
        """
        surgery_code = request.data.get('surgery_code')
        
        if not surgery_code:
            return Response(
                {'error': 'surgery_code es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar si existe
        favorite = Favorite.objects.filter(
            user=request.user,
            surgery_code=surgery_code
        ).first()
        
        if favorite:
            # Si existe, eliminar
            favorite.delete()
            return Response(
                {
                    'message': 'Favorito eliminado',
                    'action': 'removed',
                    'is_favorite': False
                },
                status=status.HTTP_200_OK
            )
        else:
            # Si no existe, crear
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(user=request.user)
            
            return Response(
                {
                    'message': 'Favorito agregado',
                    'action': 'added',
                    'is_favorite': True,
                    'data': serializer.data
                },
                status=status.HTTP_201_CREATED
            )


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar usuarios desde el panel de admin
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = User.objects.all()
    
    def list(self, request):
        """
        Listar todos los usuarios con sus estadísticas
        """
        users = User.objects.annotate(
            total_cases=Count('surgicalcase', distinct=True),
            total_favorites=Count('favorite', distinct=True)
        ).values(
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'specialty', 'is_superuser', 'is_staff', 
            'is_active', 'date_joined', 'plan',
            'total_cases', 'total_favorites'
        )
        
        return Response(list(users))
    
    def destroy(self, request, pk=None):
        """
        Eliminar usuario y todos sus datos relacionados
        """
        try:
            user = self.get_object()
            
            # No permitir eliminar superusuarios
            if user.is_superuser:
                return Response(
                    {'error': 'No se puede eliminar un superusuario'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Eliminar casos (y sus procedimientos por CASCADE)
            SurgicalCase.objects.filter(created_by=user).delete()
            
            # Eliminar favoritos
            Favorite.objects.filter(user=user).delete()
            
            # Eliminar usuario
            user.delete()
            
            return Response(
                {'message': 'Usuario eliminado exitosamente'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['patch'], url_path='toggle_active')
    def toggle_active(self, request, pk=None):
        """
        Activar/desactivar usuario
        """
        user = self.get_object()
        
        if user.is_superuser:
            return Response(
                {'error': 'No se puede modificar un superusuario'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.is_active = request.data.get('is_active', user.is_active)
        user.save()
        
        return Response({'message': 'Usuario actualizado'})
    
    @action(detail=True, methods=['patch'], url_path='update_plan')
    def update_plan(self, request, pk=None):
        """
        Actualizar plan del usuario
        """
        user = self.get_object()
        plan = request.data.get('plan')
        
        if plan not in ['bronze', 'silver', 'gold']:
            return Response(
                {'error': 'Plan inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.plan = plan
        user.save()
        
        return Response({'message': 'Plan actualizado'})