// src/admin/components/ClientFormDialog.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { X, Loader2, Save } from 'lucide-react';
import { clientService, type Client, type ClientCreateUpdate } from '@/admin/services/clientService';

interface ClientFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: Client | null;
}

export function ClientFormDialog({ open, onClose, onSuccess, client }: ClientFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ClientCreateUpdate>({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    plan: 'bronze',
    amount_paid: '',
    currency: 'GTQ',
    start_date: '',
    end_date: '',
    status: 'active',
    notes: '',
  });

  // Cargar datos del cliente si estamos editando
  useEffect(() => {
    if (client) {
      setFormData({
        company_name: client.company_name,
        contact_name: client.contact_name || '',
        email: client.email,
        phone: client.phone || '',
        plan: client.plan,
        amount_paid: client.amount_paid,
        currency: client.currency,
        start_date: client.start_date,
        end_date: client.end_date,
        status: client.status,
        notes: client.notes || '',
      });
    } else {
      // Reset form para nuevo cliente
      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];
      
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        plan: 'bronze',
        amount_paid: '',
        currency: 'GTQ',
        start_date: today,
        end_date: endDateStr,
        status: 'active',
        notes: '',
      });
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (client) {
        // Actualizar cliente existente
        await clientService.updateClient(client.id, formData);
      } else {
        // Crear nuevo cliente
        await clientService.createClient(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving client:', err);
      setError(err.message || 'Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{client ? 'Editar Cliente' : 'Nuevo Cliente'}</CardTitle>
                <CardDescription>
                  {client ? 'Actualiza la información del cliente' : 'Agrega un nuevo cliente de publicidad'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Información Básica */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Información Básica</h3>
                
                <div>
                  <label className="text-sm font-medium">Nombre de la Empresa *</label>
                  <Input
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="Ej: Coca-Cola Guatemala"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Contacto</label>
                    <Input
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleChange}
                      placeholder="Nombre del contacto"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+502 1234-5678"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="contacto@empresa.com"
                    required
                  />
                </div>
              </div>

              {/* Plan y Pago */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Plan y Pago</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Plan *</label>
                    <select
                      name="plan"
                      value={formData.plan}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="bronze">Bronce</option>
                      <option value="silver">Plata</option>
                      <option value="gold">Oro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Estado *</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="pending">Pendiente</option>
                      <option value="expired">Expirado</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Monto Pagado *</label>
                    <Input
                      name="amount_paid"
                      type="number"
                      step="0.01"
                      value={formData.amount_paid}
                      onChange={handleChange}
                      placeholder="1000.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Moneda</label>
                    <Input
                      name="currency"
                      value={formData.currency}
                      onChange={handleChange}
                      placeholder="GTQ"
                      maxLength={3}
                    />
                  </div>
                </div>
              </div>

              {/* Periodo */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Periodo del Contrato</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Fecha de Inicio *</label>
                    <Input
                      name="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fecha de Fin *</label>
                    <Input
                      name="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-sm font-medium">Notas</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Información adicional sobre el cliente..."
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {client ? 'Actualizar' : 'Crear Cliente'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}