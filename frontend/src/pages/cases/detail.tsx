//src/pages/cases/detail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import type { SurgicalCase } from "@/types/surgical-case";
import {
  ArrowLeft,
  Calendar,
  Hospital,
  User,
  FileText,
  Stethoscope,
  Edit,
  Trash2,
  Clock,
  CreditCard,
  AlertCircle,
  Users,
  TrendingUp,
} from "lucide-react";

const CaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [surgicalCase, setSurgicalCase] = useState<SurgicalCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCase();
    }
  }, [id]);

  const fetchCase = async () => {
    try {
      setLoading(true);
      const data = await surgicalCaseService.getCase(parseInt(id!));
      setSurgicalCase(data);
    } catch (err: any) {
      setError(err.message || 'Error loading case');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!surgicalCase) return;
    
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el caso de ${surgicalCase.patient_name}?\n\nEsta acción no se puede deshacer.`
    );
    
    if (!confirmed) return;

    setDeleting(true);
    try {
      await surgicalCaseService.deleteCase(surgicalCase.id);
      navigate('/cases');
    } catch (err: any) {
      alert('Error al eliminar caso: ' + err.message);
      setDeleting(false);
    }
  };

  // Verificar si el usuario actual es el dueño del caso
  const isOwner = surgicalCase?.is_owner || false;
  
  // Verificar si el usuario es el ayudante (usando assistant_doctor directamente del caso)
  const isAssistant = surgicalCase?.can_edit === false && surgicalCase?.assistant_doctor;

  // Determinar si se puede eliminar (solo si es dueño y el ayudante no ha aceptado)
  const canDelete = isOwner && surgicalCase?.assistant_accepted !== true;

  const getStatusBadge = (status: string) => {
    const config: Record<string, { style: string; label: string }> = {
      scheduled: { style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'Programado' },
      completed: { style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Completado' },
      billed: { style: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', label: 'Facturado' },
      paid: { style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', label: 'Pagado' },
      cancelled: { style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', label: 'Cancelado' },
    };

    const { style, label } = config[status] || config.scheduled;
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${style}`}>{label}</span>;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-muted rounded animate-pulse" />
            <div className="flex-1">
              <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !surgicalCase) {
    return (
      <AppLayout>
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Error al cargar caso</h2>
            <p className="text-muted-foreground mb-6">{error || 'Caso no encontrado'}</p>
            <Button onClick={() => navigate('/cases')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Casos
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/cases')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold mb-1 tracking-tight">
                {surgicalCase.patient_name}
              </h1>
              <p className="text-muted-foreground">
                Caso #{surgicalCase.id}
                {isAssistant && <span className="ml-2 text-primary">• Colaborando como ayudante</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(surgicalCase.status)}
            
            {/* Solo mostrar Edit si es el dueño */}
            {isOwner && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/cases/${surgicalCase.id}/edit`}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Link>
              </Button>
            )}
            
            {/* Solo mostrar Delete si es dueño y puede eliminar */}
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información del Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Nombre Completo</div>
                    <div className="font-medium">{surgicalCase.patient_name}</div>
                  </div>
                  {surgicalCase.patient_id && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        ID del Paciente
                      </div>
                      <div className="font-medium">{surgicalCase.patient_id}</div>
                    </div>
                  )}
                  {surgicalCase.patient_age && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Edad</div>
                      <div className="font-medium">{surgicalCase.patient_age} años</div>
                    </div>
                  )}
                  {surgicalCase.patient_gender && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Género</div>
                      <div className="font-medium">
                        {surgicalCase.patient_gender === 'M' ? 'Masculino' : surgicalCase.patient_gender === 'F' ? 'Femenino' : 'Otro'}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Surgery Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  Detalles de la Cirugía
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Fecha de Cirugía
                    </div>
                    <div className="font-medium">
                      {new Date(surgicalCase.surgery_date).toLocaleDateString('es-GT', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>

                  {surgicalCase.surgery_time && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Hora
                      </div>
                      <div className="font-medium">{surgicalCase.surgery_time}</div>
                    </div>
                  )}

                  <div className="col-span-2">
                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Hospital className="w-4 h-4" />
                      Hospital
                    </div>
                    <div className="font-medium">{surgicalCase.hospital_name}</div>
                  </div>

                  {/* Médico Ayudante */}
                  {surgicalCase.assistant_display_name && surgicalCase.assistant_display_name !== "Sin ayudante" && (
                    <div className="col-span-2">
                      <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Médico Ayudante
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{surgicalCase.assistant_display_name}</div>
                        {surgicalCase.assistant_accepted === true && (
                          <Badge variant="default" className="bg-green-600">Aceptado</Badge>
                        )}
                        {surgicalCase.assistant_accepted === false && (
                          <Badge variant="destructive">Rechazado</Badge>
                        )}
                        {surgicalCase.assistant_accepted === null && (
                          <Badge variant="secondary">Pendiente</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {surgicalCase.diagnosis && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Diagnóstico</div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{surgicalCase.diagnosis}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Procedures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Procedimientos ({surgicalCase.procedure_count || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {surgicalCase.procedures && surgicalCase.procedures.length > 0 ? (
                  <div className="space-y-3">
                    {surgicalCase.procedures.map((procedure, index) => (
                      <div
                        key={procedure.id || index}
                        className="p-4 border rounded-lg hover:border-primary transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-semibold mb-1">{procedure.surgery_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Código: {procedure.surgery_code} • {procedure.specialty}
                              {procedure.grupo && ` • ${procedure.grupo}`}
                            </div>
                          </div>
                        </div>
                        
                        {/* Mostrar RVU para todos, valores monetarios solo para el dueño */}
                        <div className={`grid ${isAssistant ? 'grid-cols-1' : 'grid-cols-3'} gap-4 mt-3 pt-3 border-t`}>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">RVU</div>
                            <div className="font-semibold flex items-center gap-1">
                              <TrendingUp className="w-4 h-4 text-primary" />
                              {procedure.rvu}
                            </div>
                          </div>
                          
                          {/* Solo mostrar factor y valor si NO es ayudante */}
                          {!isAssistant && (
                            <>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Factor</div>
                                <div className="font-semibold">{procedure.hospital_factor}x</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Valor</div>
                                <div className="font-semibold text-primary">
                                  ${procedure.calculated_value?.toLocaleString('en-US', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {procedure.notes && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs text-muted-foreground mb-1">Notas</div>
                            <p className="text-sm">{procedure.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No hay procedimientos registrados
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Financial Summary - Solo para el dueño */}
            {!isAssistant && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Resumen Financiero
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Total Procedimientos</div>
                    <div className="text-2xl font-bold">{surgicalCase.procedure_count || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">RVU Total</div>
                    <div className="text-2xl font-bold">{surgicalCase.total_rvu || 0}</div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-1">Valor Total</div>
                    <div className="text-3xl font-bold text-primary">
                      ${(surgicalCase.total_value || 0).toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* RVU Summary - Para el ayudante */}
            {isAssistant && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Resumen de Procedimientos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Total Procedimientos</div>
                    <div className="text-2xl font-bold">{surgicalCase.procedure_count || 0}</div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-1">RVU Total</div>
                    <div className="text-3xl font-bold text-primary">{surgicalCase.total_rvu || 0}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Información del Caso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {surgicalCase.primary_specialty && (
                  <div>
                    <div className="text-muted-foreground mb-1">Especialidad Principal</div>
                    <div className="font-medium">{surgicalCase.primary_specialty}</div>
                  </div>
                )}
                {isOwner && surgicalCase.created_by_name && (
                  <div>
                    <div className="text-muted-foreground mb-1">Creado por</div>
                    <div className="font-medium">{surgicalCase.created_by_name}</div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground mb-1">Fecha de Creación</div>
                  <div className="font-medium">
                    {new Date(surgicalCase.created_at).toLocaleDateString('es-GT', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                {surgicalCase.updated_at && (
                  <div>
                    <div className="text-muted-foreground mb-1">Última Actualización</div>
                    <div className="font-medium">
                      {new Date(surgicalCase.updated_at).toLocaleDateString('es-GT', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CaseDetailPage;