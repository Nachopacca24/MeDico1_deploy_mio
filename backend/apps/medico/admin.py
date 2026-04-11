from django.contrib import admin
from .models import (
    Specialty,
    Hospital,
    Operation,
    HospitalOperationRate,
    Favorite,
    CalculationHistory,
    SurgicalCase,
    CaseProcedure,
)


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at', 'updated_at']
    search_fields = ['name', 'description']
    ordering = ['name']


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'rate_multiplier', 'created_at']
    search_fields = ['name', 'location']
    list_filter = ['rate_multiplier']
    ordering = ['name']


@admin.register(Operation)
class OperationAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'specialty', 'base_points', 'complexity', 'created_at']
    search_fields = ['code', 'name', 'description']
    list_filter = ['specialty', 'complexity']
    ordering = ['specialty', 'name']
    list_per_page = 50


@admin.register(HospitalOperationRate)
class HospitalOperationRateAdmin(admin.ModelAdmin):
    list_display = ['hospital', 'operation', 'point_value', 'currency_per_point', 'last_updated']
    search_fields = ['hospital__name', 'operation__name', 'operation__code']
    list_filter = ['hospital', 'last_updated']
    ordering = ['hospital', 'operation']
    list_per_page = 50


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['user', 'surgery_code', 'surgery_name', 'specialty', 'created_at']
    search_fields = ['user__username', 'user__email', 'surgery_code', 'surgery_name', 'specialty']
    list_filter = ['specialty', 'created_at']
    ordering = ['-created_at']
    raw_id_fields = ['user']
    readonly_fields = ['created_at']
    list_per_page = 50


@admin.register(CalculationHistory)
class CalculationHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'operation', 'hospital', 'calculated_value', 'calculated_at']
    search_fields = ['user__username', 'operation__name', 'hospital__name']
    list_filter = ['hospital', 'calculated_at']
    ordering = ['-calculated_at']
    raw_id_fields = ['user', 'operation', 'hospital']
    readonly_fields = ['calculated_at']
    list_per_page = 50


class CaseProcedureInline(admin.TabularInline):
    """Inline para procedimientos dentro del caso"""
    model = CaseProcedure
    extra = 1
    fields = ['surgery_code', 'surgery_name', 'specialty', 'rvu', 'calculated_value', 'order']
    ordering = ['order']


@admin.register(SurgicalCase)
class SurgicalCaseAdmin(admin.ModelAdmin):
    list_display = [
        'patient_name',
        'surgery_date',
        'hospital',
        'status',
        'procedure_count',
        'total_value',
        'created_by',
        'created_at'
    ]
    search_fields = [
        'patient_name',
        'patient_id',
        'hospital__name',
        'created_by__username',
        'diagnosis'
    ]
    list_filter = ['status', 'hospital', 'surgery_date', 'created_at']
    ordering = ['-surgery_date', '-created_at']
    raw_id_fields = ['created_by', 'hospital']
    readonly_fields = ['created_at', 'updated_at', 'total_rvu', 'total_value', 'procedure_count']
    inlines = [CaseProcedureInline]
    
    fieldsets = (
        ('Información del Paciente', {
            'fields': ('patient_name', 'patient_id', 'patient_age', 'patient_gender')
        }),
        ('Información de Cirugía', {
            'fields': ('hospital', 'surgery_date', 'surgery_time', 'status')
        }),
        ('Detalles Médicos', {
            'fields': ('diagnosis', 'notes')
        }),
        ('Resumen', {
            'fields': ('total_rvu', 'total_value', 'procedure_count'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    list_per_page = 30
    date_hierarchy = 'surgery_date'
    
    def procedure_count(self, obj):
        return obj.procedure_count
    procedure_count.short_description = 'Procedimientos'


@admin.register(CaseProcedure)
class CaseProcedureAdmin(admin.ModelAdmin):
    list_display = [
        'case',
        'surgery_code',
        'surgery_name',
        'specialty',
        'rvu',
        'calculated_value',
        'order'
    ]
    search_fields = [
        'surgery_code',
        'surgery_name',
        'specialty',
        'case__patient_name'
    ]
    list_filter = ['specialty', 'created_at']
    ordering = ['case', 'order']
    raw_id_fields = ['case']
    readonly_fields = ['created_at', 'updated_at']
    
    list_per_page = 50
