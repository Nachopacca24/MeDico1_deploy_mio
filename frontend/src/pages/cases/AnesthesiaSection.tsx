import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Stethoscope, Lock, Plus, Trash2, Search, Loader2, Clock, Calculator, FileDown } from "lucide-react";
import { anesthesiaService, type AnesthesiaCase } from "@/services/anesthesiaService";
import { colleaguesService, type Colleague } from "@/services/colleaguesService";
import { loadCSV } from "@/shared/utils/csvLoader";
import { useToast } from "@/shared/hooks/useToast";
import { authService } from "@/shared/services/authService";

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

interface Props {
  caseId: number;
  isOwner: boolean;
  isAssistant: boolean;
  isOperated: boolean;
  currentUserId: number | undefined;
}

export function AnesthesiaSection({ caseId, isOwner, isAssistant, isOperated, currentUserId }: Props) {
  const { toast } = useToast();
  const [session, setSession] = useState<AnesthesiaCase | null | undefined>(undefined);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [unitValue, setUnitValue] = useState("0");
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [selectedColleagueId, setSelectedColleagueId] = useState("");
  const [manualName, setManualName] = useState("");
  const [creating, setCreating] = useState(false);

  // Anesthesiologist edit
  const [allCodes, setAllCodes] = useState<CsvRow[]>([]);
  const [codeSearch, setCodeSearch] = useState("");
  const [codeResults, setCodeResults] = useState<CsvRow[]>([]);
  const [addingCode, setAddingCode] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [editUnitValue, setEditUnitValue] = useState("0");
  const [savingUnitValue, setSavingUnitValue] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState("");
  const [savingTime, setSavingTime] = useState(false);
  const [timeCodes, setTimeCodes] = useState<CsvRow[]>([]);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    anesthesiaService.get(caseId).then(data => {
      setSession(data);
      if (data) {
        setEditUnitValue(String(data.unit_value));
        setTimeMinutes(data.time_minutes != null ? String(data.time_minutes) : "");
      }
    }).catch(() => setSession(null));
  }, [caseId]);

  const isAnesthesiologist = !!(session && session.anesthesiologist === currentUserId);
  const invitePending = isAnesthesiologist && session?.anesthesiologist_accepted === null;
  const inviteRejected = isAnesthesiologist && session?.anesthesiologist_accepted === false;
  const inviteAccepted = isAnesthesiologist && session?.anesthesiologist_accepted === true;

  useEffect(() => {
    if (isOwner && session === null) {
      colleaguesService.getColleagues().then(res => {
        setColleagues(res.colleagues.filter(c => c.specialty === 'Anestesiología'));
      }).catch(() => {});
    }
  }, [isOwner, session]);

  useEffect(() => {
    if (!inviteAccepted) return;
    Promise.all(ANESTHESIA_CSVS.map(k => loadCSV(k).catch(() => [] as CsvRow[]))).then(results => {
      setAllCodes(results.flat() as CsvRow[]);
    });
    loadCSV("Anestesia/uni_tiempo.csv").then(rows => setTimeCodes(rows as CsvRow[])).catch(() => {});
  }, [inviteAccepted]);

  useEffect(() => {
    const q = codeSearch.trim().toLowerCase();
    if (!q) { setCodeResults([]); return; }
    setCodeResults(
      allCodes.filter(r => r.codigo?.toLowerCase().includes(q) || (r.cirugia || r.nombre || '').toLowerCase().includes(q)).slice(0, 20)
    );
  }, [codeSearch, allCodes]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data = await anesthesiaService.create(caseId, {
        unit_value: parseFloat(unitValue) || 0,
        anesthesiologist: selectedColleagueId ? parseInt(selectedColleagueId) : null,
        anesthesiologist_name: !selectedColleagueId && manualName ? manualName : null,
      });
      setSession(data);
      setEditUnitValue(String(data.unit_value));
      setShowCreate(false);
      toast.success("Sesión de anestesia creada");
    } catch (e: any) {
      toast.error(e.message || "Error al crear la sesión");
    } finally {
      setCreating(false);
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

  const handleSaveUnitValue = async () => {
    setSavingUnitValue(true);
    try {
      const updated = await anesthesiaService.update(caseId, { unit_value: parseFloat(editUnitValue) || 0 });
      setSession(updated);
      toast.success("Valor por unidad actualizado");
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSavingUnitValue(false);
    }
  };

  const handleSaveTime = async () => {
    setSavingTime(true);
    try {
      const mins = timeMinutes ? parseFloat(timeMinutes) : null;
      const updated = await anesthesiaService.update(caseId, { time_minutes: mins });
      setSession(updated);
      toast.success("Tiempo guardado");
    } catch (e: any) {
      toast.error(e.message || "Error al guardar tiempo");
    } finally {
      setSavingTime(false);
    }
  };

  if (session === undefined) {
    return (
      <Card className="border-teal-200 dark:border-teal-800">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-teal-500" />
        </CardContent>
      </Card>
    );
  }

  // Owner — no session yet
  if (isOwner && !session) {
    return (
      <Card className="border-teal-200 dark:border-teal-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
            <Stethoscope className="w-5 h-5" />
            Anestesia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showCreate ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Configura la sesión de anestesia para invitar a un anestesiólogo a este caso.
              </p>
              <Button
                variant="outline"
                className="border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-950"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Configurar Anestesia
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Valor por unidad (Q)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={unitValue}
                  onChange={e => setUnitValue(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-teal-400 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Anestesiólogo colega</label>
                <select
                  value={selectedColleagueId}
                  onChange={e => setSelectedColleagueId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-teal-400 outline-none"
                >
                  <option value="">— Seleccionar anestesiólogo —</option>
                  {colleagues.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name || `${c.first_name} ${c.last_name}`}
                    </option>
                  ))}
                </select>
                {colleagues.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No tienes colegas con especialidad Anestesiología. Puedes escribir el nombre manualmente abajo.
                  </p>
                )}
              </div>
              {!selectedColleagueId && (
                <div>
                  <label className="text-sm font-medium mb-1 block">O nombre manual</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    placeholder="Dr. Nombre Apellido"
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-teal-400 outline-none"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Crear sesión
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Anesthesiologist — invitation pending (respond from cases list)
  if (invitePending) {
    return (
      <Card id="anesthesia" className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <Stethoscope className="w-5 h-5" />
            Invitación de Anestesia
            <Badge variant="secondary" className="ml-1">Pendiente</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tienes una invitación pendiente para este caso. Responde desde la lista de casos para poder editar tu sección.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Anesthesiologist — invitation rejected
  if (inviteRejected) {
    return (
      <Card id="anesthesia" className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Stethoscope className="w-5 h-5" />
            Anestesia
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 ml-1">Rechazada</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Rechazaste la invitación a este caso.</p>
        </CardContent>
      </Card>
    );
  }

  // Anesthesiologist — accepted, full editor
  if (inviteAccepted) {
    return (
      <Card id="anesthesia" className="border-teal-400 dark:border-teal-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
            <Stethoscope className="w-5 h-5" />
            Mi Sección de Anestesia
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 ml-1">Aceptada</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Unit value */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Valor por unidad (Q)</label>
              <input
                type="number" min="0" step="0.01"
                value={editUnitValue}
                onChange={e => setEditUnitValue(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-teal-400 outline-none"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSaveUnitValue}
              disabled={savingUnitValue}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {savingUnitValue ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
            </Button>
          </div>

          {/* Code search */}
          <div>
            <label className="text-sm font-medium mb-1 block">Agregar código de anestesia</label>
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
                  <button
                    key={r.codigo}
                    className="w-full text-left px-3 py-2 hover:bg-teal-50 dark:hover:bg-teal-950 border-b last:border-0 flex items-center justify-between gap-2"
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
                ))}
              </div>
            )}
          </div>

          {/* Current codes */}
          {session!.items.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">Procedimientos agregados</div>
              {session!.items.map(item => (
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

          {/* Time — only when is_operated */}
          {isOperated && (
            <div className="pt-3 border-t border-teal-100 dark:border-teal-900">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-medium">Tiempo de anestesia</span>
              </div>
              {!session!.time_minutes && (
                <div className="mb-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                  La cirugía fue marcada como operada — registrá el tiempo de anestesia para completar el cálculo.
                </div>
              )}
              <div className="space-y-2">
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
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">O ingresar minutos manualmente</label>
                    <input
                      type="number" min="0"
                      value={timeMinutes}
                      onChange={e => setTimeMinutes(e.target.value)}
                      placeholder="ej. 120"
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-teal-400 outline-none"
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
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="pt-3 border-t border-teal-200 dark:border-teal-800 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium">Resumen honorario</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Unidades base</span>
              <span>{session!.total_base_units}</span>
            </div>
            {session!.time_units != null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unidades tiempo</span>
                <span>{session!.time_units}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total unidades</span>
              <span>{session!.total_units}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor por unidad</span>
              <span>Q {Number(session!.unit_value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-teal-200 dark:border-teal-800">
              <span>Honorario total</span>
              <span className="text-teal-700 dark:text-teal-400 text-base">
                Q {Number(session!.total_fee).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* PDF export */}
          <div className="pt-3 border-t border-teal-200 dark:border-teal-800">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="w-full border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-950"
            >
              {exportingPdf
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generando PDF...</>
                : <><FileDown className="w-4 h-4 mr-2" />Exportar PDF de anestesia</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Read-only view (owner with session, assistant, or other viewer with session)
  if (session) {
    return (
      <Card id="anesthesia" className="border-teal-200 dark:border-teal-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
            <Stethoscope className="w-5 h-5" />
            Anestesia
            {session.anesthesiologist_display && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                — {session.anesthesiologist_display}
              </span>
            )}
            {session.anesthesiologist && session.anesthesiologist_accepted === true && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 ml-1">Aceptada</Badge>
            )}
            {session.anesthesiologist && session.anesthesiologist_accepted === null && (
              <Badge variant="secondary" className="ml-1">Pendiente</Badge>
            )}
            {session.anesthesiologist && session.anesthesiologist_accepted === false && (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 ml-1">Rechazada</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            Solo el anestesiólogo puede editar esta sección
          </div>
          {session.items.length > 0 ? (
            <div className="space-y-2">
              {session.items.map(item => (
                <div key={item.id} className="p-3 border rounded-lg border-teal-100 dark:border-teal-900">
                  <div className="text-sm font-medium">{item.surgery_name}</div>
                  <div className="text-xs text-muted-foreground">Código: {item.surgery_code}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin procedimientos de anestesia aún</p>
          )}

          {/* Tiempo registrado — visible para todos pero sin datos financieros */}
          {session.time_minutes != null && (
            <div className="pt-3 border-t border-teal-100 dark:border-teal-900 flex items-center gap-3">
              <Clock className="w-4 h-4 text-teal-500 shrink-0" />
              <div className="text-sm">
                <span className="font-medium">{session.time_minutes} min</span>
                <span className="text-muted-foreground ml-2">
                  ({session.time_units} unidades de tiempo)
                </span>
              </div>
            </div>
          )}
          {isOperated && session.time_minutes == null && (
            <div className="pt-3 border-t border-teal-100 dark:border-teal-900 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4 shrink-0" />
              Tiempo de anestesia pendiente
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
