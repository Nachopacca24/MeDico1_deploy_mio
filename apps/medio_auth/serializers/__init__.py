from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework.exceptions import ValidationError

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer para mostrar información del usuario"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    name = serializers.CharField(source='get_full_name', read_only=True)  # Alias para compatibilidad con frontend
    is_profile_complete = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'name',
            'phone', 'specialty', 'license_number', 'hospital_default',
            'avatar', 'signature_image', 'is_verified', 'theme_preference',
            'is_profile_complete', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_verified', 'created_at', 'updated_at', 'name', 'full_name']


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
        """Crear nuevo usuario"""
        validated_data.pop('password2')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            password=password,
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
            # Verificar contraseña manualmente primero (tiempo constante)
            password_valid = check_password(password, user_obj.password)
            
            if password_valid:
                # Solo autenticar si la contraseña es correcta
                user = authenticate(
                    request=self.context.get('request'),
                    username=user_obj.username,
                    password=password
                )
        else:
            # Realizar dummy password check para mantener tiempo constante
            # Usar un hash falso que tenga el mismo tiempo de procesamiento
            check_password(password, 'pbkdf2_sha256$260000$invalid$invalid')
        
        # Usar mensaje genérico para prevenir enumeración de usuarios
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
