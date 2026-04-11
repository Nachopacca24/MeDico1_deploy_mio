from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, email=None, **kwargs):
        try:
            # Intentar buscar por email
            if email:
                user = User.objects.get(email=email)
            elif username:
                # Si viene username, intentar buscar por email primero
                if '@' in username:
                    user = User.objects.get(email=username)
                else:
                    user = User.objects.get(username=username)
            else:
                return None
                
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            return None
