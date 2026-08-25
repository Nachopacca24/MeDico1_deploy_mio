// src/admin/components/ClientFormDialog.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { X, Loader2, Save, Package, Info } from 'lucide-react';
import { clientService, type Client, type ClientCreateUpdate } from '@/admin/services/clientService';

// Cupos sugeridos por plan — el admin puede cambiarlos libremente
const PLAN_QUOTA_DEFAULTS: Record<string, Record<string, number>> = {
  gold:   { quota_home_banner: 1, quota_popup: 1, quota_sidebar: 2, quota_between_content: 2, quota_footer: 1 },
  silver: { quota_home_banner: 0, quota_popup: 0, quota_sidebar: 1, quota_between_content: 2, quota_footer: 1 },
  bronze: { quota_home_banner: 0, quota_popup: 0, quota_sidebar: 0, quota_between_content: 1, quota_footer: 1 },
};

const PLACEMENT_INFO = [
  { key: 'quota_home_banner',     label: 'Banner Principal', note: 'Solo plan Oro', planLock: ['gold'] },
  { key: 'quota_popup',           label: 'Popup',            note: 'Solo plan Oro', planLock: ['gold'] },
  { key: 'quota_sidebar',         label: 'Barra Lateral',    note: 'Oro y Plata',   planLock: ['gold', 'silver'] },
  { key: 'quota_between_content', label: 'Entre Contenido',  note: 'Todos los planes', planLock: ['gold', 'silver', 'bronze'] },
  { key: 'quota_footer',          label: 'Footer',           note: 'Todos los planes', planLock: ['gold', 'silver', 'bronze'] },
] as const;

type QuotaKey = typeof PLACEMENT_INFO[number]['key'];

interface ClientFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: Client | null;
}

export function ClientFormDialog({ open, onClose, onSuccess, client }: ClientFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultQuotas = PLAN_QUOTA_DEFAULTS.bronze;

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
    ...defaultQuotas,
  });

  useEffect(() => {
    if (!open) return;

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
        quota_home_banner: client.quota_home_banner,
        quota_popup: client.quota_popup,
        quota_sidebar: client.quota_sidebar,
        quota_between_content: client.quota_between_content,
        quota_footer: client.quota_footer,
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        plan: 'bronze',
        amount_paid: '',
        currency: 'GTQ',
        start_date: today,
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
        notes: '',
        ...PLAN_QUOTA_DEFAULTS.bronze,
      });
    }
    setError(null);
  }, [client, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // When the plan dropdown changes, auto-fill quotas with suggested defaults
  // (only for new clients, or if user explicitly chose to reset)
  const handlePlanChange = (value: string) => {
    const newPlan = value as 'bronze' | 'silver' | 'gold';
    const defaults = PLAN_QUOTA_DEFAULTS[newPlan];
    setFormData(prev => ({ ...prev, plan: newPlan, ...defaults }));
  };

  const handleQuotaChange = (key: QuotaKey, value: string) => {
    const n = Math.max(0, parseInt(value) || 0);
    setFormData(prev => ({ ...prev, [key]: n }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (client) {
        await clientService.updateClient(client.id, formData);
      } else {
        await clientService.createClient(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const currentPlan = formData.plan as string;

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
                    placeholder="Ej: Laboratorio Nacional"
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
                    <Select value={formData.plan} onValueChange={handlePlanChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bronze">Bronce</SelectItem>
                        <SelectItem value="silver">Plata</SelectItem>
                        <SelectItem value="gold">Oro</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cambiar el plan actualiza los cupos sugeridos abajo
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Estado *</label>
                    <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as typeof prev.status }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="expired">Expirado</SelectItem>
                      </SelectContent>
                    </Select>
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

              {/* Cupos de Anuncios */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Cupos de Anuncios</h3>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    Define cuántos anuncios tiene derecho a publicar este cliente en cada ubicación.
                    Los valores se pre-llenan según el plan, pero puedes ajustarlos libremente para
                    ofrecer paquetes personalizados.
                  </p>
                </div>

                <div className="grid gap-3">
                  {PLACEMENT_INFO.map(({ key, label, note, planLock }) => {
                    const isAvailable = planLock.includes(currentPlan as any);
                    const value = (formData[key] as number) ?? 0;

                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-4 p-3 rounded-lg border ${
                          isAvailable ? 'bg-background' : 'bg-muted/40 opacity-60'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{label}</div>
                          <div className="text-xs text-muted-foreground">{note}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuotaChange(key, String(Math.max(0, value - 1)))}
                            className="w-8 h-8 rounded-md border border-input bg-background flex items-center justify-center text-sm hover:bg-muted transition-colors"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={value}
                            onChange={(e) => handleQuotaChange(key, e.target.value)}
                            className="w-14 h-8 text-center text-sm font-semibold rounded-md border border-input bg-background"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuotaChange(key, String(value + 1))}
                            className="w-8 h-8 rounded-md border border-input bg-background flex items-center justify-center text-sm hover:bg-muted transition-colors"
                          >
                            +
                          </button>
                        </div>

                        {!isAvailable && value > 0 && (
                          <span className="text-xs text-orange-600 font-medium">
                            requiere plan superior
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-sm pt-1">
                  <span className="text-muted-foreground">Total cupos contratados:</span>
                  <span className="font-bold text-primary text-lg">
                    {[
                      formData.quota_home_banner,
                      formData.quota_popup,
                      formData.quota_sidebar,
                      formData.quota_between_content,
                      formData.quota_footer,
                    ].reduce((a, b) => (a || 0) + (b || 0), 0)}
                  </span>
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
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Condiciones especiales, descuentos negociados..."
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
