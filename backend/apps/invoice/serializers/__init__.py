from rest_framework import serializers

# Ejemplo de serializers para facturación
# class InvoiceItemSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = InvoiceItem
#         fields = ['id', 'description', 'quantity', 'unit_price', 'total']
#
# class InvoiceSerializer(serializers.ModelSerializer):
#     items = InvoiceItemSerializer(many=True, read_only=True)
#
#     class Meta:
#         model = Invoice
#         fields = ['id', 'invoice_number', 'patient', 'date', 'due_date', 
#                   'subtotal', 'tax', 'total', 'status', 'items']
#         read_only_fields = ['date']
