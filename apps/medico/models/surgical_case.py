"""
Modelos para gestión de casos quirúrgicos
"""
from django.db import models
from django.conf import settings
from decimal import Decimal


class SurgicalCase(models.Model):
    """Caso quirúrgico completo con información del paciente"""
    
    STATUS_CHOICES = [
        ('scheduled', 'Programada'),
        ('completed', 'Realizada'),
        ('billed', 'Facturada'),
        ('paid', 'Pagada'),
        ('cancelled', 'Cancelada'),
    ]
    
    # Información del paciente
    patient_name = models.CharField(
        max_length=255,
        verbose_name="Nombre del Paciente"
    )
    patient_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Cédula/ID del Paciente",
        help_text="Número de identificación del paciente"
    )
    patient_age = models.PositiveIntegerField(
        blank=True,
        null=True,
        verbose_name="Edad del Paciente"
    )
    patient_gender = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        choices=[
            ('M', 'Masculino'),
            ('F', 'Femenino'),
            ('O', 'Otro'),
        ],
        verbose_name="Género"
    )
    
    # Información de la cirugía
    hospital = models.ForeignKey(
        'Hospital',
        on_delete=models.PROTECT,
        related_name='surgical_cases',
        verbose_name="Hospital"
    )
    surgery_date = models.DateField(
        verbose_name="Fecha de Cirugía"
    )
    surgery_time = models.TimeField(
        blank=True,
        null=True,
        verbose_name="Hora de Cirugía"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='scheduled',
        verbose_name="Estado"
    )
    
    # Información adicional
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Notas",
        help_text="Observaciones sobre el caso"
    )
    diagnosis = models.TextField(
        blank=True,
        null=True,
        verbose_name="Diagnóstico",
        help_text="Diagnóstico preoperatorio"
    )
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='surgical_cases',
        verbose_name="Creado por"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )
    
    class Meta:
        verbose_name = 'Caso Quirúrgico'
        verbose_name_plural = 'Casos Quirúrgicos'
        ordering = ['-surgery_date', '-created_at']
        indexes = [
            models.Index(fields=['created_by', 'surgery_date']),
            models.Index(fields=['hospital', 'surgery_date']),
            models.Index(fields=['status']),
            models.Index(fields=['patient_id']),
        ]
    
    def __str__(self):
        return f"{self.patient_name} - {self.hospital.name} ({self.surgery_date})"
    
    @property
    def total_rvu(self):
        """Calcula el total de RVU de todos los procedimientos"""
        return sum(
            proc.rvu for proc in self.procedures.all()
        ) or Decimal('0.00')
    
    @property
    def total_value(self):
        """Calcula el valor total de todos los procedimientos"""
        return sum(
            proc.calculated_value for proc in self.procedures.all()
        ) or Decimal('0.00')
    
    @property
    def procedure_count(self):
        """Cuenta el número de procedimientos en este caso"""
        return self.procedures.count()
    
    @property
    def primary_specialty(self):
        """Retorna la especialidad del primer procedimiento"""
        first_proc = self.procedures.first()
        return first_proc.specialty if first_proc else None


class CaseProcedure(models.Model):
    """Procedimiento individual dentro de un caso quirúrgico"""
    
    case = models.ForeignKey(
        SurgicalCase,
        on_delete=models.CASCADE,
        related_name='procedures',
        verbose_name="Caso"
    )
    
    # Información del procedimiento (basado en CSV)
    surgery_code = models.CharField(
        max_length=50,
        verbose_name="Código de Cirugía",
        help_text="Código del procedimiento"
    )
    surgery_name = models.CharField(
        max_length=500,
        verbose_name="Nombre del Procedimiento"
    )
    specialty = models.CharField(
        max_length=100,
        verbose_name="Especialidad"
    )
    grupo = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Grupo",
        help_text="Grupo o categoría del procedimiento"
    )
    
    # Valores
    rvu = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="RVU",
        help_text="Relative Value Units"
    )
    hospital_factor = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name="Factor del Hospital",
        help_text="Multiplicador del hospital"
    )
    calculated_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name="Valor Calculado",
        help_text="Valor monetario del procedimiento"
    )
    
    # Información adicional
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Notas del Procedimiento"
    )
    order = models.PositiveIntegerField(
        default=0,
        verbose_name="Orden",
        help_text="Orden del procedimiento en el caso"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )
    
    class Meta:
        verbose_name = 'Procedimiento del Caso'
        verbose_name_plural = 'Procedimientos de Casos'
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['case', 'order']),
            models.Index(fields=['surgery_code']),
        ]
    
    def __str__(self):
        return f"{self.surgery_code} - {self.surgery_name}"
