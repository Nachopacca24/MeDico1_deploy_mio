//src/pages/cases/detail.tsx
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import type { SurgicalCase } from "@/types/surgical-case";
import { displayPatientName } from "@/shared/utils/patientHash";
import { useToast } from "@/shared/hooks/useToast";
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
  Download,
  ImagePlus,
  X,
  Images,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/shared/contexts/AuthContext";
import { authService } from "@/shared/services/authService";

interface SurgeryImage {
  id: number;
  cloudinary_url: string;
  original_filename: string;
  file_size: number | null;
  uploaded_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || '';

const CaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [surgicalCase, setSurgicalCase] = useState<SurgicalCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [images, setImages] = useState<SurgeryImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const imagesSectionRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const isPremium = user?.plan === 'premium' || user?.is_permanent_premium;

  const fetchImages = async (caseId: number) => {
    setImagesLoading(true);
    try {
      const resp = await authService.authenticatedFetch(`${API_URL}/api/v1/medico/cases/${caseId}/images/`);
      if (resp.ok) setImages(await resp.json());
    } catch { /* silent */ }
    finally { setImagesLoading(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !surgicalCase) return;
    if (images.length >= 5) {
      toast.error('Límite de 5 imágenes por cirugía alcanzado');
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    setUploadingImage(true);
    try {
      const resp = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${surgicalCase.id}/images/upload/`,
        { method: 'POST', body: formData }
      );
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        throw new Error(d.error || 'Error al subir imagen');
      }
      const img = await resp.json();
      setImages(prev => [...prev, img]);
      toast.success('Imagen subida correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir imagen');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleImageDelete = async (imageId: number) => {
    if (!surgicalCase) return;
    try {
      const resp = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${surgicalCase.id}/images/${imageId}/`,
        { method: 'DELETE' }
      );
      if (resp.ok || resp.status === 204) {
        setImages(prev => prev.filter(img => img.id !== imageId));
        toast.success('Imagen eliminada');
      }
    } catch {
      toast.error('Error al eliminar imagen');
    }
  };

  const handleExportPdf = async (includeHospitalFactor = true) => {
    if (!surgicalCase) return;
    setPdfLoading(true);
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${surgicalCase.id}/pdf/?include_factor=${includeHospitalFactor}`,
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Error al generar el PDF');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = response.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="(.+)"/);
      a.download = match ? match[1] : `cirugia_${surgicalCase.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || 'No se pudo generar el PDF');
    } finally {
      setPdfLoading(false);
    }
  };
  useEffect(() => {
    if (id) fetchCase();
  }, [id]);

  // Scroll to images section if #images hash is present
  useEffect(() => {
    if (window.location.hash === '#images' && imagesSectionRef.current) {
      setTimeout(() => {
        imagesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (isPremium && isOwner) imageFileInputRef.current?.click();
      }, 600);
    }
  }, [surgicalCase]);

