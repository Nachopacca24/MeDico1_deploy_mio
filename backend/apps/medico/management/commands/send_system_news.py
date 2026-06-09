"""
Envía una notificación push de novedad del sistema a todos los usuarios con FCM token.

Uso:
    python manage.py send_system_news --title "Título" --body "Descripción"

Crea un registro SystemNews y envía a todos los tokens activos.
"""

import logging

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.medico.models import FCMToken, SystemNews
from apps.medico.services.firebase import send_push_notification

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Envía una notificación push de novedad del sistema a todos los usuarios'

    def add_arguments(self, parser):
        parser.add_argument('--title', required=True, help='Título de la notificación')
        parser.add_argument('--body', required=True, help='Texto de la notificación')
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Mostrar cuántos tokens recibirían la notificación sin enviarla'
        )

    def handle(self, *args, **options):
        title = options['title'].strip()
        body = options['body'].strip()
        dry_run = options['dry_run']

        if not title or not body:
            raise CommandError('--title y --body son obligatorios y no pueden estar vacíos')

        tokens = list(FCMToken.objects.values_list('token', flat=True))

        if not tokens:
            self.stdout.write(self.style.WARNING('No hay tokens FCM registrados.'))
            return

        self.stdout.write(f'Tokens encontrados: {len(tokens)}')

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f'[DRY-RUN] Se enviaría a {len(tokens)} tokens.'))
            return

        result = send_push_notification(tokens, title=title, body=body, data={'route': '/news'})

        news = SystemNews.objects.create(title=title, body=body, sent_at=timezone.now())

        # Clean up failed tokens
        if result['failed_tokens']:
            FCMToken.objects.filter(token__in=result['failed_tokens']).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'Enviado: {len(result["success"])} tokens OK, '
                f'{len(result["failed_tokens"])} fallidos (eliminados). '
                f'SystemNews id={news.pk}'
            )
        )
        logger.info('[SYSTEM_NEWS] id=%s sent to %d tokens', news.pk, len(result['success']))
