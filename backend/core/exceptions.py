import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Wraps DRF's default exception_handler so nothing unexpected leaks a raw
    Django/psycopg traceback (or an empty response DRF can't render) to the
    client:

    - django.core.exceptions.ValidationError — raised by Model.full_clean(),
      which several models' save() overrides call unconditionally — becomes a
      clean 400 with the validation errors. DRF's own handler only recognizes
      APIException/Http404/PermissionDenied, so this previously fell straight
      through into an unhandled 500 (e.g. a PATCH that bypasses serializer
      validation and sets fields directly, then hits a stale invalid value on
      an existing row).
    - Anything else DRF's handler doesn't recognize is logged — and sent to
      Sentry if configured, since converting it to a clean response here means
      it no longer propagates to Django's exception middleware, where Sentry's
      automatic instrumentation would otherwise have caught it — and turned
      into a generic 500 JSON body instead of Django's HTML debug/error page.
    """
    response = drf_exception_handler(exc, context)
    if response is not None:
        return response

    if isinstance(exc, DjangoValidationError):
        detail = exc.message_dict if hasattr(exc, 'message_dict') else {'non_field_errors': exc.messages}
        return Response(detail, status=status.HTTP_400_BAD_REQUEST)

    view = context.get('view')
    logger.error('Unhandled exception in %s', view.__class__.__name__ if view else 'unknown view', exc_info=exc)
    try:
        import sentry_sdk
        sentry_sdk.capture_exception(exc)
    except Exception:
        pass

    return Response(
        {'error': 'Ocurrió un error inesperado. Intentá de nuevo en unos minutos.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
