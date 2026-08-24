import logging
import re

from django.conf import settings
from django.core.mail import send_mail
from django.utils.html import escape

logger = logging.getLogger(__name__)

_CONTACT_EMAIL_MATCH = re.search(r'<([^>]+)>', settings.DEFAULT_FROM_EMAIL)
CONTACT_EMAIL = _CONTACT_EMAIL_MATCH.group(1) if _CONTACT_EMAIL_MATCH else settings.DEFAULT_FROM_EMAIL

INSTAGRAM_URL = 'https://www.instagram.com/medico_app.app/'


def send_welcome_email(user, verification_url=None):
    """
    Email de bienvenida para un usuario recién registrado, sin importar el
    método (contraseña, Google o Apple). Si se pasa verification_url incluye
    el botón de verificación (solo aplica al signup por contraseña — Google y
    Apple llegan ya verificados). fail_silently=True: un email caído no debe
    tumbar el registro.
    """
    display_name = escape(user.first_name or user.username)

    verify_section = ''
    if verification_url:
        verify_section = f'''
      <div style="text-align:center;margin:28px 0;">
        <a href="{verification_url}" style="background-color:#00BCD4;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block;font-size:15px;">Verificar mi email</a>
      </div>
      <p style="color:#6b7280;font-size:12px;margin:0 0 24px;">Este enlace expira en 24 horas.</p>'''

    try:
        send_mail(
            subject='¡Bienvenido a MeDico App!',
            message=(
                f'¡Bienvenido a MeDico App, {display_name}!\n\n'
                'MeDico App te ayuda a llevar el registro de tus cirugías con el cálculo automático '
                'de honorarios según hospital y seguro, con más de 4.000 procedimientos y sus códigos '
                'ya cargados, estadísticas de tus ingresos, resúmenes en PDF, y la posibilidad de '
                'conectar con colegas para compartir casos.\n\n'
                'Al entrar te vamos a guiar con un tutorial paso a paso para que le saques provecho '
                'desde el primer momento — lo podés repetir cuando quieras desde Configuración.\n\n'
                f'Cualquier pregunta, escribinos a {CONTACT_EMAIL}, con gusto te ayudamos.\n\n'
                f'Seguinos en Instagram como MeDico App: {INSTAGRAM_URL}'
            ),
            html_message=f'''
<div style="background-color:#111827;padding:40px 20px;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#1f2937;border-radius:12px;overflow:hidden;border:1px solid #374151;">
    <div style="background-color:#00BCD4;padding:28px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">MeDico App</h1>
    </div>
    <div style="padding:36px;">
      <h2 style="color:#00BCD4;font-size:20px;font-weight:700;margin:0 0 16px;">¡Bienvenido, {display_name}!</h2>
      <p style="color:#f9fafb;margin:0 0 16px;line-height:1.6;">
        Gracias por registrarte. MeDico App te ayuda a llevar el registro de tus cirugías con el
        cálculo automático de honorarios según hospital y seguro, con más de 4.000 procedimientos
        y sus códigos ya cargados, estadísticas de tus ingresos, resúmenes en PDF listos para
        imprimir, y la posibilidad de conectar con colegas para compartir casos.
      </p>
      <p style="color:#f9fafb;margin:0 0 16px;line-height:1.6;">
        Al entrar te vamos a guiar con un tutorial paso a paso para que le saques provecho desde
        el primer momento — lo podés repetir cuando quieras desde Configuración.
      </p>{verify_section}
      <p style="color:#9ca3af;font-size:13px;margin:0 0 6px;line-height:1.6;">
        Cualquier pregunta, escribinos a
        <a href="mailto:{CONTACT_EMAIL}" style="color:#00BCD4;">{CONTACT_EMAIL}</a>,
        con gusto te ayudamos.
      </p>
      <p style="color:#9ca3af;font-size:13px;margin:0;line-height:1.6;">
        Seguinos en Instagram como
        <a href="{INSTAGRAM_URL}" style="color:#00BCD4;">MeDico App</a>.
      </p>
    </div>
    <div style="padding:20px 36px;border-top:1px solid #374151;text-align:center;">
      <p style="color:#6b7280;font-size:12px;margin:0;">El equipo de MeDico App</p>
    </div>
  </div>
</div>
            ''',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
        return True
    except Exception:
        logger.exception('[WELCOME_EMAIL] failed to send to user=%s', user.id)
        return False
