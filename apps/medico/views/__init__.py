from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action

from apps.medico.models import Favorite
from apps.medico.serializers import FavoriteSerializer

# Import surgical case views
from .surgical_case import SurgicalCaseViewSet, CaseProcedureViewSet


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
