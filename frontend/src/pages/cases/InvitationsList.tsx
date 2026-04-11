// src/components/cases/InvitationsList.tsx

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { surgicalCaseService } from '@/services/surgicalCaseService';
import { InvitationCard } from '@/pages/cases/InvitationCard';
import type { SurgicalCase, AssistedCasesResponse } from '@/types/surgical-case';
import { Loader2, UserCheck, Clock, Briefcase, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';


export function InvitationsList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AssistedCasesResponse>({
    pending_invitations: [],
    accepted_cases: [],
    total_pending: 0,
    total_accepted: 0,
  });

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await surgicalCaseService.getAssistedCases();
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Error al cargar invitaciones');
      console.error('Error loading invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationAccepted = (caseId: number) => {
    // Mover el caso de pendientes a aceptados
    const acceptedCase = data.pending_invitations.find(c => c.id === caseId);
    if (acceptedCase) {
      setData({
        pending_invitations: data.pending_invitations.filter(c => c.id !== caseId),
        accepted_cases: [...data.accepted_cases, { ...acceptedCase, assistant_accepted: true }],
        total_pending: data.total_pending - 1,
        total_accepted: data.total_accepted + 1,
      });
    }
  };

  const handleInvitationRejected = (caseId: number) => {
    // Remover de pendientes
    setData({
      ...data,
      pending_invitations: data.pending_invitations.filter(c => c.id !== caseId),
      total_pending: data.total_pending - 1,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Cargando invitaciones...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-16 w-16 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Error al cargar invitaciones</h3>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={loadInvitations}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invitaciones Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Casos esperando tu respuesta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos Aceptados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_accepted}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Casos donde colaboras como ayudante
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para separar pendientes y aceptados */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="relative">
            Pendientes
            {data.total_pending > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {data.total_pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted">
            Aceptados ({data.total_accepted})
          </TabsTrigger>
        </TabsList>

        {/* Invitaciones pendientes */}
        <TabsContent value="pending" className="space-y-4 mt-6">
          {data.pending_invitations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <UserCheck className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No hay invitaciones pendientes</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Cuando un colega te invite a colaborar en un caso, aparecerá aquí.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.pending_invitations.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  case={invitation}
                  onAccept={handleInvitationAccepted}
                  onReject={handleInvitationRejected}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Casos aceptados */}
        <TabsContent value="accepted" className="space-y-4 mt-6">
          {data.accepted_cases.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Briefcase className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No tienes casos aceptados</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Los casos donde aceptaste colaborar como ayudante aparecerán aquí.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.accepted_cases.map((surgicalCase) => (
                <Card key={surgicalCase.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl flex items-center gap-2">
                          {surgicalCase.patient_name}
                          <Badge variant="default" className="bg-green-600">
                            Aceptado
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-2">
                          Invitado por: <span className="font-medium">{surgicalCase.created_by_name || 'Colega'}</span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Fecha</div>
                        <div className="font-medium">
                          {new Date(surgicalCase.surgery_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Hospital</div>
                        <div className="font-medium truncate">{surgicalCase.hospital_name}</div>
                      </div>
                    </div>

                    {surgicalCase.primary_specialty && (
                      <div>
                        <Badge variant="outline">{surgicalCase.primary_specialty}</Badge>
                        {surgicalCase.procedure_count && surgicalCase.procedure_count > 1 && (
                          <span className="text-sm text-muted-foreground ml-2">
                            + {surgicalCase.procedure_count - 1} más
                          </span>
                        )}
                      </div>
                    )}

                    <div className="pt-3 border-t">
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link to={`/cases/${surgicalCase.id}`}>
                          Ver detalles del caso
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}