  const fetchCase = async () => {
    try {
      setLoading(true);
      const data = await surgicalCaseService.getCase(parseInt(id!));
      setSurgicalCase(data);
      fetchImages(data.id);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el caso');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!surgicalCase) return;
    
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el caso ${displayPatientName(surgicalCase.patient_name)}?\n\nEsta acción no se puede deshacer.`
    );
    
    if (!confirmed) return;

    setDeleting(true);
    try {
      await surgicalCaseService.deleteCase(surgicalCase.id);
      navigate('/cases');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el caso');
      setDeleting(false);
    }
  };

  // Verificar si el usuario actual es el dueño del caso
  const isOwner = surgicalCase?.is_owner || false;
  
  // Verificar si el usuario es el ayudante (usando assistant_doctor directamente del caso)
  const isAssistant = surgicalCase?.can_edit === false && surgicalCase?.assistant_doctor;

  const isPaid = surgicalCase?.is_paid ?? false;

  // Determinar si se puede eliminar (solo si es dueño, no cobrado, y el ayudante no ha aceptado)
  const canDelete = isOwner && !isPaid && surgicalCase?.assistant_accepted !== true;

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
        <div className="pb-4 border-b space-y-3">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="mt-0.5 flex-shrink-0" onClick={() => navigate('/cases')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold mb-1 tracking-tight font-mono break-words">
                {displayPatientName(surgicalCase.patient_name)}
              </h1>
              <p className="text-sm text-muted-foreground">
                Caso #{surgicalCase.id}
                {isAssistant && <span className="ml-2 text-primary">• Colaborando como ayudante</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap pl-11">
            {getStatusBadge(surgicalCase.status)}

            {isOwner && !isPaid && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/cases/${surgicalCase.id}/edit`}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Link>
              </Button>
            )}

            {/* PDF export — visible siempre, activo solo para premium */}
            {isOwner && (
              isPremium ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportPdf(true)}
                  disabled={pdfLoading}
                  className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                >
                  {pdfLoading
                    ? <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2" />
                    : <Download className="w-4 h-4 mr-2" />
                  }
                  Exportar PDF
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-muted/40 opacity-60 cursor-not-allowed select-none">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Exportar PDF</span>
                  <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-medium ml-1">Premium</span>
                </div>
              )
            )}

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
                    <div className="text-sm text-muted-foreground mb-1">Código del Paciente</div>
                    <div className="font-medium">{displayPatientName(surgicalCase.patient_name)}</div>
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

                  {surgicalCase.insurance_company_name && (
                    <div className="col-span-2">
                      <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        Seguro médico
                      </div>
                      <div className="font-medium">{surgicalCase.insurance_company_name}</div>
                    </div>
                  )}

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
                        <div className={`grid ${isAssistant ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'} gap-3 mt-3 pt-3 border-t`}>
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
                                  Q {procedure.calculated_value?.toLocaleString('es-GT', {
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
                      Q {(surgicalCase.total_value || 0).toLocaleString('es-GT', {
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

        {/* ── Images section ─────────────────────────────────────────── */}
        {/* Hidden file input triggered by the status toggle button */}
        <input
          ref={imageFileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleImageUpload}
          disabled={uploadingImage}
        />
        <div ref={imagesSectionRef} className={`rounded-xl border-2 border-dashed p-6 transition-colors ${isPremium ? 'border-amber-400/60 bg-amber-400/5' : 'border-border bg-muted/20'}`}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <Images className={`w-5 h-5 flex-shrink-0 ${isPremium ? 'text-amber-400' : 'text-muted-foreground'}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${isPremium ? 'text-amber-400' : 'text-muted-foreground'}`}>
                {surgicalCase.is_operated ? 'Imágenes post-operatorias' : 'Imágenes'}
                {images.length > 0 && <span className="text-sm font-normal text-muted-foreground ml-2">({images.length}/5)</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {surgicalCase.is_operated ? 'Fotos del resultado, evolución y cierre' : 'Radiografías, estudios, fotos del paciente'}
              </p>
            </div>
            {isOwner && isPremium && images.length < 5 && (
              <label className="cursor-pointer flex-shrink-0">
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400/50 text-amber-400 hover:bg-amber-400/10 text-sm font-medium transition-colors">
                  {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  {uploadingImage ? 'Subiendo...' : `Agregar (${images.length}/5)`}
                </div>
              </label>
            )}
          </div>

          {/* Content */}
          {!isPremium ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <ImagePlus className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground text-center">
                La carga de imágenes es exclusiva del <span className="text-amber-400 font-semibold">Plan Premium</span>
              </p>
            </div>
          ) : imagesLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : images.length === 0 ? (
            isOwner ? (
              <label className="flex flex-col items-center justify-center py-8 cursor-pointer rounded-lg border border-dashed border-amber-400/30 hover:border-amber-400/60 hover:bg-amber-400/5 transition-colors">
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                <ImagePlus className="w-10 h-10 text-amber-400/50 mb-2" />
                <p className="text-sm text-muted-foreground">Hacé clic para agregar imágenes</p>
                <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG o WEBP · Máx. 10 MB</p>
              </label>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No hay imágenes en este caso.</p>
            )
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {images.map(img => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border border-amber-400/20 aspect-square">
                  <img
                    src={img.cloudinary_url}
                    alt={img.original_filename || 'Imagen'}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setLightboxUrl(img.cloudinary_url)}
                  />
                  {isOwner && (
                    <button
                      onClick={() => handleImageDelete(img.id)}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {isOwner && images.length < 5 && (
                <label className="flex items-center justify-center rounded-lg border-2 border-dashed border-amber-400/30 hover:border-amber-400/60 aspect-square cursor-pointer transition-colors">
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  {uploadingImage ? <Loader2 className="w-6 h-6 text-amber-400/50 animate-spin" /> : <ImagePlus className="w-6 h-6 text-amber-400/50" />}
                </label>
              )}
            </div>
          )}
        </div>

        {/* Lightbox */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white"
              onClick={() => setLightboxUrl(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={lightboxUrl}
              alt="Imagen ampliada"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default CaseDetailPage;