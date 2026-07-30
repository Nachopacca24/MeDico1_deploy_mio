import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Calendar, Hospital, CheckCircle, XCircle, Loader2, Stethoscope } from "lucide-react";
import { useState } from "react";
import { anesthesiaService } from "@/services/anesthesiaService";
import { calendarSyncService } from "@/services/calendarSyncService";
import { useToast } from "@/shared/hooks/useToast";
import type { SurgicalCase } from "@/types/surgical-case";

interface Props {
  case: SurgicalCase;
  onAccept: (caseId: number) => void;
  onReject: (caseId: number) => void;
}

export function AnesthesiaInvitationCard({ case: surgicalCase, onAccept, onReject }: Props) {
  const { toast } = useToast();
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await anesthesiaService.respond(surgicalCase.id, true);
      toast.success('¡Invitación aceptada!', 'El caso ahora aparece en tu lista');

      // Create calendar event immediately — fire and forget, doesn't block the UI
      const stableId = `medicoanest${surgicalCase.id}`;
      const acceptedCase = { ...surgicalCase, is_anesthesiologist: true, is_owner: false };
      calendarSyncService.createEventForCase(acceptedCase, stableId).then(eventId => {
        if (eventId) calendarSyncService.saveAnesthesiologistEventIdToDb(surgicalCase.id, eventId);
      }).catch(() => {});

      onAccept(surgicalCase.id);
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo aceptar la invitación');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    const confirmed = confirm('¿Estás seguro de rechazar esta invitación de anestesia?');
    if (!confirmed) return;

    setRejecting(true);
    try {
      await anesthesiaService.respond(surgicalCase.id, false);
      toast.info('Invitación rechazada', 'El médico principal será notificado');
      onReject(surgicalCase.id);
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo rechazar la invitación');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <Card className="border-orange-300 hover:border-orange-400 transition-colors bg-white dark:bg-slate-900">
      <CardHeader className="pb-3">
        {surgicalCase.created_by_name && (
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-teal-500/10 rounded-lg">
              <Stethoscope className="w-3.5 h-3.5 text-teal-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Anestesia — De: <span className="text-blue-600 dark:text-blue-400 font-semibold">{surgicalCase.created_by_name}</span>
            </span>
          </div>
        )}
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{surgicalCase.patient_name}</CardTitle>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
            Pendiente
          </Badge>
        </div>
        <CardDescription className="space-y-2 mt-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>
              {new Date(surgicalCase.surgery_date + 'T12:00:00').toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              {surgicalCase.surgery_time && (
                <span className="ml-2 font-medium text-foreground">
                  {surgicalCase.surgery_time.slice(0, 5)}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Hospital className="w-4 h-4 text-muted-foreground" />
            <span>{surgicalCase.hospital_name}</span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button
            onClick={handleAccept}
            disabled={accepting || rejecting}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="sm"
          >
            {accepting ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Aceptando...</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-1.5" />Aceptar</>
            )}
          </Button>
          <Button
            onClick={handleReject}
            disabled={accepting || rejecting}
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            size="sm"
          >
            {rejecting ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Rechazando...</>
            ) : (
              <><XCircle className="w-4 h-4 mr-1.5" />Rechazar</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
