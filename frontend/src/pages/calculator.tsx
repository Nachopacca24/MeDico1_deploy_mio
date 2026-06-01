// src/pages/calculator.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { loadCSV } from '@/shared/utils/csvLoader';
import { favoritesService } from '@/services/favoritesService';
import { hospitalService, type Hospital } from '@/services/hospitalService';
import {
  Calculator, Search, Star, X, Plus, Loader2, Building2, Zap, DollarSign, Trash2,
} from 'lucide-react';

interface ProcedureData {
  codigo: string;
  cirugia: string;
  especialidad: string;
  grupo: string;
  rvu: number;
}

interface SelectedProcedure extends ProcedureData {
  uid: string;
}

const FOLDER_STRUCTURE: Record<string, Record<string, string>> = {
  "Cardiovascular": {
    "Cardiovascular": "Cardiovascular/Cardiovascular.csv",
    "Corazón": "Cardiovascular/Corazón.csv",
    "Vasos periféricos": "Cardiovascular/Vasos_periféricos.csv",
    "Tórax": "Cardiovascular/torax.csv",
  },
  "Dermatología": { "Dermatología": "Dermatología/Dermatología.csv" },
  "Digestivo": {
    "Digestivo": "Digestivo/Digestivo.csv",
    "Estómago e intestino": "Digestivo/Estómago_e_intestino.csv",
    "Hígado Páncreas": "Digestivo/Hígado_Páncreas.csv",
    "Peritoneo y hernias": "Digestivo/Peritoneo_y_hernias.csv",
  },
  "Endocrino": { "Endocrino": "Endocrino/Endocrino.csv" },
  "Ginecología": { "Ginecología": "Ginecología/Ginecología.csv" },
  "Mama": { "Mama": "Mama/Mama.csv" },
  "Maxilofacial": { "Maxilofacial": "Maxilofacial/Maxilofacial.csv" },
  "Neurocirugía": {
    "Neurocirugía": "Neurocirugía/Neurocirugía.csv",
    "Columna": "Neurocirugía/Columna.csv",
    "Cráneo y columna": "Neurocirugía/Cráneo_y_columna.csv",
  },
  "Obstetricia": { "Obstetricia": "Obstetricia/Obstetricia.csv" },
  "Oftalmología": { "Oftalmología": "Oftalmología/Oftalmología.csv" },
  "Ortopedia": {
    "Ortopedia": "Ortopedia/Ortopedia.csv",
    "Cadera": "Ortopedia/Cadera.csv",
    "Hombro": "Ortopedia/Hombro.csv",
    "Muñeca y mano": "Ortopedia/Muñeca_y_mano.csv",
    "Pie": "Ortopedia/Pie.csv",
    "Yesos y férulas": "Ortopedia/Yesos_y_ferulas.csv",
    "Injertos implantes": "Ortopedia/ortopedia_injertos_implantes_replantacion.csv",
    "Artroscopia": "Ortopedia/Artroscopia.csv",
  },
  "Otorrinolaringología": {
    "Laringe y tráqueas": "Otorrino/Laringe_y_traqueas.csv",
    "Nariz y senos paranasales": "Otorrino/Nariz_y_senos_paranasales.csv",
    "Otorrinolaringología": "Otorrino/Otorrinolaringología.csv",
    "Tórax": "Otorrino/torax.csv",
  },
  "Plástica": { "Plástica": "Plastica/Plastica.csv" },
  "Procesos variados": {
    "Cirugía General": "Procesos_variados/Cirugía_General.csv",
    "Drenajes e Incisiones": "Procesos_variados/Drenajes___Incisiones.csv",
    "Reparaciones (suturas)": "Procesos_variados/Reparaciones_(suturas).csv",
    "Uñas y piel": "Procesos_variados/Uñas___piel.csv",
  },
  "Urología": { "Urología": "Urología/Urología.csv" },
};

