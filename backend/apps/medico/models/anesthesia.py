from django.db import models
from django.conf import settings
from .surgical_case import SurgicalCase


class AnesthesiaCase(models.Model):
    """
    Sesión de anestesia asociada a un caso quirúrgico.
    Honorarios = (unidades_base + unidades_tiempo) × valor_por_unidad
    Los códigos base se agregan antes de operar.
    Las unidades de tiempo se completan al marcar is_operated.
    """
    case = models.OneToOneField(
        SurgicalCase,
        on_delete=models.CASCADE,
        related_name='anesthesia',
        verbose_name="Caso Quirúrgico"
    )
    unit_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Valor por Unidad (Q)",
        help_text="Cuánto vale cada unidad en quetzales"
    )
    time_units = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Unidades de Tiempo",
        help_text="Se agrega al finalizar la cirugía. Calculado: minutos / 15"
    )
    time_minutes = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="Minutos de Anestesia",
        help_text="Duración real de la anestesia en minutos"
    )
    anesthesiologist_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Nombre del Anestesiólogo",
        help_text="Texto libre si no es un colega registrado"
    )
    anesthesiologist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='anesthesia_cases',
        verbose_name="Anestesiólogo (Colega)",
        help_text="Colega registrado en el sistema"
    )
    anesthesiologist_accepted = models.BooleanField(
        null=True,
        blank=True,
        default=None,
        verbose_name="Anestesiólogo Aceptó",
        help_text="null=pendiente, true=aceptó, false=rechazó"
    )
    equipment_name = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        verbose_name="Equipo utilizado",
        help_text="Descripción del equipo de anestesia utilizado"
    )
    equipment_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Costo del equipo (Q)",
        help_text="Se suma al honorario total de anestesia"
    )
    notes = models.TextField(
        null=True,
        blank=True,
        verbose_name="Notas"
    )

    # Estados independientes del anestesiólogo (no dependen del cirujano principal)
    is_operated = models.BooleanField(default=False, verbose_name="Operado (anestesia)")
    is_billed = models.BooleanField(default=False, verbose_name="Facturado (anestesia)")
    is_paid = models.BooleanField(default=False, verbose_name="Cobrado (anestesia)")
    invoice_number = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="N° de Factura (anestesia)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Anestesia'
        verbose_name_plural = 'Anestesias'

    def __str__(self):
        return f"Anestesia — {self.case}"

    @property
    def total_base_units(self):
        return sum(float(item.base_units) for item in self.items.all())

    @property
    def total_units(self):
        return self.total_base_units + float(self.time_units or 0)

    @property
    def total_fee(self):
        base = self.total_units * float(self.unit_value)
        return base + float(self.equipment_cost or 0)

    def set_time_from_minutes(self, minutes: int):
        """Calcula unidades de tiempo a partir de los minutos: 1 unidad c/15 min."""
        self.time_minutes = minutes
        self.time_units = round(minutes / 15, 2)


class AnesthesiaItem(models.Model):
    """Código de procedimiento anestésico (unidades base del arancel)."""
    anesthesia_case = models.ForeignKey(
        AnesthesiaCase,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="Sesión de Anestesia"
    )
    surgery_code = models.CharField(
        max_length=50,
        verbose_name="Código"
    )
    surgery_name = models.CharField(
        max_length=500,
        verbose_name="Descripción"
    )
    base_units = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name="Unidades Base"
    )
    order = models.IntegerField(default=0, verbose_name="Orden")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Código Anestesia'
        verbose_name_plural = 'Códigos Anestesia'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.surgery_code} — {self.surgery_name}"
