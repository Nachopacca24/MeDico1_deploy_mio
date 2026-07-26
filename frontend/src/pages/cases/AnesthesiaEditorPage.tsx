import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import {
  ArrowLeft, Stethoscope, Trash2, Search, Loader2,
  Clock, Calculator, FileDown, Wrench, Star,
} from "lucide-react";
import { anesthesiaService, type AnesthesiaCase } from "@/services/anesthesiaService";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import { favoritesService, type Favorite } from "@/services/favoritesService";
import { loadCSV } from "@/shared/utils/csvLoader";
import { useToast } from "@/shared/hooks/useToast";
import { useAuth } from "@/shared/contexts/AuthContext";
import { authService } from "@/shared/services/authService";
import { displayPatientName } from "@/shared/utils/patientHash";
import type { SurgicalCase } from "@/types/surgical-case";

const API_URL = import.meta.env.VITE_API_URL || '';

const ANESTHESIA_CSVS = [
  "Anestesia/Espina_y_espalda.csv",
  "Anestesia/Cabeza.csv",
  "Anestesia/Cuello.csv",
  "Anestesia/Thorax.csv",
  "Anestesia/Intrathoracic.csv",
  "Anestesia/Brazo_y_codo.csv",
  "Anestesia/Antebrazo_muñeca_y_mano.csv",
  "Anestesia/Radiological.csv",
  "Anestesia/Rodilla_y_Politeal.csv",
  "Anestesia/Pierna_superior.csv",
  "Anestesia/Pierna_inferior.csv",
  "Anestesia/Hombro_y_axila.csv",
  "Anestesia/Abdomen_inferior.csv",
  "Anestesia/Abdomen_superior.csv",
];

interface CsvRow {
  codigo: string;
  cirugia: string;
  nombre?: string;
  rvu?: string;
  minutos?: string;
  especialidad: string;
  grupo: string;
}

const AnesthesiaEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const caseId = parseInt(id!);

  const [surgicalCase, setSurgicalCase] = useState<SurgicalCase | null>(null);
  const [session, setSession] = useState<AnesthesiaCase | null | undefined>(undefined);

  // Code search
  const [allCodes, setAllCodes] = useState<CsvRow[]>([]);
  const [codeSearch, setCodeSearch] = useState("");
  const [codeResults, setCodeResults] = useState<CsvRow[]>([]);
  const [addingCode, setAddingCode] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  // Favorites
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [showFavorites, setShowFavorites] = useState(true);
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

  // Unit value
  const [editUnitValue, setEditUnitValue] = useState("0");

  // Time
  const [timeMinutes, setTimeMinutes] = useState("");
  const [savingTime, setSavingTime] = useState(false);
  const [timeCodes, setTimeCodes] = useState<CsvRow[]>([]);

  // Equipment
  const [equipmentEnabled, setEquipmentEnabled] = useState(false);
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentCost, setEquipmentCost] = useState("");

  // Combined save (unit value + equipment)
  const [saving, setSaving] = useState(false);

  // PDF
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    Promise.all([
      surgicalCaseService.getCase(caseId),
      anesthesiaService.get(caseId),
    ]).then(([sc, an]) => {
      setSurgicalCase(sc);
      setSession(an);
      if (an) {
        setEditUnitValue(String(an.unit_value));
        setTimeMinutes(an.time_minutes != null ? String(an.time_minutes) : "");
        setEquipmentName(an.equipment_name ?? "");
        setEquipmentCost(an.equipment_cost != null ? String(an.equipment_cost) : "");
        setEquipmentEnabled(!!an.equipment_name);
      }
    }).catch(() => setSession(null));
  }, [caseId]);

  useEffect(() => {
    Promise.all(ANESTHESIA_CSVS.map(k => loadCSV(k).catch(() => [] as CsvRow[]))).then(results => {
      setAllCodes(results.flat() as CsvRow[]);
    });
    loadCSV("Anestesia/uni_tiempo.csv").then(rows => setTimeCodes(rows as CsvRow[])).catch(() => {});
  }, []);

  useEffect(() => {
    favoritesService.getFavorites()
      .then(setFavorites)
      .catch(() => {})
      .finally(() => setLoadingFavorites(false));
  }, []);

  useEffect(() => {
    const q = codeSearch.trim().toLowerCase();
    if (!q) { setCodeResults([]); return; }
    setCodeResults(
      allCodes
        .filter(r => r.codigo?.toLowerCase().includes(q) || (r.cirugia || r.nombre || '').toLowerCase().includes(q))
        .slice(0, 20)
    );
  }, [codeSearch, allCodes]);

  // Favorite codes intersected with the anesthesia code list (excludes surgical-only favorites)
  const favoriteCodesSet = useMemo(() => new Set(favorites.map(f => f.surgery_code)), [favorites]);
  const favoriteRows = useMemo(
    () => allCodes.filter(r => r.codigo && favoriteCodesSet.has(r.codigo)),
    [allCodes, favoriteCodesSet]
  );

  const handleToggleFavorite = async (e: React.MouseEvent, row: CsvRow) => {
    e.stopPropagation();
    if (!row.codigo) return;
    setTogglingFavorite(row.codigo);
    try {
      if (favoriteCodesSet.has(row.codigo)) {
        await favoritesService.removeFavoriteByCode(row.codigo);
        setFavorites(prev => prev.filter(f => f.surgery_code !== row.codigo));
      } else {
        const fav = await favoritesService.addFavorite({
          surgery_code: row.codigo,
          surgery_name: row.cirugia || row.nombre,
          specialty: row.especialidad,
        });
        setFavorites(prev => [...prev, fav]);
      }
    } catch {
      toast.error("No se pudo actualizar el favorito");
    } finally {
      setTogglingFavorite(null);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updated = await anesthesiaService.update(caseId, {
        unit_value: parseFloat(editUnitValue) || 0,
        equipment_name: equipmentEnabled ? equipmentName.trim() || null : null,
        equipment_cost: equipmentEnabled && equipmentCost ? parseFloat(equipmentCost) : null,
      });
      setSession(updated);
      toast.success("Cambios guardados");
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTime = async () => {
    setSavingTime(true);
    try {
      const updated = await anesthesiaService.update(caseId, {
        time_minutes: timeMinutes ? parseFloat(timeMinutes) : null,
      });
      setSession(updated);
      toast.success("Tiempo guardado");
    } catch (e: any) {
      toast.error(e.message || "Error al guardar tiempo");
    } finally {
      setSavingTime(false);
    }
  };

  const handleAddCode = async (row: CsvRow) => {
    if (!row.codigo || addingCode) return;
    setAddingCode(true);
    try {
      const updated = await anesthesiaService.addItem(caseId, {
        surgery_code: row.codigo,
        surgery_name: row.cirugia || row.nombre || '',
        base_units: parseFloat(row.rvu || '0') || 0,
      });
      setSession(updated);
      setCodeSearch("");
      setCodeResults([]);
    } catch (e: any) {
      toast.error(e.message || "Error al agregar código");
    } finally {
      setAddingCode(false);
    }
  };

  const handleRemoveCode = async (itemId: number) => {
    setRemovingId(itemId);
    try {
      const updated = await anesthesiaService.removeItem(caseId, itemId);
      setSession(updated);
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar código");
    } finally {
      setRemovingId(null);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${caseId}/anesthesia/pdf/`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al generar el PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="(.+)"/);
      a.download = match ? match[1] : `anestesia_${caseId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || 'Error al generar el PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  if (session === undefined || !surgicalCase) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
        </div>
      </AppLayout>
    );
  }

  const isAnesthesiologist = !!(
    session &&
    session.anesthesiologist === user?.id &&
    session.anesthesiologist_accepted === true
  );

  if (!isAnesthesiologist) {
    navigate(`/cases/${caseId}`);
    return null;
  }

  const isOperated = surgicalCase.is_operated;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4 pb-12">
        {/* Header */}
        <div className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/cases')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">Formulario de Anestesia</h1>
              <p className="text-sm text-muted-foreground truncate">
                Caso #{caseId} — {displayPatientName(surgicalCase.patient_name)}
              </p>
            </div>
          </div>
        </div>

        {/* Operated alert */}
        {isOperated && session.time_minutes == null && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            La cirugía fue marcada como operada — registrá el tiempo de anestesia para completar el cálculo.
          </div>
        )}

        {/* Unit value */}
        <Card className="border-teal-200 dark:border-teal-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400 text-base">
              <Calculator className="w-4 h-4" />
              Valor por unidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex-1 min-w-0">
              <label className="text-sm font-medium mb-1 block">Valor (Q)</label>
              <input
                type="number" min="0" step="0.01"
                value={editUnitValue}
                onChange={e => setEditUnitValue(e.target.value)}
                className="w-full min-w-0 border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-teal-400 outline-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Codes */}
        <Card className="border-teal-200 dark:border-teal-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400 text-base">
              <Stethoscope className="w-4 h-4" />
              Códigos de anestesia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Favorites — reserva espacio mientras carga para evitar layout shift */}
            {loadingFavorites ? (
              <div className="h-8 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando procedimientos frecuentes...
              </div>
            ) : favoriteRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    Procedimientos Frecuentes ({favoriteRows.length})
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowFavorites(v => !v)}>
                    {showFavorites ? 'Ocultar' : 'Mostrar'}
                  </Button>
                </div>
                {showFavorites && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    {favoriteRows.map(r => (
                      <button
                        key={r.codigo}
                        type="button"
                        onClick={() => handleAddCode(r)}
                        disabled={addingCode}
                        className="text-left p-2.5 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors border border-transparent hover:border-yellow-300 disabled:opacity-50 min-w-0"
                      >
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{r.cirugia || r.nombre}</div>
                            <div className="text-xs text-muted-foreground truncate">Código: {r.codigo}</div>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-teal-700 dark:text-teal-400">{r.rvu} uds</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Agregar código</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={codeSearch}
                  onChange={e => setCodeSearch(e.target.value)}
                  placeholder="Buscar por código o descripción..."
                  className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-background focus:ring-2 focus:ring-teal-400 outline-none"
                />
              </div>
              {codeResults.length > 0 && (
                <div className="mt-1 border rounded-md overflow-hidden max-h-52 overflow-y-auto">
                  {codeResults.map(r => (
                    <div key={r.codigo} className="flex items-center gap-1 border-b last:border-0 min-w-0">
                      <button
                        className="flex-1 min-w-0 text-left px-3 py-2 hover:bg-teal-50 dark:hover:bg-teal-950 flex items-center justify-between gap-2"
                        onClick={() => handleAddCode(r)}
                        disabled={addingCode}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-mono text-muted-foreground">{r.codigo}</span>
                          <span className="ml-2 text-sm">{r.cirugia || r.nombre}</span>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-teal-700 bg-teal-100 dark:bg-teal-900 dark:text-teal-300">
                          {r.rvu} uds
                        </Badge>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, r)}
                        disabled={togglingFavorite === r.codigo}
                        className="p-2 mr-1 shrink-0 hover:text-yellow-500 transition-colors disabled:opacity-50"
                        title={r.codigo && favoriteCodesSet.has(r.codigo) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      >
                        {togglingFavorite === r.codigo
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Star className={`h-4 w-4 ${r.codigo && favoriteCodesSet.has(r.codigo) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {session.items.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Procedimientos agregados</div>
                {session.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg border-teal-100 dark:border-teal-900">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.surgery_name}</div>
                      <div className="text-xs text-muted-foreground">Código: {item.surgery_code}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <Badge variant="secondary" className="text-teal-700 bg-teal-100 dark:bg-teal-900 dark:text-teal-300">
                        {item.base_units} uds
                      </Badge>
                      <button
                        onClick={() => handleRemoveCode(item.id)}
                        disabled={removingId === item.id}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        {removingId === item.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Sin códigos aún — buscá arriba para agregar.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Time — only when operated */}
        {isOperated && (
          <Card className="border-teal-200 dark:border-teal-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400 text-base">
                <Clock className="w-4 h-4" />
                Tiempo de anestesia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Seleccionar duración</label>
                <select
                  value={timeMinutes}
                  onChange={e => setTimeMinutes(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-teal-400 outline-none"
                >
                  <option value="">— Seleccionar tiempo —</option>
                  {timeCodes.filter(r => r.minutos).map(r => (
                    <option key={r.codigo} value={r.minutos!}>
                      {r.cirugia}{r.rvu ? ` (${r.rvu} uds)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-muted-foreground mb-1 block">O ingresar minutos manualmente</label>
                  <input
                    type="number" min="0"
                    value={timeMinutes}
                    onChange={e => setTimeMinutes(e.target.value)}
                    placeholder="ej. 120"
                    className="w-full min-w-0 border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-teal-400 outline-none"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveTime}
                  disabled={savingTime}
                  className="bg-teal-600 hover:bg-teal-700 text-white mt-5"
                >
                  {savingTime ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Equipment — toggle */}
        <Card className="border-teal-200 dark:border-teal-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-teal-700 dark:text-teal-400 text-base">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 shrink-0" />
                <span>Uso de equipo personal</span>
              </div>
              <Switch
                checked={equipmentEnabled}
                onCheckedChange={setEquipmentEnabled}
                className="data-[state=checked]:bg-teal-600"
              />
            </CardTitle>
          </CardHeader>
          {equipmentEnabled && (
            <CardContent className="space-y-3 pt-0">
              <p className="text-xs text-muted-foreground">Se suma al honorario total</p>
              <div className="grid grid-cols-2 gap-2 min-w-0">
                <div className="min-w-0">
                  <label className="text-xs text-muted-foreground mb-1 block">Descripción</label>
                  <input
                    type="text"
                    value={equipmentName}
                    onChange={e => setEquipmentName(e.target.value)}
                    placeholder="ej. Laparoscopio"
                    className="w-full min-w-0 border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-teal-400 outline-none"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-xs text-muted-foreground mb-1 block">Costo (Q)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={equipmentCost}
                    onChange={e => setEquipmentCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full min-w-0 border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-teal-400 outline-none"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Single save button for unit value + equipment */}
        <Button
          onClick={handleSaveAll}
          disabled={saving}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</>
            : "Guardar"}
        </Button>

        {/* Summary */}
        <Card className="border-teal-200 dark:border-teal-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400 text-base">
              <Calculator className="w-4 h-4" />
              Resumen honorario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Unidades base</span>
              <span>{session.total_base_units}</span>
            </div>
            {session.time_units != null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unidades tiempo</span>
                <span>{session.time_units}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total unidades</span>
              <span>{session.total_units}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor por unidad</span>
              <span>Q {Number(session.unit_value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
            </div>
            {session.equipment_cost != null && session.equipment_cost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  Equipo{session.equipment_name ? ` (${session.equipment_name})` : ''}
                </span>
                <span>Q {Number(session.equipment_cost).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-teal-200 dark:border-teal-800">
              <span>Honorario total</span>
              <span className="text-teal-700 dark:text-teal-400 text-base">
                Q {Number(session.total_fee).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* PDF export */}
        <Button
          variant="outline"
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="w-full border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-950"
        >
          {exportingPdf
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generando PDF...</>
            : <><FileDown className="w-4 h-4 mr-2" />Exportar PDF de anestesia</>}
        </Button>
      </div>
    </AppLayout>
  );
};

export default AnesthesiaEditorPage;