export default function CalculatorPage() {
  const [favProcs, setFavProcs]           = useState<ProcedureData[]>([]);
  const [allProcs, setAllProcs]           = useState<ProcedureData[]>([]);
  const [selected, setSelected]           = useState<SelectedProcedure[]>([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [showResults, setShowResults]     = useState(false);
  const [loadingCSV, setLoadingCSV]       = useState(false);
  const [loadingFavRvu, setLoadingFavRvu] = useState<string | null>(null);
  const [hospitals, setHospitals]         = useState<Hospital[]>([]);
  const [hospitalId, setHospitalId]       = useState('');
  const [factor, setFactor]               = useState('1');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hospitalService.getHospitals().then(setHospitals).catch(() => {});
    favoritesService.getFavorites().then(favs => {
      setFavProcs(favs.map(f => ({
        codigo: f.surgery_code,
        cirugia: f.surgery_name || f.surgery_code,
        especialidad: f.specialty || 'General',
        grupo: '',
        rvu: 0,
      })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowResults(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setShowResults(false); return; }
    setShowResults(true);
    if (allProcs.length > 0) return;
    setLoadingCSV(true);
    const procs: ProcedureData[] = [];
    for (const [specialty, subs] of Object.entries(FOLDER_STRUCTURE)) {
      for (const [, path] of Object.entries(subs)) {
        try {
          const rows = await loadCSV(path);
          rows.forEach((r: any) => procs.push({
            codigo: String(r.codigo || '').trim(),
            cirugia: r.cirugia || '',
            especialidad: specialty,
            grupo: r.grupo || '',
            rvu: parseFloat(r.rvu) || 0,
          }));
        } catch {}
      }
    }
    setAllProcs(procs);
    setLoadingCSV(false);
  };

  const filteredProcs = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return allProcs
      .filter(p => p.cirugia.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || p.especialidad.toLowerCase().includes(q))
      .slice(0, 50);
  }, [searchQuery, allProcs]);

  const loadFavRvu = async (proc: ProcedureData): Promise<ProcedureData | null> => {
    if (proc.rvu > 0) return proc;
    if (allProcs.length > 0) {
      const found = allProcs.find(p => p.codigo === proc.codigo);
      if (found) return found;
    }
    setLoadingFavRvu(proc.codigo);
    try {
      const subs = FOLDER_STRUCTURE[proc.especialidad];
      const paths = subs ? Object.values(subs) : Object.values(FOLDER_STRUCTURE).flatMap(s => Object.values(s));
      for (const path of paths) {
        try {
          const rows = await loadCSV(path);
          const found = rows.find((r: any) => String(r.codigo || '').trim() === proc.codigo);
          if (found) {
            setLoadingFavRvu(null);
            return { ...proc, cirugia: found.cirugia || proc.cirugia, rvu: parseFloat(found.rvu) || 0 };
          }
        } catch {}
      }
    } catch {}
    setLoadingFavRvu(null);
    return null;
  };

  const addProc = (proc: ProcedureData) => {
    setSelected(prev => [...prev, { ...proc, uid: `${proc.codigo}-${Date.now()}` }]);
    setSearchQuery('');
    setShowResults(false);
  };

  const addFav = async (proc: ProcedureData) => {
    if (proc.rvu > 0) { addProc(proc); return; }
    const full = await loadFavRvu(proc);
    if (full && full.rvu > 0) addProc(full);
  };

  const removeProc = (uid: string) => setSelected(prev => prev.filter(p => p.uid !== uid));

  const factorNum = useMemo(() => Math.max(parseFloat(factor) || 1, 0.01), [factor]);
  const totalRvu  = useMemo(() => selected.reduce((s, p) => s + p.rvu, 0), [selected]);
  const totalVal  = useMemo(() => totalRvu * factorNum, [totalRvu, factorNum]);
  const selectedHospital = useMemo(() => hospitals.find(h => h.id.toString() === hospitalId), [hospitals, hospitalId]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto pb-10 space-y-6">

        <div className="border-b pb-4">
          <h1 className="text-3xl font-semibold tracking-tight mb-1 flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Calculadora de honorarios
          </h1>
          <p className="text-muted-foreground text-sm">Estimá honorarios rápidamente sin crear una cirugía</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Left: config */}
          <div className="md:col-span-1 space-y-4">

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> Hospital
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={hospitalId} onValueChange={setHospitalId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {hospitals.map(h => (
                      <SelectItem key={h.id} value={h.id.toString()}>
                        <div className="flex items-center gap-1.5">
                          {h.is_favorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />}
                          <span className="truncate">{h.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" /> Factor / Multiplicador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={factor}
                  onChange={e => setFactor(e.target.value)}
                  placeholder="Ej: 1.5"
                  className="h-9 text-sm"
                />
                {selectedHospital && (
                  <p className="text-xs text-muted-foreground mt-1">Para {selectedHospital.name}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Resultado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">RVU Total</span>
                  <span className="font-bold">{totalRvu.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Factor</span>
                  <span className="font-semibold">× {factorNum.toFixed(2)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-semibold">Honorario</span>
                  <span className="font-black text-2xl text-primary">
                    Q {totalVal.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{selected.length} procedimiento{selected.length !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>

          </div>

          {/* Right: procedures */}
          <div className="md:col-span-2 space-y-4">

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" /> Agregar procedimientos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">

                <div ref={searchRef} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    className="pl-9 h-9 text-sm"
                    placeholder="Buscar por nombre, código o especialidad..."
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                  />
                  {showResults && (
                    <div className="absolute z-50 w-full mt-1 bg-card border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {loadingCSV ? (
                        <div className="flex items-center gap-2 p-3 text-muted-foreground text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                        </div>
                      ) : filteredProcs.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">Sin resultados</p>
                      ) : filteredProcs.map((proc, i) => (
                        <button
                          key={proc.codigo + i}
                          className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b last:border-0 text-sm"
                          onClick={() => addProc(proc)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{proc.cirugia}</div>
                              <div className="text-xs text-muted-foreground">{proc.codigo} · {proc.especialidad}</div>
                            </div>
                            <span className="text-xs font-bold text-primary shrink-0">{proc.rvu} RVU</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {favProcs.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1 mb-2 text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> Frecuentes
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {favProcs.map(proc => (
                        <button
                          key={proc.codigo}
                          onClick={() => addFav(proc)}
                          disabled={loadingFavRvu === proc.codigo}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-muted/50 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
                        >
                          {loadingFavRvu === proc.codigo
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Plus className="h-3 w-3" />
                          }
                          {proc.cirugia}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {selected.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Seleccionados ({selected.length})</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setSelected([])} className="text-destructive hover:text-destructive h-7 px-2 text-xs">
                      <Trash2 className="h-3 w-3 mr-1" /> Limpiar todo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selected.map(proc => (
                      <div key={proc.uid} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{proc.cirugia}</div>
                          <div className="text-xs text-muted-foreground">{proc.codigo} · {proc.especialidad}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-primary">{proc.rvu} RVU</div>
                          <div className="text-xs text-muted-foreground">
                            Q {(proc.rvu * factorNum).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeProc(proc.uid)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed rounded-2xl">
                <Calculator className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm">Agregá procedimientos para calcular honorarios</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
