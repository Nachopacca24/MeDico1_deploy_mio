from django.db import models

# Ejemplo de modelos para pagos
# class Payment(models.Model):
#     invoice = models.ForeignKey('invoice.Invoice', on_delete=models.CASCADE, related_name='payments')
#     payment_date = models.DateTimeField(auto_now_add=True)
#     amount = models.DecimalField(max_digits=10, decimal_places=2)
#     payment_method = models.CharField(max_length=50, choices=[
#         ('cash', 'Cash'),
#         ('credit_card', 'Credit Card'),
#         ('debit_card', 'Debit Card'),
#         ('bank_transfer', 'Bank Transfer'),
#         ('check', 'Check')
#     ])
#     transaction_id = models.CharField(max_length=100, blank=True)
#     notes = models.TextField(blank=True)
#     status = models.CharField(max_length=20, choices=[
#         ('pending', 'Pending'),
#         ('completed', 'Completed'),
#         ('failed', 'Failed'),
#         ('refunded', 'Refunded')
#     ])
#
# class PaymentMethod(models.Model):
#     user = models.ForeignKey('medio_auth.CustomUser', on_delete=models.CASCADE)
#     method_type = models.CharField(max_length=50)
#     card_last_four = models.CharField(max_length=4, blank=True)
#     is_default = models.BooleanField(default=False)
