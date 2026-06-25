"""
Envía un email de aviso a cada médico cuyos casos tienen imágenes
que se van a eliminar en los próximos 10 días.

Se ejecuta una vez por semana junto al cron de purga.
Usa images_expiry_notified_at para no enviar el email más de una vez por caso.
"""

import logging
from collections import defaultdict
from datetime import timedelta
from html import escape

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.medico.models import SurgicalCase
from apps.medico.crypto_utils import decrypt_field

logger = logging.getLogger(__name__)

WARNING_DAYS = 10  # avisar cuando falten 10 días o menos


class Command(BaseCommand):
    help = 'Envía emails de aviso antes de que se eliminen imágenes de cirugías'

    def handle(self, *args, **options):
        now = timezone.now()
        window = now + timedelta(days=WARNING_DAYS)

        cases = (
            SurgicalCase.objects
            .filter(
                images_purge_at__isnull=False,
                images_purge_at__lte=window,
                images_purge_at__gt=now,
                images_expiry_notified_at__isnull=True,
                images__isnull=False,
            )
            .distinct()
            .select_related('created_by', 'hospital')
        )

        if not cases.exists():
            self.stdout.write('No hay casos con imágenes próximas a vencer.')
            return

        # Agrupar por usuario
        by_user = defaultdict(list)
        for case in cases:
            by_user[case.created_by].append(case)

        sent = 0
        errors = 0

        for user, user_cases in by_user.items():
            try:
                self._send_notification(user, user_cases, now)
                # Marcar todos los casos de este usuario como notificados
                ids = [c.id for c in user_cases]
                SurgicalCase.objects.filter(pk__in=ids).update(
                    images_expiry_notified_at=now
                )
                sent += 1
                logger.info('[NOTIFY_IMG] email enviado a user=%s (%d casos)', user.id, len(user_cases))
            except Exception as e:
                errors += 1
                logger.error('[NOTIFY_IMG] error enviando a user=%s: %s', user.id, e)

        self.stdout.write(
            self.style.SUCCESS(
                f'Notificaciones enviadas: {sent} usuarios, {errors} errores'
            )
        )

    def _send_notification(self, user, cases, now):
        display_name = escape(user.first_name or user.email.split('@')[0])
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://medico1deploymio.vercel.app')
        cobrados_url = f'{frontend_url}/cases'

        cases_rows = ''
        for case in cases:
            patient = escape(decrypt_field(case.patient_name) or '—')
            hospital = escape(case.hospital.name if case.hospital else '—')
            date_str = case.surgery_date.strftime('%d/%m/%Y') if case.surgery_date else '—'
            days_left = max(0, (case.images_purge_at - now).days)
            purge_str = case.images_purge_at.strftime('%d/%m/%Y')
            urgency_color = '#ef4444' if days_left <= 3 else '#f59e0b'
            cases_rows += f'''
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #374151;color:#f9fafb;">{patient}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #374151;color:#9ca3af;">{hospital}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #374151;color:#9ca3af;">{date_str}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #374151;color:{urgency_color};font-weight:700;">{purge_str} ({days_left}d)</td>
      </tr>'''

        count = len(cases)
        subject = f'Tus imágenes quirúrgicas se eliminan pronto — MeDico App'
        plain = (
            f'Hola {display_name}, tenés {count} cirugía(s) con imágenes que se eliminan '
            f'en los próximos {WARNING_DAYS} días. Entrá a {cobrados_url} para exportar el PDF antes.'
        )
        html = f'''
<div style="background-color:#111827;padding:40px 20px;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background-color:#1f2937;border-radius:12px;overflow:hidden;border:1px solid #374151;">

    <div style="background-color:#00BCD4;padding:28px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">MeDico App</h1>
    </div>

    <div style="padding:36px;">
      <h2 style="color:#f59e0b;font-size:20px;font-weight:700;margin:0 0 12px;">
        ⚠️ Imágenes próximas a eliminarse
      </h2>
      <p style="color:#f9fafb;margin:0 0 20px;line-height:1.6;">
        Hola <strong style="color:#ffffff;">{display_name}</strong>, tenés
        <strong style="color:#f59e0b;">{count} cirugía(s)</strong> con imágenes que se van a
        eliminar automáticamente en los próximos <strong style="color:#ffffff;">{WARNING_DAYS} días</strong>.
      </p>
      <p style="color:#9ca3af;margin:0 0 24px;line-height:1.6;">
        Exportá el PDF de cada cirugía antes de que se borren si querés conservar un respaldo con las imágenes incluidas.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:13px;">
        <thead>
          <tr style="background-color:#111827;">
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #374151;">Paciente</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #374151;">Hospital</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #374151;">Fecha cirugía</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #374151;">Imágenes se eliminan</th>
          </tr>
        </thead>
        <tbody>{cases_rows}
        </tbody>
      </table>

      <div style="text-align:center;margin:32px 0;">
        <a href="{cobrados_url}"
           style="background-color:#f59e0b;color:#111827;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block;font-size:15px;">
          Ver mis cirugías cobradas
        </a>
      </div>

      <p style="color:#6b7280;font-size:12px;margin:0;text-align:center;">
        En la pestaña <strong style="color:#9ca3af;">Cobrados</strong> podés exportar el PDF de cada cirugía con las imágenes incluidas.
      </p>
    </div>

    <div style="padding:20px 36px;border-top:1px solid #374151;text-align:center;">
      <p style="color:#6b7280;font-size:12px;margin:0;">El equipo de MeDico App</p>
    </div>
  </div>
</div>'''

        send_mail(
            subject=subject,
            message=plain,
            html_message=html,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
