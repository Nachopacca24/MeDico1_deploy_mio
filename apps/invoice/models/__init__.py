from django.db import models

# Ejemplo de modelos para facturación
# class Invoice(models.Model):
#     invoice_number = models.CharField(max_length=50, unique=True)
#     patient = models.ForeignKey('medico.Patient', on_delete=models.CASCADE)
#     date = models.DateField(auto_now_add=True)
#     due_date = models.DateField()
#     subtotal = models.DecimalField(max_digits=10, decimal_places=2)
#     tax = models.DecimalField(max_digits=10, decimal_places=2)
#     total = models.DecimalField(max_digits=10, decimal_places=2)
#     status = models.CharField(max_length=20, choices=[
#         ('draft', 'Draft'),
#         ('sent', 'Sent'),
#         ('paid', 'Paid'),
#         ('overdue', 'Overdue'),
#         ('cancelled', 'Cancelled')
#     ])
#
# class InvoiceItem(models.Model):
#     invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
#     description = models.CharField(max_length=200)
#     quantity = models.IntegerField()
#     unit_price = models.DecimalField(max_digits=10, decimal_places=2)
#     total = models.DecimalField(max_digits=10, decimal_places=2)
