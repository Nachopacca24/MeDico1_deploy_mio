import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useToast } from '@/shared/hooks/useToast';
import { useConfirm } from '@/admin/hooks/useConfirm';
import { authService } from '@/shared/services/authService';
import { Building2, Shield, Trash2, Loader2, Plus, Pencil, X, Check } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

type PlaceType = 'hospital' | 'clinica' | 'consultorio';

interface Hospital {
  id: number;
  name: string;
  location?: string;
  place_type: PlaceType;
}

interface Insurance {
  id: number;
  name: string;
}

const PLACE_LABELS: Record<PlaceType, string> = {
  hospital: 'Hospital',
  clinica: 'Clínica',
  consultorio: 'Consultorio',
};

const PLACE_COLORS: Record<PlaceType, string> = {
  hospital: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  clinica: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  consultorio: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function DirectoriesPage() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  // ── Hospitals ──────────────────────────────────────────────
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingH, setLoadingH] = useState(true);
  const [filterH, setFilterH] = useState('');
  const [newH, setNewH] = useState({ name: '', location: '', place_type: 'hospital' as PlaceType });
  const [savingH, setSavingH] = useState(false);
  const [deletingH, setDeletingH] = useState<number | null>(null);
  const [editingH, setEditingH] = useState<Hospital | null>(null);
  const [savingEditH, setSavingEditH] = useState(false);

  // ── Insurances ─────────────────────────────────────────────
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loadingI, setLoadingI] = useState(true);
  const [filterI, setFilterI] = useState('');
  const [newInsName, setNewInsName] = useState('');
  const [savingI, setSavingI] = useState(false);
  const [deletingI, setDeletingI] = useState<number | null>(null);
  const [editingI, setEditingI] = useState<Insurance | null>(null);
  const [savingEditI, setSavingEditI] = useState(false);

  useEffect(() => { loadHospitals(); loadInsurances(); }, []);

  // ── Hospital helpers ───────────────────────────────────────
  const loadHospitals = async () => {
    setLoadingH(true);
    try {
      const res = await authService.authenticatedFetch(`${API}/api/v1/medico/admin/hospitals/`);
      setHospitals(await res.json());
    } catch { toast.error('Error', 'No se pudieron cargar los centros médicos'); }
    finally { setLoadingH(false); }
  };

  const handleCreateH = async () => {
    if (!newH.name.trim()) { toast.error('Nombre requerido', ''); return; }
    setSavingH(true);
    try {
      const res = await authService.authenticatedFetch(`${API}/api/v1/medico/admin/hospitals/`, {
        method: 'POST', body: JSON.stringify(newH),
      });
      if (!res.ok) throw new Error((await res.json()).name?.[0] || 'Error al crear');
      const created: Hospital = await res.json();
      setHospitals(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewH({ name: '', location: '', place_type: 'hospital' });
      toast.success('Creado', `${PLACE_LABELS[created.place_type]} "${created.name}" agregado`);
    } catch (e: any) { toast.error('Error', e.message); }
    finally { setSavingH(false); }
  };

  const handleDeleteH = async (h: Hospital) => {
    const ok = await confirm({
      title: 'Eliminar centro médico',
      description: `¿Eliminar "${h.name}"? Los casos existentes no se verán afectados.`,
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    setDeletingH(h.id);
    try {
      await authService.authenticatedFetch(`${API}/api/v1/medico/admin/hospitals/${h.id}/`, { method: 'DELETE' });
      setHospitals(prev => prev.filter(x => x.id !== h.id));
      toast.success('Eliminado', h.name);
    } catch { toast.error('Error', 'No se pudo eliminar'); }
    finally { setDeletingH(null); }
  };

  const handleSaveEditH = async () => {
    if (!editingH || !editingH.name.trim()) return;
    setSavingEditH(true);
    try {
      const res = await authService.authenticatedFetch(`${API}/api/v1/medico/admin/hospitals/${editingH.id}/`, {
        method: 'PATCH', body: JSON.stringify({ name: editingH.name, location: editingH.location, place_type: editingH.place_type }),
      });
      if (!res.ok) throw new Error((await res.json()).name?.[0] || 'Error al guardar');
      const updated: Hospital = await res.json();
      setHospitals(prev => prev.map(h => h.id === updated.id ? updated : h).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingH(null);
      toast.success('Guardado', updated.name);
    } catch (e: any) { toast.error('Error', e.message); }
    finally { setSavingEditH(false); }
  };

  // ── Insurance helpers ──────────────────────────────────────
  const loadInsurances = async () => {
    setLoadingI(true);
    try {
      const res = await authService.authenticatedFetch(`${API}/api/v1/medico/admin/insurances/`);
      setInsurances(await res.json());
    } catch { toast.error('Error', 'No se pudieron cargar los seguros'); }
    finally { setLoadingI(false); }
  };

  const handleCreateI = async () => {
    if (!newInsName.trim()) { toast.error('Nombre requerido', ''); return; }
    setSavingI(true);
    try {
      const res = await authService.authenticatedFetch(`${API}/api/v1/medico/admin/insurances/`, {
        method: 'POST', body: JSON.stringify({ name: newInsName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).name?.[0] || 'Error al crear');
      const created: Insurance = await res.json();
      setInsurances(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewInsName('');
      toast.success('Creado', `Seguro "${created.name}" agregado`);
    } catch (e: any) { toast.error('Error', e.message); }
    finally { setSavingI(false); }
  };

  const handleDeleteI = async (ins: Insurance) => {
    const ok = await confirm({
      title: 'Eliminar aseguradora',
      description: `¿Eliminar "${ins.name}"?`,
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    setDeletingI(ins.id);
    try {
      await authService.authenticatedFetch(`${API}/api/v1/medico/admin/insurances/${ins.id}/`, { method: 'DELETE' });
      setInsurances(prev => prev.filter(x => x.id !== ins.id));
      toast.success('Eliminado', ins.name);
    } catch { toast.error('Error', 'No se pudo eliminar'); }
    finally { setDeletingI(null); }
  };

  const handleSaveEditI = async () => {
    if (!editingI || !editingI.name.trim()) return;
    setSavingEditI(true);
    try {
      const res = await authService.authenticatedFetch(`${API}/api/v1/medico/admin/insurances/${editingI.id}/`, {
        method: 'PATCH', body: JSON.stringify({ name: editingI.name }),
      });
      if (!res.ok) throw new Error((await res.json()).name?.[0] || 'Error al guardar');
      const updated: Insurance = await res.json();
      setInsurances(prev => prev.map(i => i.id === updated.id ? updated : i).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingI(null);
      toast.success('Guardado', updated.name);
    } catch (e: any) { toast.error('Error', e.message); }
    finally { setSavingEditI(false); }
  };

  const filteredH = hospitals.filter(h =>
    h.name.toLowerCase().includes(filterH.toLowerCase()) ||
    (h.location || '').toLowerCase().includes(filterH.toLowerCase())
  );
  const filteredI = insurances.filter(i => i.name.toLowerCase().includes(filterI.toLowerCase()));

  return (
    <div className="space-y-8">
      {ConfirmDialog}
      <div>
        <h1 className="text-2xl font-bold">Centros médicos y Seguros</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestiona los hospitales, clínicas, consultorios y aseguradoras disponibles en la app.</p>
      </div>

      {/* ── HOSPITALES / CLÍNICAS / CONSULTORIOS ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Centros médicos
            <span className="ml-auto text-sm font-normal text-muted-foreground">{hospitals.length} registros</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Formulario nuevo */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-4 bg-muted/40 rounded-lg">
            <div className="sm:col-span-2">
              <Label className="text-xs mb-1 block">Nombre *</Label>
              <Input placeholder="Ej. Hospital General San Juan" value={newH.name} onChange={e => setNewH(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleCreateH()} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Ubicación</Label>
              <Input placeholder="Ciudad / zona" value={newH.location} onChange={e => setNewH(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Tipo</Label>
              <Select value={newH.place_type} onValueChange={(v) => setNewH(p => ({ ...p, place_type: v as PlaceType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="clinica">Clínica</SelectItem>
                  <SelectItem value="consultorio">Consultorio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-4 flex justify-end">
              <Button onClick={handleCreateH} disabled={savingH} size="sm">
                {savingH ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Agregar
              </Button>
            </div>
          </div>

          {/* Filtro */}
          <Input placeholder="Buscar por nombre o ubicación…" value={filterH} onChange={e => setFilterH(e.target.value)} />

          {/* Lista */}
          {loadingH ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filteredH.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin resultados</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {filteredH.map(h => (
                <div key={h.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 group">
                  {editingH?.id === h.id ? (
                    <>
                      <Input className="h-7 text-sm flex-1" value={editingH.name} onChange={e => setEditingH(p => p ? { ...p, name: e.target.value } : p)} />
                      <Input className="h-7 text-sm w-32" placeholder="Ubicación" value={editingH.location || ''} onChange={e => setEditingH(p => p ? { ...p, location: e.target.value } : p)} />
                      <Select value={editingH.place_type} onValueChange={(v) => setEditingH(p => p ? { ...p, place_type: v as PlaceType } : p)}>
                        <SelectTrigger className="h-7 text-sm w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hospital">Hospital</SelectItem>
                          <SelectItem value="clinica">Clínica</SelectItem>
                          <SelectItem value="consultorio">Consultorio</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleSaveEditH} disabled={savingEditH}>
                        {savingEditH ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingH(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${PLACE_COLORS[h.place_type]}`}>
                        {PLACE_LABELS[h.place_type]}
                      </span>
                      <span className="text-sm font-medium flex-1 truncate">{h.name}</span>
                      {h.location && <span className="text-xs text-muted-foreground truncate hidden sm:block">{h.location}</span>}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingH(h)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteH(h)} disabled={deletingH === h.id}>
                          {deletingH === h.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SEGUROS ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Aseguradoras
            <span className="ml-auto text-sm font-normal text-muted-foreground">{insurances.length} registros</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Formulario nuevo */}
          <div className="flex gap-2 p-4 bg-muted/40 rounded-lg">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">Nombre *</Label>
              <Input placeholder="Ej. Seguros Universales" value={newInsName} onChange={e => setNewInsName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateI()} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreateI} disabled={savingI} size="sm">
                {savingI ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Agregar
              </Button>
            </div>
          </div>

          {/* Filtro */}
          <Input placeholder="Buscar aseguradora…" value={filterI} onChange={e => setFilterI(e.target.value)} />

          {/* Lista */}
          {loadingI ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filteredI.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin resultados</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {filteredI.map(ins => (
                <div key={ins.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 group">
                  {editingI?.id === ins.id ? (
                    <>
                      <Input className="h-7 text-sm flex-1" value={editingI.name} onChange={e => setEditingI(p => p ? { ...p, name: e.target.value } : p)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleSaveEditI} disabled={savingEditI}>
                        {savingEditI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingI(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm flex-1 truncate">{ins.name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingI(ins)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteI(ins)} disabled={deletingI === ins.id}>
                          {deletingI === ins.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
