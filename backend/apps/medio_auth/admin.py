#  apps/medio_auth/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser


def _anonymize_user(user):
    """Conserva email, nombre y had_trial; borra todo lo demás."""
    try:
        user.created_cases.all().delete()
    except Exception:
        pass
    try:
        user.sent_friend_requests.all().delete()
        user.received_friend_requests.all().delete()
        user.friendships.all().delete()
        user.friends_of.all().delete()
    except Exception:
        pass
    try:
        user.favorite_insurances.all().delete()
    except Exception:
        pass
    user.phone = ''
    user.specialty = ''
    user.license_number = ''
    user.hospital_default = None
    user.deletion_requested_at = None
    user.had_trial = True
    user.is_active = False
    user.set_unusable_password()
    user.save()


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    """Admin personalizado para CustomUser"""
    
    # Campos a mostrar en la lista
    list_display = [
        'username', 'email', 'first_name', 'last_name',
        'specialty', 'license_number', 'is_verified',
        'is_staff', 'is_active', 'created_at'
    ]
    
    # Filtros laterales
    list_filter = [
        'is_staff', 'is_superuser', 'is_active',
        'is_verified', 'specialty', 'created_at'
    ]
    
    # Campos de búsqueda
    search_fields = [
        'username', 'email', 'first_name', 'last_name',
        'license_number', 'phone'
    ]
    
    # Ordenamiento por defecto
    ordering = ['-created_at']
    
    # Configuración de fieldsets para el formulario de edición
    fieldsets = (
        ('Información de Cuenta', {
            'fields': ('username', 'password')
        }),
        ('Información Personal', {
            'fields': ('first_name', 'last_name', 'email', 'phone')
        }),
        ('Información Profesional', {
            'fields': ('specialty', 'license_number', 'hospital_default')
        }),
        ('Archivos', {
            'fields': ('avatar', 'signature_image'),
            'classes': ('collapse',)
        }),
        ('Configuración', {
            'fields': ('theme_preference', 'is_verified')
        }),
        ('Permisos', {
            'fields': (
                'is_active', 'is_staff', 'is_superuser',
                'groups', 'user_permissions'
            ),
            'classes': ('collapse',)
        }),
        ('Fechas Importantes', {
            'fields': ('last_login', 'date_joined', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    # Configuración de fieldsets para creación de usuario
    add_fieldsets = (
        ('Información Requerida', {
            'classes': ('wide',),
            'fields': (
                'username', 'email', 'password1', 'password2',
                'first_name', 'last_name'
            ),
        }),
        ('Información Profesional (Opcional)', {
            'classes': ('wide', 'collapse'),
            'fields': ('specialty', 'license_number', 'phone', 'hospital_default'),
        }),
    )
    
    # Campos de solo lectura
    readonly_fields = ['created_at', 'updated_at', 'last_login', 'date_joined']
    
    # Número de items por página
    list_per_page = 25

    def delete_model(self, request, obj):
        """Eliminar desde el admin: anonimiza en vez de hard delete."""
        _anonymize_user(obj)

    def delete_queryset(self, request, queryset):
        """Eliminar selección múltiple desde el admin: anonimiza cada usuario."""
        for user in queryset:
            _anonymize_user(user)
