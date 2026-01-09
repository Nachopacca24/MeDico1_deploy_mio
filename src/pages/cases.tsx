// src/pages/cases.tsx

import { useEffect, useState, useMemo } from "react";
import React from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { PopupAdManager } from "@/shared/components/ads/PopupAdManager";
import { MobilePopupAd } from "@/shared/components/ads/MobilePopupAd";
import { StickyBannerAd } from "@/shared/components/ads/StickyBannerAd";
import { useAdSystem, useIsMobile } from "@/shared/hooks/useAdSystem";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import { notificationService } from "@/services/notificationService";
import { advertisementService, type ActiveAd } from "@/admin/services/advertisementService";
import { useToast } from "@/shared/hooks/useToast";
import { ReadOnlyBadge } from "@/pages/cases/ReadOnlyBadge";
import { InvitationCard } from "@/pages/cases/InvitationCard";
import type { SurgicalCase, AssistedCasesResponse } from "@/types/surgical-case";
import { Link } from "react-router-dom";
import { Loader2, Check } from 'lucide-react';
import {
  Briefcase,
  Plus,
  Calendar,
  Hospital,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Search,
  Filter,
  ExternalLink,
  Loader2 as LoaderIcon,
  Lock,
  UserCheck,
  Users,
  Bell
} from "lucide-react";

// Componente CaseStatusToggles inline
interface CaseStatusTogglesProps {
  surgicalCase: SurgicalCase;
  onUpdate: (updatedCase: SurgicalCase) => void;
  onError: (error: string) => void;
  compact?: boolean;
}

function CaseStatusToggles({ 
  surgicalCase, 
  onUpdate, 
  onError,
  compact = false 
}: CaseStatusTogglesProps) {
  const [updating, setUpdating] = useState<'operated' | 'billed' | 'paid' | null>(null);

  const isOperated = surgicalCase.is_operated ?? false;
  const isBilled = surgicalCase.is_billed ?? false;
  const isPaid = surgicalCase.is_paid ?? false;

  // Verificar si puede editar
  const canEdit = surgicalCase.can_edit ?? true;

  const handleToggle = async (
    type: 'operated' | 'billed' | 'paid',
    currentValue: boolean
  ) => {
    if (!canEdit) {
      onError('No tienes permisos para modificar este caso');
      return;
    }

    setUpdating(type);
    try {
      let updated: SurgicalCase;
      
      switch (type) {
        case 'operated':
          updated = await surgicalCaseService.toggleOperated(surgicalCase.id, !currentValue);
          break;
        case 'billed':
          if (!isOperated && !currentValue) {
            onError('Primero debe marcar la cirugía como operada');
            setUpdating(null);
            return;
          }
          updated = await surgicalCaseService.toggleBilled(surgicalCase.id, !currentValue);
          break;
        case 'paid':
          if (!isBilled && !currentValue) {
            onError('Primero debe marcar la cirugía como facturada');
            setUpdating(null);
            return;
          }
          updated = await surgicalCaseService.togglePaid(surgicalCase.id, !currentValue);
          break;
      }
      
      onUpdate(updated);
    } catch (error: any) {
      onError(error.message || `Error al actualizar ${type}`);
    } finally {
      setUpdating(null);
    }
  };

  const buttonSize = compact ? 'sm' : 'default';
  const iconSize = compact ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className={`flex ${compact ? 'gap-1' : 'gap-2'} flex-wrap`}>
      <Button
        variant={isOperated ? 'default' : 'outline'}
        size={buttonSize}
        onClick={() => handleToggle('operated', isOperated)}
        disabled={updating !== null || !canEdit}
        className={
          isOperated 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
        }
      >
        {updating === 'operated' && <Loader2 className={`${iconSize} animate-spin ${compact ? '' : 'mr-1.5'}`} />}
        {!updating && isOperated && <Check className={`${iconSize} ${compact ? '' : 'mr-1.5'}`} />}
        <span>Operado</span>
      </Button>

      <Button
        variant={isBilled ? 'default' : 'outline'}
        size={buttonSize}
        onClick={() => handleToggle('billed', isBilled)}
        disabled={updating !== null || (!isOperated && !isBilled) || !canEdit}
        className={
          isBilled 
            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
            : 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300'
        }
      >
        {updating === 'billed' && <Loader2 className={`${iconSize} animate-spin ${compact ? '' : 'mr-1.5'}`} />}
        {!updating && isBilled && <Check className={`${iconSize} ${compact ? '' : 'mr-1.5'}`} />}
        <span>Facturado</span>
      </Button>

      <Button
        variant={isPaid ? 'default' : 'outline'}
        size={buttonSize}
        onClick={() => handleToggle('paid', isPaid)}
        disabled={updating !== null || (!isBilled && !isPaid) || !canEdit}
        className={
          isPaid 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
        }
      >
        {updating === 'paid' && <Loader2 className={`${iconSize} animate-spin ${compact ? '' : 'mr-1.5'}`} />}
        {!updating && isPaid && <Check className={`${iconSize} ${compact ? '' : 'mr-1.5'}`} />}
        <span>Cobrado</span>
      </Button>
    </div>
  );
}

