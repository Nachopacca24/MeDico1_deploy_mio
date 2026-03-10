from tabnanny import verbose
from django.db import models
from django.conf import settings

# Import surgical case models
from .surgical_case import SurgicalCase, CaseProcedure


class Specialty(models.Model):
    """Especialidades médicas"""
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nombre"
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descripción"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Especialidad'
        verbose_name_plural = 'Especialidades'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Hospital(models.Model):
    """Hospitales y clínicas"""
    name = models.CharField(
        max_length=200,
        unique=True,
        verbose_name="Nombre"
    )
    location = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Ubicación"
    )
    rate_multiplier = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.00,
        verbose_name="Multiplicador de Tarifa",
        help_text="Factor de multiplicación para cálculo de costos"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Hospital'
        verbose_name_plural = 'Hospitales'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Operation(models.Model):
    """Operaciones/Procedimientos médicos"""
    name = models.CharField(
        max_length=300,
        verbose_name="Nombre"
    )
    code = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Código",
        help_text="Código de la operación (ej: CPT, ICD)"
    )
    specialty = models.ForeignKey(
        Specialty,
        on_delete=models.CASCADE,
        related_name='operations',
        verbose_name="Especialidad"
    )
    base_points = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Puntos Base",
        help_text="Puntos base para cálculo de costo"
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descripción"
    )
    complexity = models.IntegerField(
        default=1,
        verbose_name="Complejidad",
        help_text="Nivel de complejidad (1-5)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Operación'
        verbose_name_plural = 'Operaciones'
        ordering = ['specialty', 'name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['specialty']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.name}" if self.code else self.name


class HospitalOperationRate(models.Model):
    """Tarifas específicas de operaciones por hospital"""
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name='operation_rates',
        verbose_name="Hospital"
    )
    operation = models.ForeignKey(
        Operation,
        on_delete=models.CASCADE,
        related_name='hospital_rates',
        verbose_name="Operación"
    )
    point_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Valor del Punto",
        help_text="Valor monetario de cada punto"
    )
    currency_per_point = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Moneda por Punto",
        help_text="Cantidad en moneda local por punto"
    )
    last_updated = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )
    
    class Meta:
        verbose_name = 'Tarifa Hospital-Operación'
        verbose_name_plural = 'Tarifas Hospital-Operación'
        unique_together = ['hospital', 'operation']
        ordering = ['hospital', 'operation']
    
    def __str__(self):
        return f"{self.hospital.name} - {self.operation.name}"


class Favorite(models.Model):
    """Operaciones favoritas de usuarios basadas en códigos de CSV"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorites',
        verbose_name="Usuario"
    )
    surgery_code = models.CharField(
        max_length=50,
        verbose_name="Código de Cirugía",
        help_text="Código de la cirugía del CSV (ej: 12345, 67890)"
    )
    surgery_name = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="Nombre de la Cirugía",
        help_text="Nombre de la cirugía (opcional, para referencia)"
    )
    specialty = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Especialidad",
        help_text="Especialidad de la cirugía (ej: Cardiovascular, Ortopedia)"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación"
    )
    
    class Meta:
        verbose_name = 'Favorito'
        verbose_name_plural = 'Favoritos'
        unique_together = ['user', 'surgery_code']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['surgery_code']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.surgery_code} ({self.surgery_name or 'Sin nombre'})"


class FavoriteHospital(models.Model):
    """Hospitales favoritos de usuarios"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorite_hospitals',
        verbose_name="Usuario"
    )
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name='favorited_by',
        verbose_name="Hospital"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación"
    )
    
    class Meta:
        verbose_name = 'Hospital Favorito'
        verbose_name_plural = 'Hospitales Favoritos'
        unique_together = ['user', 'hospital']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['hospital']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.hospital.name}"


class CalculationHistory(models.Model):
    """Historial de cálculos realizados por usuarios"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='calculation_history',
        verbose_name="Usuario"
    )
    operation = models.ForeignKey(
        Operation,
        on_delete=models.CASCADE,
        related_name='calculations',
        verbose_name="Operación"
    )
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name='calculations',
        verbose_name="Hospital"
    )
    calculated_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Valor Calculado"
    )
    calculated_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Cálculo"
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Notas"
    )
    
    class Meta:
        verbose_name = 'Historial de Cálculo'
        verbose_name_plural = 'Historial de Cálculos'
        ordering = ['-calculated_at']
        indexes = [
            models.Index(fields=['user', 'calculated_at']),
            models.Index(fields=['operation']),
            models.Index(fields=['hospital']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.operation.name} ({self.calculated_at.strftime('%Y-%m-%d %H:%M')})"
