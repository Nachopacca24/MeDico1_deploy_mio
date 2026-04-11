from rest_framework import serializers

# Ejemplo de serializers para comunicación
# class MessageSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Message
#         fields = ['id', 'sender', 'recipient', 'subject', 'body', 'created_at', 'read_at']
#         read_only_fields = ['created_at']
#
# class NotificationSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Notification
#         fields = ['id', 'user', 'title', 'message', 'notification_type', 'created_at', 'read']
