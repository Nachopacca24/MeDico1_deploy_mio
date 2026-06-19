import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { siteSettingsService, type SiteSettings } from '@/services/siteSettingsService';
import { Loader2, DollarSign, Clock, Save, CalendarDays, Smartphone, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SiteSettings>({ PREMIUM_PRICE: '7', ANNUAL_PRICE: '84', TRIAL_DAYS: '30', ANDROID_TESTERS_COUNT: '12', ANDROID_MIN_VERSION: '1.0' });

  useEffect(() => {
    siteSettingsService.getAdmin()
      .then(s => setForm(s))
      .catch(() => toast({ variant: 'destructive', title: 'Error al cargar configuración' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await siteSettingsService.update(form);
      toast({ title: 'Configuración guardada', description: 'Los cambios se reflejan inmediatamente en la app.' });
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración del sitio</h1>
        <p className="text-muted-foreground mt-1">
          Estos valores se muestran en la landing, configuración de usuario, términos y privacidad.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Precio y período de prueba</CardTitle>
          <CardDescription>
            Actualiza el precio en Lemon Squeezy por separado para que el cobro sea correcto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="price" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Precio mensual (USD)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <Input
                id="price"
                type="number"
                min="0.01"
                step="0.01"
                className="pl-7"
                value={form.PREMIUM_PRICE}
                onChange={e => setForm(f => ({ ...f, PREMIUM_PRICE: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="annual-price" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Precio anual (USD)
              {Number(form.PREMIUM_PRICE) > 0 && Number(form.ANNUAL_PRICE) > 0 && (
                <span className="ml-auto text-xs text-emerald-600 font-semibold">
                  {Math.round((1 - Number(form.ANNUAL_PRICE) / (Number(form.PREMIUM_PRICE) * 12)) * 100)}% descuento vs mensual
                </span>
              )}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <Input
                id="annual-price"
                type="number"
                min="0.01"
                step="0.01"
                className="pl-7"
                value={form.ANNUAL_PRICE}
                onChange={e => setForm(f => ({ ...f, ANNUAL_PRICE: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Por defecto: ${(Number(form.PREMIUM_PRICE) * 12).toFixed(2)} (mensual × 12). Bajá este valor para dar descuento anual.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trial" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Días de prueba gratis
            </Label>
            <Input
              id="trial"
              type="number"
              min="1"
              step="1"
              value={form.TRIAL_DAYS}
              onChange={e => setForm(f => ({ ...f, TRIAL_DAYS: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Solo aplica a usuarios que se registren a partir de ahora.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="testers" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Testers oficiales Android
            </Label>
            <Input
              id="testers"
              type="number"
              min="0"
              step="1"
              value={form.ANDROID_TESTERS_COUNT}
              onChange={e => setForm(f => ({ ...f, ANDROID_TESTERS_COUNT: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Se muestra en la página /testers como contador público. Actualizalo cada vez que sumes uno nuevo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-version" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Versión mínima Android
            </Label>
            <Input
              id="min-version"
              type="text"
              placeholder="ej: 1.2"
              value={form.ANDROID_MIN_VERSION}
              onChange={e => setForm(f => ({ ...f, ANDROID_MIN_VERSION: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Si un usuario tiene una versión menor a esta, verá un aviso para actualizar desde Play Store. Actualizá este valor cada vez que subas una nueva versión.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
              : <><Save className="h-4 w-4 mr-2" /> Guardar cambios</>
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
