from rest_framework import serializers

# Ejemplo de serializers para pagos
# class PaymentSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Payment
#         fields = ['id', 'invoice', 'payment_date', 'amount', 'payment_method',
#                   'transaction_id', 'notes', 'status']
#         read_only_fields = ['payment_date']
#
# class PaymentMethodSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = PaymentMethod
#         fields = ['id', 'user', 'method_type', 'card_last_four', 'is_default']
