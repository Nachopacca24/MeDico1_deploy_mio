# apps/medio_auth/serializers/__init__.py
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework.exceptions import ValidationError

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer para mostrar información del usuario"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    name = serializers.CharField(source='get_full_name', read_only=True)
    is_profile_complete = serializers.BooleanField(read_only=True)
    is_admin = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'name',
            'role', 'is_admin', 'plan', 'friend_code',
            'phone', 'specialty', 'license_number', 'hospital_default',
            'avatar', 'signature_image', 
            'is_verified', 'is_email_verified',
            'theme_preference',
            'is_profile_complete', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_verified', 'is_email_verified', 'friend_code',
            'created_at', 'updated_at', 'name', 'full_name', 'is_admin'
        ]


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer para registro de nuevos usuarios"""
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'},
        label="Confirmar contraseña"
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2',
            'first_name', 'last_name', 'phone', 'specialty',
            'license_number', 'hospital_default'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True},
        }
    
    def validate(self, attrs):
        """Validar que las contraseñas coincidan"""
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "Las contraseñas no coinciden."
            })
        
        # Validar email único
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({
                "email": "Este email ya está registrado."
            })
        
        # Validar username único
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError({
                "username": "Este nombre de usuario ya está en uso."
            })
        
        # Validar license_number único (si se proporciona)
        if attrs.get('license_number'):
            if User.objects.filter(license_number=attrs['license_number']).exists():
                raise serializers.ValidationError({
                    "license_number": "Este número de colegiado ya está registrado."
                })
        
        return attrs
    
    def create(self, validated_data):
        """Crear nuevo usuario con email sin verificar"""
        validated_data.pop('password2')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            password=password,
            is_email_verified=False,
            **validated_data
        )
        
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer para login de usuarios"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        from django.contrib.auth.hashers import check_password
        
        email = attrs.get('email')
        password = attrs.get('password')
        
        if not email or not password:
            raise ValidationError({
                'non_field_errors': 'Debe proporcionar email y contraseña.'
            })
        
        user = None
        user_obj = None
        
        # Buscar usuario por email
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            pass
        
        # Siempre realizar verificación de contraseña para prevenir timing attacks
        if user_obj:
            password_valid = check_password(password, user_obj.password)
            
            if password_valid:
                user = authenticate(
                    request=self.context.get('request'),
                    username=user_obj.username,
                    password=password
                )
        else:
            check_password(password, 'pbkdf2_sha256$260000$invalid$invalid')
        
        if not user:
            raise ValidationError({
                'non_field_errors': 'Credenciales inválidas. Por favor verifique su email y contraseña.'
            })
        
        if not user.is_active:
            raise ValidationError({
                'non_field_errors': 'Esta cuenta está desactivada.'
            })
        
        attrs['user'] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer para cambiar contraseña"""
    old_password = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        write_only=True, 
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password2 = serializers.CharField(
        write_only=True, 
        required=True,
        style={'input_type': 'password'},
        label="Confirmar nueva contraseña"
    )
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({
                "new_password": "Las contraseñas no coinciden."
            })
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Contraseña actual incorrecta.")
        return value
    
    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar perfil de usuario"""
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone', 'specialty',
            'license_number', 'hospital_default', 'avatar',
            'signature_image', 'theme_preference'
        ]
    
    def validate_license_number(self, value):
        """Validar que el license_number sea único (excepto para el usuario actual)"""
        if value:
            user = self.context['request'].user
            if User.objects.filter(license_number=value).exclude(id=user.id).exists():
                raise serializers.ValidationError(
                    "Este número de colegiado ya está registrado."
                )
        return value


# ============================================
# SERIALIZERS DE AMISTAD/COLEGAS
# ============================================

class ColleagueSerializer(serializers.ModelSerializer):
    """Serializer simplificado para mostrar información de colegas"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'specialty', 'hospital_default', 'avatar', 'friend_code', 'phone'
        ]
        read_only_fields = fields


class FriendshipSerializer(serializers.ModelSerializer):
    """Serializer para relaciones de amistad"""
    colleague = ColleagueSerializer(source='friend', read_only=True)
    
    class Meta:
        from apps.medio_auth.models import Friendship
        model = Friendship
        fields = ['id', 'colleague', 'created_at']
        read_only_fields = fields


class FriendRequestSerializer(serializers.ModelSerializer):
    """Serializer para solicitudes de amistad"""
    from_user = ColleagueSerializer(read_only=True)
    to_user = ColleagueSerializer(read_only=True)
    
    class Meta:
        from apps.medio_auth.models import FriendRequest
        model = FriendRequest
        fields = ['id', 'from_user', 'to_user', 'status', 'created_at', 'updated_at']
        read_only_fields = fields