const CasesPage = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const adSettings = useAdSystem(isMobile);

  const [cases, setCases] = useState<SurgicalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Estado para invitaciones
  const [invitations, setInvitations] = useState<AssistedCasesResponse>({
    pending_invitations: [],
    accepted_cases: [],
    total_pending: 0,
    total_accepted: 0,
  });
  const [loadingInvitations, setLoadingInvitations] = useState(true);

  const [sidebarAds, setSidebarAds] = useState<ActiveAd[]>([]);
  const [betweenContentAds, setBetweenContentAds] = useState<ActiveAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [currentSidebarAdIndex, setCurrentSidebarAdIndex] = useState(0);

  useEffect(() => {
    fetchCases();
    fetchInvitations();
    loadAds();
  }, []);

  useEffect(() => {
    if (sidebarAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSidebarAdIndex((prev) => (prev + 1) % sidebarAds.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [sidebarAds.length]);

  const fetchInvitations = async () => {
    try {
      setLoadingInvitations(true);
      const data = await surgicalCaseService.getAssistedCases();
      setInvitations(data);
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleInvitationAccepted = (caseId: number) => {
    const acceptedCase = invitations.pending_invitations.find(c => c.id === caseId);
    if (acceptedCase) {
      setInvitations({
        pending_invitations: invitations.pending_invitations.filter(c => c.id !== caseId),
        accepted_cases: [...invitations.accepted_cases, { ...acceptedCase, assistant_accepted: true }],
        total_pending: invitations.total_pending - 1,
        total_accepted: invitations.total_accepted + 1,
      });
      // Refrescar casos
      fetchCases();
      toast.success('Invitación aceptada', 'El caso ahora aparece en tu lista');
    }
  };

  const handleInvitationRejected = (caseId: number) => {
    setInvitations({
      ...invitations,
      pending_invitations: invitations.pending_invitations.filter(c => c.id !== caseId),
      total_pending: invitations.total_pending - 1,
    });
    toast.info('Invitación rechazada', 'El médico principal será notificado');
  };

  const loadAds = async () => {
    try {
      setLoadingAds(true);
      const promises = [];
      
      if (adSettings.showSidebarAds) {
        promises.push(advertisementService.getActiveAds('sidebar'));
      }
      if (adSettings.showBetweenContent) {
        promises.push(advertisementService.getActiveAds('between_content'));
      }

      const results = await Promise.all(promises);
      
      let resultIndex = 0;
      if (adSettings.showSidebarAds) {
        setSidebarAds(results[resultIndex] || []);
        resultIndex++;
      }
      if (adSettings.showBetweenContent) {
        setBetweenContentAds(results[resultIndex] || []);
      }
    } catch (error) {
      console.error('Error loading ads:', error);
    } finally {
      setLoadingAds(false);
    }
  };

  const handleAdClick = async (ad: ActiveAd) => {
    try {
      await advertisementService.trackClick(ad.id);
      window.open(ad.redirect_url, ad.open_in_new_tab ? '_blank' : '_self');
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  useEffect(() => {
    if (sidebarAds.length > 0 && sidebarAds[currentSidebarAdIndex]) {
      advertisementService.trackImpression(sidebarAds[currentSidebarAdIndex].id);
    }
  }, [currentSidebarAdIndex, sidebarAds]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await surgicalCaseService.getCases();
      setCases(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar casos');
      toast.error('Error', 'No se pudieron cargar los casos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, patientName: string) => {
    const caseToDelete = cases.find(c => c.id === id);
    
    if (caseToDelete) {
      // Verificar si puede editar
      if (!surgicalCaseService.canEdit(caseToDelete)) {
        toast.error(
          'No se puede eliminar',
          'No tienes permisos para eliminar este caso'
        );
        return;
      }

      const canDeleteCheck = surgicalCaseService.canDelete(caseToDelete);
      
      if (!canDeleteCheck.allowed) {
        toast.error(
          'No se puede eliminar',
          canDeleteCheck.reason || 'Esta cirugía no puede ser eliminada'
        );
        return;
      }
    }
    
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el caso de ${patientName}?\n\nEsta acción no se puede deshacer.`
    );
    
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await surgicalCaseService.deleteCase(id);
      notificationService.cancelNotification(id);
      setCases(cases.filter(c => c.id !== id));
      toast.success('Caso eliminado', `El caso de ${patientName} fue eliminado exitosamente`);
    } catch (err: any) {
      toast.error('Error', 'No se pudo eliminar el caso');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCaseUpdate = (updatedCase: SurgicalCase) => {
    setCases(cases.map(c => c.id === updatedCase.id ? updatedCase : c));
    toast.success('Actualizado', 'Estado actualizado correctamente');
  };

  const handleCaseError = (error: string) => {
    toast.error('Error', error);
  };

  const filteredCases = useMemo(() => {
    return cases.filter(case_ => {
      const matchesSearch = searchQuery === "" || 
        case_.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        case_.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        case_.hospital_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || case_.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [cases, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { style: string }> = {
      scheduled: { style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
      completed: { style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
      billed: { style: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
      paid: { style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
      cancelled: { style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    };

    const { style } = config[status] || config.scheduled;

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${style}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const SidebarAd = () => {
    if (!adSettings.showSidebarAds || !sidebarAds.length || loadingAds) return null;
    const ad = sidebarAds[currentSidebarAdIndex];

    return (
      <div className="sticky top-6">
        <Card className="overflow-hidden border-silver-200 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Sponsored</span>
              {sidebarAds.length > 1 && (
                <span className="text-xs bg-slate-600 text-white px-2 py-0.5 rounded-full font-medium">
                  {currentSidebarAdIndex + 1}/{sidebarAds.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div 
              className="relative cursor-pointer group"
              onClick={() => handleAdClick(ad)}
            >
              <img
                src={ad.image_url}
                alt={ad.image_alt_text || ad.title || 'Advertisement'}
                className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                <ExternalLink className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 h-6 w-6" />
              </div>
            </div>
            {ad.title && (
              <div className="p-3">
                <p className="text-sm font-medium text-center">{ad.title}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const BetweenContentAd = ({ index }: { index: number }) => {
    if (!adSettings.showBetweenContent || !betweenContentAds.length) return null;
    const ad = betweenContentAds[index % betweenContentAds.length];

    useEffect(() => {
      advertisementService.trackImpression(ad.id);
    }, [ad.id]);

    return (
      <Card 
        className="col-span-full overflow-hidden border-silver-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 cursor-pointer hover:shadow-lg transition-all group"
        onClick={() => handleAdClick(ad)}
      >
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-shrink-0">
              <img
                src={ad.image_url}
                alt={ad.image_alt_text || ad.title || 'Advertisement'}
                className="w-full sm:w-32 h-32 object-cover rounded-lg"
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                  Sponsored
                </span>
              </div>
              {ad.title && (
                <h3 className="font-semibold text-lg mb-1">{ad.title}</h3>
              )}
              <p className="text-sm text-muted-foreground">Click para más información</p>
            </div>
            <ExternalLink className="text-muted-foreground group-hover:text-primary transition-colors h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Error al cargar casos</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={fetchCases}>Intentar de nuevo</Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pb-4">
        <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold mb-1 tracking-tight">Casos Quirúrgicos</h1>
              <p className="text-muted-foreground text-sm">
                {filteredCases.length} de {cases.length} caso{cases.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/cases/new">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Caso
              </Link>
            </Button>
          </div>

          {/* SECCIÓN DE INVITACIONES PENDIENTES */}
          {!loadingInvitations && invitations.total_pending > 0 && (
            <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-600" />
                    <CardTitle className="text-lg">
                      Invitaciones Pendientes
                    </CardTitle>
                    <Badge variant="destructive">
                      {invitations.total_pending}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  Tienes {invitations.total_pending} invitación{invitations.total_pending !== 1 ? 'es' : ''} para colaborar como médico ayudante
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {invitations.pending_invitations.map((invitation) => (
                    <InvitationCard
                      key={invitation.id}
                      case={invitation}
                      onAccept={handleInvitationAccepted}
                      onReject={handleInvitationRejected}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {cases.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar por paciente, ID o hospital..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === "scheduled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("scheduled")}
                >
                  Programados
                </Button>
                <Button
                  variant={statusFilter === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("completed")}
                >
                  Completados
                </Button>
                <Button
                  variant={statusFilter === "paid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("paid")}
                >
                  Pagados
                </Button>
              </div>
            </div>
          )}

          {cases.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Briefcase className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  No hay casos aún
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-6 text-center max-w-md">
                  Comienza creando tu primer caso quirúrgico
                </p>
                <Button asChild size="lg">
                  <Link to="/cases/new">
                    <Plus className="w-5 h-5 mr-2" />
                    Crear Primer Caso
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : filteredCases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Filter className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No se encontraron casos</h3>
                <p className="text-muted-foreground text-center">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCases.map((surgicalCase, index) => {
                const canEdit = surgicalCase.can_edit ?? true;
                const isOwner = surgicalCase.is_owner ?? true;
                
                return (
                  <React.Fragment key={`case-${surgicalCase.id}`}>
                    <Card className="hover:border-primary transition-colors">
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <CardTitle className="text-lg font-semibold">{surgicalCase.patient_name}</CardTitle>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(surgicalCase.status)}
                          </div>
                        </div>
                        {!isOwner && (
                          <div className="mb-2">
                            <ReadOnlyBadge />
                          </div>
                        )}
                        <CardDescription className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg">
                              <Calendar className="w-4 h-4 text-blue-500" />
                            </div>
                            <span>{new Date(surgicalCase.surgery_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-base">
                            <div className="p-1.5 bg-purple-500/10 rounded-lg">
                              <Hospital className="w-4 h-4 text-purple-500" />
                            </div>
                            <span className="truncate">{surgicalCase.hospital_name}</span>
                          </div>
                          {!isOwner && surgicalCase.created_by_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 bg-orange-500/10 rounded-lg">
                              <Users className="w-4 h-4 text-orange-500" />
                            </div>
                             <span className="text-xs">
                              De: <span className="font-semibold text-blue-600 dark:text-blue-400">{surgicalCase.created_by_name}</span>
                            </span>
                          </div>
                        )}
                        
                        {/* Mostrar estado del ayudante si soy el dueño */}
                        {isOwner && surgicalCase.assistant_display_name && surgicalCase.assistant_display_name !== "Sin ayudante" && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 bg-teal-500/10 rounded-lg">
                              <Users className="w-4 h-4 text-teal-500" />
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs truncate">Ayudante: {surgicalCase.assistant_display_name}</span>
                              {surgicalCase.assistant_accepted === true ? (
                                <Badge variant="default" className="bg-green-600 text-white text-xs">
                                  ✓ Aceptó
                                </Badge>
                              ) : surgicalCase.assistant_accepted === false ? (
                                <Badge variant="destructive" className="bg-red-600 text-white text-xs">
                                  ✗ Rechazó
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-yellow-600 text-white text-xs">
                                  ⏳ Pendiente
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {isOwner && (
                          <CaseStatusToggles
                            surgicalCase={surgicalCase}
                            onUpdate={handleCaseUpdate}
                            onError={handleCaseError}
                            compact={true}
                          />
                        )}

                       {/* Mostrar valores según si es dueño o ayudante */}
                        {isOwner ? (
                          // Vista completa para el dueño (con valor monetario)
                          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Procedimientos</div>
                              <div className="text-lg font-semibold">{surgicalCase.procedure_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">RVU Total</div>
                              <div className="text-lg font-semibold">{surgicalCase.total_rvu || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Valor</div>
                              <div className="text-lg font-semibold">
                                ${(surgicalCase.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Vista simplificada para el ayudante (sin valor monetario)
                          <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Procedimientos</div>
                              <div className="text-lg font-semibold">{surgicalCase.procedure_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">RVU Total</div>
                              <div className="text-lg font-semibold">{surgicalCase.total_rvu || 0}</div>
                            </div>
                          </div>
                        )}

                        {surgicalCase.primary_specialty && (
                          <div className="text-center py-2 border-t">
                            <span className="text-sm text-muted-foreground">
                              {surgicalCase.primary_specialty}
                            </span>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2 border-t">
                          <Button asChild variant="ghost" size="sm" className="flex-1">
                            <Link to={`/cases/${surgicalCase.id}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Link>
                          </Button>
                          {canEdit && (
                            <Button asChild variant="ghost" size="sm" className="flex-1">
                              <Link to={`/cases/${surgicalCase.id}/edit`}>
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Link>
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(surgicalCase.id, surgicalCase.patient_name)}
                              className="flex-1 hover:text-destructive"
                              disabled={deletingId === surgicalCase.id || !(surgicalCase.is_paid ?? false)}
                              title={!(surgicalCase.is_paid ?? false) ? 'Solo se puede eliminar después de cobrar' : 'Eliminar caso'}
                            >
                              {deletingId === surgicalCase.id ? (
                                <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                              ) : !(surgicalCase.is_paid ?? false) ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {(index + 1) % 6 === 0 && (
                      <BetweenContentAd index={Math.floor(index / 6)} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {!loadingAds && adSettings.showSidebarAds && sidebarAds.length > 0 && (
          <aside className="hidden xl:block w-80 flex-shrink-0">
            <SidebarAd />
          </aside>
        )}
      </div>
      </div>

      {adSettings.showPopups && (
        isMobile ? (
          <MobilePopupAd 
            initialDelay={adSettings.popupInitialDelay}
            interval={adSettings.popupInterval}
            maxPerSession={adSettings.popupMaxPerSession}
            style={adSettings.popupStyle}
          />
        ) : (
          <PopupAdManager 
            initialDelay={adSettings.popupInitialDelay}
            interval={adSettings.popupInterval}
            maxPerSession={adSettings.popupMaxPerSession}
          />
        )
      )}

      {adSettings.showStickyBanner && (
        <StickyBannerAd 
          position="bottom"
          dismissible={true}
        />
      )}
    </AppLayout>
  );
};

export default CasesPage;