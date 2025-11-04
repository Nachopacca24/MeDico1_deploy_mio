from django.contrib import admin

# Registra tus modelos aquí
# from .models import Invoice, InvoiceItem
#
# class InvoiceItemInline(admin.TabularInline):
#     model = InvoiceItem
#     extra = 1
#
# @admin.register(Invoice)
# class InvoiceAdmin(admin.ModelAdmin):
#     list_display = ['invoice_number', 'patient', 'date', 'total', 'status']
#     list_filter = ['status', 'date']
#     search_fields = ['invoice_number', 'patient__name']
#     inlines = [InvoiceItemInline]
