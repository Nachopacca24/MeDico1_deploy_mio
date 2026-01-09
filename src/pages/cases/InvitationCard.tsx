// src/pages/cases/InvitationCard.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Calendar, Hospital, Users, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import { useToast } from "@/shared/hooks/useToast";
import type { SurgicalCase } from "@/types/surgical-case";

interface InvitationCardProps {
  case: SurgicalCase;
  onAccept: (caseId: number) => void;
  onReject: (caseId: number) => void;
}

export function InvitationCard({ case: surgicalCase, onAccept, onReject }: InvitationCardProps) {
  const { toast } = useToast();
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await surgicalCaseService.acceptInvitation(surgicalCase.id);
      toast.success('¡Invitación aceptada!', 'El caso ahora aparece en tu lista');
      onAccept(surgicalCase.id);
    } catch (error: any) {
      toast.error('Error', error.message || 'No se pudo aceptar la invitación');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    const confirmed = confirm('¿Estás seguro de rechazar esta invitación?');
    if (!confirmed) return;

    setRejecting(true);
    try {
      await surgicalCaseService.rejectInvitation(surgicalCase.id);
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
        {/* ✅ NUEVO: Mostrar quién invitó */}
        {surgicalCase.created_by_name && (
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <Users className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              De: <span className="text-blue-600 dark:text-blue-400 font-semibold">{surgicalCase.created_by_name}</span>
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
            <span>{new Date(surgicalCase.surgery_date).toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
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
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Aceptando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Aceptar
              </>
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
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Rechazando...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-1.5" />
                Rechazar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}