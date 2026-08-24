"""
Avisa por email a los usuarios en período de prueba (no pagos todavía) que
les quedan pocos días antes de que se les acabe, con un link directo para
suscribirse desde Configuración > Mi plan.

Corre cada ~5 min via el cron de notificaciones de Railway (railway.notifications.json).
No aplica a quienes ya tienen una suscripción de Lemon Squeezy activa
(ls_subscription_id) — esos no necesitan que se les recuerde suscribirse.

trial_ending_reminder_sent_at guarda el trial_ends_at vigente al momento del
envío (no la fecha de envío) — si trial_ends_at se corre más adelante después
(ej. se suman días de crédito por referidos, o termina la promo FREE_FOR_ALL),
deja de coincidir y el recordatorio se vuelve a enviar para la nueva fecha.
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()

REMINDER_DAYS_BEFORE = 3


class Command(BaseCommand):
    help = "Avisa por email a los usuarios en trial que les quedan pocos días antes de que termine"

    def handle(self, *args, **options):
        now = timezone.now()
        reminder_cutoff = now + timedelta(days=REMINDER_DAYS_BEFORE)

        # trial_ending_reminder_sent_at == trial_ends_at comparison happens in Python
        # below (not in the queryset) — DateTimeField equality via F() is unreliable
        # across DB backends at microsecond precision.
        candidates = User.objects.filter(
            plan='premium',
            is_permanent_premium=False,
            ls_subscription_id__isnull=True,
            trial_ends_at__isnull=False,
            trial_ends_at__gt=now,
            trial_ends_at__lte=reminder_cutoff,
        )

        sent = 0
        for user in candidates:
            if user.trial_ending_reminder_sent_at == user.trial_ends_at:
                continue  # already reminded for this exact trial_ends_at

            display_name = user.first_name or user.username
            settings_url = f"{settings.FRONTEND_URL}/settings"
            days_left = max((user.trial_ends_at - now).days, 0)

            try:
                send_mail(
                    subject='Tu prueba de MeDico App Premium está por terminar',
                    message=(
                        f'Hola {display_name}, tu período de prueba de MeDico App Premium termina pronto '
                        f'({user.trial_ends_at.strftime("%d/%m/%Y")}). '
                        f'Suscribite desde Configuración > Mi plan para no perder el acceso: {settings_url}'
                    ),
                    html_message=f'''
<div style="background-color:#111827;padding:40px 20px;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#1f2937;border-radius:12px;overflow:hidden;border:1px solid #374151;">
    <div style="background-color:#00BCD4;padding:28px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">MeDico App</h1>
    </div>
    <div style="padding:36px;">
      <h2 style="color:#00BCD4;font-size:20px;font-weight:700;margin:0 0 16px;">Tu prueba está por terminar, {display_name}</h2>
      <p style="color:#f9fafb;margin:0 0 12px;line-height:1.6;">
        Te quedan {days_left} día{'s' if days_left != 1 else ''} de acceso Premium gratis
        (hasta el {user.trial_ends_at.strftime("%d/%m/%Y")}).
        Suscribite ahora desde Configuración &gt; Mi plan para seguir con acceso ilimitado sin interrupciones.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{settings_url}" style="background-color:#00BCD4;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block;font-size:15px;">Suscribirme ahora</a>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:0;">Si no te suscribís, tu cuenta pasa automáticamente al plan gratuito cuando termine la prueba — no perdés tus datos.</p>
    </div>
    <div style="padding:20px 36px;border-top:1px solid #374151;text-align:center;">
      <p style="color:#6b7280;font-size:12px;margin:0;">El equipo de MeDico App</p>
    </div>
  </div>
</div>
                    ''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                User.objects.filter(pk=user.pk).update(trial_ending_reminder_sent_at=user.trial_ends_at)
                sent += 1
                logger.info('[TRIAL_REMINDER] sent to user=%s trial_ends_at=%s', user.id, user.trial_ends_at)
            except Exception:
                logger.exception('[TRIAL_REMINDER] failed to send to user=%s', user.id)

        self.stdout.write(self.style.SUCCESS(f'Recordatorios de fin de prueba enviados: {sent}'))
