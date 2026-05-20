from rest_framework.permissions import BasePermission


class IsEmailVerified(BasePermission):
    message = 'Debes verificar tu email antes de usar esta función.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'is_email_verified', True)
        )
