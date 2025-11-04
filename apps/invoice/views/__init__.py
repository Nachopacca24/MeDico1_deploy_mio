from rest_framework import viewsets

# Ejemplo de vistas para facturación
# class InvoiceViewSet(viewsets.ModelViewSet):
#     queryset = Invoice.objects.all()
#     serializer_class = InvoiceSerializer
#     permission_classes = [IsAuthenticated]
#     filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
#     filterset_fields = ['status', 'patient', 'date']
#     search_fields = ['invoice_number', 'patient__name']
#     ordering_fields = ['date', 'total', 'due_date']
