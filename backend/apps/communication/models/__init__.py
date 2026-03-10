from django.db import models

# Ejemplo de modelos para comunicación
# class Message(models.Model):
#     sender = models.ForeignKey('medio_auth.CustomUser', on_delete=models.CASCADE, related_name='sent_messages')
#     recipient = models.ForeignKey('medio_auth.CustomUser', on_delete=models.CASCADE, related_name='received_messages')
#     subject = models.CharField(max_length=200)
#     body = models.TextField()
#     created_at = models.DateTimeField(auto_now_add=True)
#     read_at = models.DateTimeField(null=True, blank=True)
#
# class Notification(models.Model):
#     user = models.ForeignKey('medio_auth.CustomUser', on_delete=models.CASCADE, related_name='notifications')
#     title = models.CharField(max_length=200)
#     message = models.TextField()
#     notification_type = models.CharField(max_length=50)
#     created_at = models.DateTimeField(auto_now_add=True)
#     read = models.BooleanField(default=False)
