# apps/medico/models/stats.py
"""
Lifetime rollups that survive case purging.

purge_archived_cases hard-deletes SurgicalCase rows 180 days after they were
archived, and get_stats() computes everything live from that table — so
purged cases used to just vanish from a doctor's history (total cases, RVU,
top hospitals/procedures). These models accumulate that contribution once,
right before each case is deleted, so lifetime totals never shrink even
though the identifiable case data is gone for good.
"""
from django.db import models
from django.conf import settings


class UserStatsTotals(models.Model):
    """One row per user — lifetime totals, only ever incremented."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stats_totals',
    )
    total_cases = models.PositiveIntegerField(default=0)
    total_rvu = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Totales históricos de usuario'
        verbose_name_plural = 'Totales históricos de usuario'

    def __str__(self):
        return f'user={self.user_id}: {self.total_cases} casos'


class PurgedHospitalStats(models.Model):
    """Per-user, per-hospital rollup for already-purged cases."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='purged_hospital_stats',
    )
    hospital = models.ForeignKey(
        'medico.Hospital',
        on_delete=models.CASCADE,
        related_name='purged_stats',
    )
    case_count = models.PositiveIntegerField(default=0)
    total_rvu = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        unique_together = ['user', 'hospital']
        verbose_name = 'Estadística de hospital purgada'
        verbose_name_plural = 'Estadísticas de hospital purgadas'

    def __str__(self):
        return f'user={self.user_id} hospital={self.hospital_id}: {self.case_count} casos'


class PurgedInsuranceStats(models.Model):
    """
    Per-user, per-insurer rollup for already-purged cases.
    insurance=null is the "Sin seguro" bucket, mirroring the live stats query.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='purged_insurance_stats',
    )
    insurance = models.ForeignKey(
        'medico.InsuranceCompany',
        on_delete=models.CASCADE,
        related_name='purged_stats',
        null=True,
        blank=True,
    )
    case_count = models.PositiveIntegerField(default=0)
    total_rvu = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        unique_together = ['user', 'insurance']
        verbose_name = 'Estadística de aseguradora purgada'
        verbose_name_plural = 'Estadísticas de aseguradora purgadas'

    def __str__(self):
        return f'user={self.user_id} insurance={self.insurance_id}: {self.case_count} casos'


class PurgedProcedureStats(models.Model):
    """
    Per-user, per-procedure-code rollup for already-purged cases.
    Keyed by surgery_code (stable) rather than surgery_name (display text),
    with name/specialty denormalized here since there's no catalog FK to
    join back to once the source case is gone.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='purged_procedure_stats',
    )
    surgery_code = models.CharField(max_length=50)
    surgery_name = models.CharField(max_length=500, blank=True, null=True)
    specialty = models.CharField(max_length=100, blank=True, null=True)
    procedure_count = models.PositiveIntegerField(default=0)
    total_rvu = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        unique_together = ['user', 'surgery_code']
        verbose_name = 'Estadística de procedimiento purgada'
        verbose_name_plural = 'Estadísticas de procedimiento purgadas'

    def __str__(self):
        return f'user={self.user_id} code={self.surgery_code}: {self.procedure_count}'
