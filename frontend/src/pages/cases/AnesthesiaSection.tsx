import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Stethoscope, Lock, Plus, Loader2, Clock, Wrench } from "lucide-react";
import { anesthesiaService, type AnesthesiaCase } from "@/services/anesthesiaService";
import { colleaguesService, type Colleague } from "@/services/colleaguesService";
import { useToast } from "@/shared/hooks/useToast";

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

  // Invite form (for owner)
  const [showCreate, setShowCreate] = useState(false);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [selectedColleagueId, setSelectedColleagueId] = useState("");
  const [manualName, setManualName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    anesthesiaService.get(caseId).then(data => {
      setSession(data);
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

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data = await anesthesiaService.create(caseId, {
        unit_value: 0,
        anesthesiologist: selectedColleagueId ? parseInt(selectedColleagueId) : null,
        anesthesiologist_name: !selectedColleagueId && manualName ? manualName : null,
      });
      setSession(data);
      setShowCreate(false);
      toast.success("Invitación enviada");
    } catch (e: any) {
      toast.error(e.message || "Error al crear la sesión");
    } finally {
      setCreating(false);
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
                Invita a un anestesiólogo a este caso. Ellos configurarán sus propios honorarios.
              </p>
              <Button
                variant="outline"
                className="border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-950"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Invitar Anestesiólogo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
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
                  Enviar invitación
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Anesthesiologist — invitation pending
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

  // Anesthesiologist accepted — link to dedicated editor page
  if (inviteAccepted) {
    return (
      <Card id="anesthesia" className="border-teal-400 dark:border-teal-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap text-teal-700 dark:text-teal-400">
            <Stethoscope className="w-5 h-5 shrink-0" />
            <span>Mi Sección de Anestesia</span>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">Aceptada</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {session && session.items.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {session.items.length} código{session.items.length !== 1 ? 's' : ''} · Q {Number(session.total_fee).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
          <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white w-full">
            <Link to={`/cases/${caseId}/anesthesia`}>
              <Stethoscope className="w-4 h-4 mr-2" />
              Ir al formulario de anestesia
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Read-only view for owner with session, assistant, or any viewer
  if (session) {
    return (
      <Card id="anesthesia" className="border-teal-200 dark:border-teal-800 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap text-teal-700 dark:text-teal-400">
            <Stethoscope className="w-5 h-5 shrink-0" />
            <span>Anestesia</span>
            {session.anesthesiologist_display && (
              <span className="text-sm font-normal text-muted-foreground truncate max-w-[180px]">
                — {session.anesthesiologist_display}
              </span>
            )}
            {session.anesthesiologist && session.anesthesiologist_accepted === true && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">Aceptada</Badge>
            )}
            {session.anesthesiologist && session.anesthesiologist_accepted === null && (
              <Badge variant="secondary">Pendiente</Badge>
            )}
            {session.anesthesiologist && session.anesthesiologist_accepted === false && (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">Rechazada</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0">
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
          {session.equipment_name && (
            <div className="pt-3 border-t border-teal-100 dark:border-teal-900 flex items-start gap-3">
              <Wrench className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">{session.equipment_name}</span>
                {session.equipment_cost != null && (
                  <span className="text-muted-foreground ml-2">
                    — Q {Number(session.equipment_cost).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
