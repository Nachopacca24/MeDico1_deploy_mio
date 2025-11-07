from django.contrib import admin
from .models import (
    Specialty,
    Hospital,
    Operation,
    HospitalOperationRate,
    Favorite,
    CalculationHistory
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
