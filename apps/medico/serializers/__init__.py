from rest_framework import serializers
from apps.medico.models import Favorite


class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer para favoritos de cirugías"""
    
    class Meta:
        model = Favorite
        fields = ['id', 'surgery_code', 'surgery_name', 'specialty', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate_surgery_code(self, value):
        """Validar que el código no esté vacío"""
        if not value or not value.strip():
            raise serializers.ValidationError("El código de cirugía no puede estar vacío")
        return value.strip()
    
    def create(self, validated_data):
        """Crear favorito asociado al usuario actual"""
        # El user se añade en la vista desde request.user
        return super().create(validated_data)
