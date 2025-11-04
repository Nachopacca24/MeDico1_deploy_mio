from rest_framework import viewsets

# Ejemplo de vistas para comunicación
# class MessageViewSet(viewsets.ModelViewSet):
#     queryset = Message.objects.all()
#     serializer_class = MessageSerializer
#     permission_classes = [IsAuthenticated]
#
#     def get_queryset(self):
#         user = self.request.user
#         return Message.objects.filter(
#             Q(sender=user) | Q(recipient=user)
#         ).order_by('-created_at')
