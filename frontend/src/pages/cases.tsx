// src/pages/cases.tsx

import { useEffect, useState, useMemo } from "react";

const _trackedCaseAds = new Set<number>();
import React from "react";
import { AppLayout } from "@/shared/components/layout/AppLayout";
import { useAdSystem, useIsMobile } from "@/shared/hooks/useAdSystem";
import { CASE_INVITATIONS_EVENT } from "@/shared/hooks/useInvitationBadges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { useAuth } from "@/shared/contexts/AuthContext";
import { surgicalCaseService } from "@/services/surgicalCaseService";
import { notificationService } from "@/services/notificationService";
import { advertisementService, type ActiveAd } from "@/admin/services/advertisementService";
import { useToast } from "@/shared/hooks/useToast";
import { ReadOnlyBadge } from "@/pages/cases/ReadOnlyBadge";
import { InvitationCard } from "@/pages/cases/InvitationCard";
import { AnesthesiaInvitationCard } from "@/pages/cases/AnesthesiaInvitationCard";
import { anesthesiaService } from "@/services/anesthesiaService";
import type { SurgicalCase, AssistedCasesResponse } from "@/types/surgical-case";
import { displayPatientName } from "@/shared/utils/patientHash";
import { Link } from "react-router-dom";
import { Loader2, Check, Archive, Download, CheckSquare, Square, ImagePlus, Clock, LogOut } from 'lucide-react';
import { authService } from "@/shared/services/authService";
import { useIsUploading } from "@/shared/hooks/useUploadingCases";
import { APP_REFRESH_EVENT } from "@/shared/components/layout/AppLayout";

function UploadingBadge({ caseId }: { caseId: number }) {
  const uploading = useIsUploading(caseId);
  if (!uploading) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
      <Loader2 className="w-3 h-3 animate-spin" />
      Subiendo imágenes...
    </span>
  );
}

const API_URL = import.meta.env.VITE_API_URL || '';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import {
  Briefcase,
  Plus,
  Calendar,
  Hospital,
  Eye,
  Edit,
  AlertCircle,
  Search,
  Filter,
  ExternalLink,
  Loader2 as LoaderIcon,
  Users,
  Bell,
  Stethoscope,
  Trash2
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
  const [invoiceNumber, setInvoiceNumber] = useState(surgicalCase.invoice_number ?? '');
  const [savingInvoice, setSavingInvoice] = useState(false);

  useEffect(() => {
    setInvoiceNumber(surgicalCase.invoice_number ?? '');
  }, [surgicalCase.invoice_number]);

  const isOperated = surgicalCase.is_operated ?? false;
  const isBilled = surgicalCase.is_billed ?? false;
  const isPaid = surgicalCase.is_paid ?? false;

  // Verificar si puede editar
  const canEdit = surgicalCase.can_edit ?? true;

  const handleSaveInvoice = async () => {
    if (invoiceNumber === (surgicalCase.invoice_number ?? '')) return;
    setSavingInvoice(true);
    try {
      const updated = await surgicalCaseService.updateCase(surgicalCase.id, { invoice_number: invoiceNumber || null });
      onUpdate(updated);
    } catch {
      onError('Error al guardar el número de factura');
    } finally {
      setSavingInvoice(false);
    }
  };

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
    <div className="flex flex-col gap-2" data-tutorial="case-status">
      {/* Row 1: status toggles */}
      <div className={`flex ${compact ? 'gap-1' : 'gap-2'} flex-wrap`}>
        <Button
          variant={isOperated ? 'default' : 'outline'}
          size={buttonSize}
          onClick={() => handleToggle('operated', isOperated)}
          disabled={updating !== null || !canEdit}
          className={
            isOperated
              ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
              : 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-950 dark:hover:border-blue-500'
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
              ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
              : 'border-purple-300 text-purple-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-400 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-950 dark:hover:border-purple-500'
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
              ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
              : 'border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-400 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950 dark:hover:border-green-500'
          }
        >
          {updating === 'paid' && <Loader2 className={`${iconSize} animate-spin ${compact ? '' : 'mr-1.5'}`} />}
          {!updating && isPaid && <Check className={`${iconSize} ${compact ? '' : 'mr-1.5'}`} />}
          <span>Cobrado</span>
        </Button>
      </div>

      {/* Row 2: invoice number — only when billed */}
      {isBilled && canEdit && (
        <div className="flex items-center gap-1.5 mt-1">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="N° de factura"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveInvoice()}
            disabled={savingInvoice}
            className="flex-1 h-8 text-xs px-2 rounded border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <button
            onClick={handleSaveInvoice}
            disabled={savingInvoice || invoiceNumber === (surgicalCase.invoice_number ?? '')}
            className="h-8 w-8 flex items-center justify-center rounded border border-input bg-background hover:bg-accent disabled:opacity-40 transition-colors shrink-0"
            title="Guardar número de factura"
          >
            {savingInvoice
              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              : <Check className="w-3.5 h-3.5 text-green-600" />
            }
          </button>
        </div>
      )}

      {/* Row 3: Imágenes button — hidden when user is the anesthesiologist */}
      {isOperated && !surgicalCase.is_anesthesiologist && (
        <Link to={`/cases/${surgicalCase.id}#images`} className="w-full">
          <Button
            variant="outline"
            size={buttonSize}
            type="button"
            className="w-full border-amber-400/60 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400"
          >
            <ImagePlus className={`${iconSize} mr-1.5`} />
            <span>{compact ? 'Imágenes' : 'Subir imágenes de la cirugía'}</span>
          </Button>
        </Link>
      )}
    </div>
  );
}

// ── Toggles de estado para el anestesiólogo (independientes del cirujano) ──
interface AnesthesiaStatusTogglesProps {
  surgicalCase: SurgicalCase;
  onUpdate: (patch: { anesthesia_is_operated?: boolean; anesthesia_is_billed?: boolean; anesthesia_is_paid?: boolean; anesthesia_invoice_number?: string | null }) => void;
  onError: (msg: string) => void;
}

function AnesthesiaStatusToggles({ surgicalCase, onUpdate, onError }: AnesthesiaStatusTogglesProps) {
  const [updating, setUpdating] = useState<'operated' | 'billed' | 'paid' | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(surgicalCase.anesthesia_invoice_number ?? '');
  const [savingInvoice, setSavingInvoice] = useState(false);

  useEffect(() => {
    setInvoiceNumber(surgicalCase.anesthesia_invoice_number ?? '');
  }, [surgicalCase.anesthesia_invoice_number]);

  const isOperated = surgicalCase.anesthesia_is_operated ?? false;
  const isBilled   = surgicalCase.anesthesia_is_billed   ?? false;
  const isPaid     = surgicalCase.anesthesia_is_paid     ?? false;

  const handleToggle = async (type: 'operated' | 'billed' | 'paid', current: boolean) => {
    if (type === 'billed' && !isOperated && !current) { onError('Primero marca la anestesia como operada'); return; }
    if (type === 'paid'   && !isBilled   && !current) { onError('Primero marca la anestesia como facturada'); return; }
    setUpdating(type);
    try {
      const payload = {
        is_operated: type === 'operated' ? !current : isOperated,
        is_billed:   type === 'billed'   ? !current : isBilled,
        is_paid:     type === 'paid'     ? !current : isPaid,
      };
      await anesthesiaService.updateStatus(surgicalCase.id, payload);
      onUpdate({
        anesthesia_is_operated: payload.is_operated,
        anesthesia_is_billed:   payload.is_billed,
        anesthesia_is_paid:     payload.is_paid,
      });
    } catch (e: any) {
      onError(e.message || 'Error al actualizar estado');
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveInvoice = async () => {
    if (invoiceNumber === (surgicalCase.anesthesia_invoice_number ?? '')) return;
    setSavingInvoice(true);
    try {
      await anesthesiaService.updateStatus(surgicalCase.id, { invoice_number: invoiceNumber || null });
      onUpdate({ anesthesia_invoice_number: invoiceNumber || null });
    } catch (e: any) {
      onError(e.message || 'Error al guardar factura');
    } finally {
      setSavingInvoice(false);
    }
  };

  return (
    <div className="flex flex-col gap-2" data-tutorial="anesthesia-status">
      <div className="flex gap-1 flex-wrap">
        <Button variant={isOperated ? 'default' : 'outline'} size="sm"
          onClick={() => handleToggle('operated', isOperated)} disabled={updating !== null}
          className={isOperated
            ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
            : 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-950'}>
          {updating === 'operated' ? <Loader2 className="w-3 h-3 animate-spin" /> : isOperated ? <Check className="w-3 h-3" /> : null}
          <span className={isOperated || updating === 'operated' ? 'ml-1' : ''}>Operado</span>
        </Button>
        <Button variant={isBilled ? 'default' : 'outline'} size="sm"
          onClick={() => handleToggle('billed', isBilled)} disabled={updating !== null || (!isOperated && !isBilled)}
          className={isBilled
            ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
            : 'border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-950'}>
          {updating === 'billed' ? <Loader2 className="w-3 h-3 animate-spin" /> : isBilled ? <Check className="w-3 h-3" /> : null}
          <span className={isBilled || updating === 'billed' ? 'ml-1' : ''}>Facturado</span>
        </Button>
        <Button variant={isPaid ? 'default' : 'outline'} size="sm"
          onClick={() => handleToggle('paid', isPaid)} disabled={updating !== null || (!isBilled && !isPaid)}
          className={isPaid
            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
            : 'border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950'}>
          {updating === 'paid' ? <Loader2 className="w-3 h-3 animate-spin" /> : isPaid ? <Check className="w-3 h-3" /> : null}
          <span className={isPaid || updating === 'paid' ? 'ml-1' : ''}>Cobrado</span>
        </Button>
      </div>

      {/* N° de factura — solo cuando está facturado */}
      {isBilled && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="N° de factura"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveInvoice()}
            disabled={savingInvoice}
            className="flex-1 h-8 text-xs px-2 rounded border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <button
            onClick={handleSaveInvoice}
            disabled={savingInvoice || invoiceNumber === (surgicalCase.anesthesia_invoice_number ?? '')}
            className="h-8 w-8 flex items-center justify-center rounded border border-input bg-background hover:bg-accent disabled:opacity-40 transition-colors shrink-0"
            title="Guardar número de factura"
          >
            {savingInvoice
              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              : <Check className="w-3.5 h-3.5 text-green-600" />}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Toggles de estado para el médico ayudante (independientes del cirujano) ──
interface AssistantStatusTogglesProps {
  surgicalCase: SurgicalCase;
  onUpdate: (patch: { assistant_is_operated_own?: boolean; assistant_is_billed_own?: boolean; assistant_is_paid_own?: boolean; assistant_invoice_number_own?: string | null }) => void;
  onError: (msg: string) => void;
}

function AssistantStatusToggles({ surgicalCase, onUpdate, onError }: AssistantStatusTogglesProps) {
  const [updating, setUpdating] = useState<'operated' | 'billed' | 'paid' | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(surgicalCase.assistant_invoice_number_own ?? '');
  const [savingInvoice, setSavingInvoice] = useState(false);

  useEffect(() => {
    setInvoiceNumber(surgicalCase.assistant_invoice_number_own ?? '');
  }, [surgicalCase.assistant_invoice_number_own]);

  const isOperated = surgicalCase.assistant_is_operated_own ?? false;
  const isBilled   = surgicalCase.assistant_is_billed_own   ?? false;
  const isPaid     = surgicalCase.assistant_is_paid_own     ?? false;

  const handleToggle = async (type: 'operated' | 'billed' | 'paid', current: boolean) => {
    if (type === 'billed' && !isOperated && !current) { onError('Primero marca como operado'); return; }
    if (type === 'paid'   && !isBilled   && !current) { onError('Primero marca como facturado'); return; }
    setUpdating(type);
    try {
      const payload = {
        assistant_is_operated: type === 'operated' ? !current : isOperated,
        assistant_is_billed:   type === 'billed'   ? !current : isBilled,
        assistant_is_paid:     type === 'paid'     ? !current : isPaid,
      };
      await surgicalCaseService.updateAssistantStatus(surgicalCase.id, payload);
      onUpdate({
        assistant_is_operated_own: payload.assistant_is_operated,
        assistant_is_billed_own:   payload.assistant_is_billed,
        assistant_is_paid_own:     payload.assistant_is_paid,
      });
    } catch (e: any) {
      onError(e.message || 'Error al actualizar estado');
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveInvoice = async () => {
    if (invoiceNumber === (surgicalCase.assistant_invoice_number_own ?? '')) return;
    setSavingInvoice(true);
    try {
      await surgicalCaseService.updateAssistantStatus(surgicalCase.id, { assistant_invoice_number: invoiceNumber || null });
      onUpdate({ assistant_invoice_number_own: invoiceNumber || null });
    } catch (e: any) {
      onError(e.message || 'Error al guardar factura');
    } finally {
      setSavingInvoice(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 flex-wrap">
        <Button variant={isOperated ? 'default' : 'outline'} size="sm"
          onClick={() => handleToggle('operated', isOperated)} disabled={updating !== null}
          className={isOperated
            ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
            : 'border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-950'}>
          {updating === 'operated' ? <Loader2 className="w-3 h-3 animate-spin" /> : isOperated ? <Check className="w-3 h-3" /> : null}
          <span className={isOperated || updating === 'operated' ? 'ml-1' : ''}>Operado</span>
        </Button>
        <Button variant={isBilled ? 'default' : 'outline'} size="sm"
          onClick={() => handleToggle('billed', isBilled)} disabled={updating !== null || (!isOperated && !isBilled)}
          className={isBilled
            ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
            : 'border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-950'}>
          {updating === 'billed' ? <Loader2 className="w-3 h-3 animate-spin" /> : isBilled ? <Check className="w-3 h-3" /> : null}
          <span className={isBilled || updating === 'billed' ? 'ml-1' : ''}>Facturado</span>
        </Button>
        <Button variant={isPaid ? 'default' : 'outline'} size="sm"
          onClick={() => handleToggle('paid', isPaid)} disabled={updating !== null || (!isBilled && !isPaid)}
          className={isPaid
            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
            : 'border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950'}>
          {updating === 'paid' ? <Loader2 className="w-3 h-3 animate-spin" /> : isPaid ? <Check className="w-3 h-3" /> : null}
          <span className={isPaid || updating === 'paid' ? 'ml-1' : ''}>Cobrado</span>
        </Button>
      </div>
      {isBilled && (
        <div className="flex items-center gap-1.5">
          <input
            type="text" inputMode="numeric" pattern="[0-9]*"
            placeholder="N° de factura"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveInvoice()}
            disabled={savingInvoice}
            className="flex-1 h-8 text-xs px-2 rounded border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <button onClick={handleSaveInvoice}
            disabled={savingInvoice || invoiceNumber === (surgicalCase.assistant_invoice_number_own ?? '')}
            className="h-8 w-8 flex items-center justify-center rounded border border-input bg-background hover:bg-accent disabled:opacity-40 transition-colors shrink-0">
            {savingInvoice ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /> : <Check className="w-3.5 h-3.5 text-green-600" />}
          </button>
        </div>
      )}
    </div>
  );
}

const FREE_CASE_LIMIT = 5;

const CasesPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const adSettings = useAdSystem(isMobile);
  const isFreePlan = !user?.has_premium_access;

  const [cases, setCases] = useState<SurgicalCase[]>([]);
  // Casos propios + asistidos aceptados cuentan para el límite del plan
  const countForLimit = cases.filter(c => c.is_owner !== false || c.assistant_accepted === true).length;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'activos' | 'facturados'>('activos');
  const [archivedCases, setArchivedCases] = useState<SurgicalCase[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  // Multi-select PDF export (premium only)
  const isPremium = user?.has_premium_access;
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exportingPdf, setExportingPdf] = useState(false);

  // Select mode para cobrados
  const [archivedSelectMode, setArchivedSelectMode] = useState(false);
  const [archivedSelectedIds, setArchivedSelectedIds] = useState<Set<number>>(new Set());
  const [exportingArchivedPdf, setExportingArchivedPdf] = useState(false);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const toggleArchivedSelect = (id: number) => {
    setArchivedSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleBulkExportPdf = async (ids: Set<number>, onDone: () => void) => {
    if (ids.size === 0) return;
    const isArchived = ids === archivedSelectedIds;
    if (isArchived) setExportingArchivedPdf(true); else setExportingPdf(true);
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/export-pdf/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ case_ids: Array.from(ids), include_factor: true }),
        }
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
      a.download = match ? match[1] : `cirugias_${ids.size}_casos.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      onDone();
    } catch (e: any) {
      toast.error(e.message || 'No se pudo generar el PDF');
    } finally {
      if (isArchived) setExportingArchivedPdf(false); else setExportingPdf(false);
    }
  };

  // Estado para invitaciones de ayudante
  const [invitations, setInvitations] = useState<AssistedCasesResponse>({
    pending_invitations: [],
    accepted_cases: [],
    total_pending: 0,
    total_accepted: 0,
  });
  const [loadingInvitations, setLoadingInvitations] = useState(true);

  // Estado para invitaciones de anestesia
  const [anesthesiaInvitations, setAnesthesiaInvitations] = useState<SurgicalCase[]>([]);
  const [loadingAnesthesiaInv, setLoadingAnesthesiaInv] = useState(true);

  const [sidebarAds, setSidebarAds] = useState<ActiveAd[]>([]);
  const [betweenContentAds, setBetweenContentAds] = useState<ActiveAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [currentSidebarAdIndex, setCurrentSidebarAdIndex] = useState(0);

  useEffect(() => {
    const onRefresh = () => {
      fetchCases();
      fetchInvitations();
      fetchAnesthesiaInvitations();
      window.dispatchEvent(new CustomEvent(CASE_INVITATIONS_EVENT));
    };
    window.addEventListener(APP_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(APP_REFRESH_EVENT, onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    fetchCases();
    fetchInvitations();
    fetchAnesthesiaInvitations();
    loadAds();
    window.dispatchEvent(new CustomEvent(CASE_INVITATIONS_EVENT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      data.pending_invitations = data.pending_invitations.map(c => ({
        ...c,
        patient_name: c.patient_name_for_assistant || c.patient_name,
      }));
      data.accepted_cases = data.accepted_cases.map(c => ({
        ...c,
        patient_name: c.patient_name_for_assistant || c.patient_name,
      }));
      setInvitations(data);
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const fetchAnesthesiaInvitations = async () => {
    try {
      setLoadingAnesthesiaInv(true);
      const data = await anesthesiaService.getPendingInvitations();
      setAnesthesiaInvitations(data.pending_invitations.map(c => ({
        ...c,
        patient_name: c.patient_name_for_assistant || c.patient_name,
      })));
    } catch {
      // silencioso
    } finally {
      setLoadingAnesthesiaInv(false);
    }
  };

  const handleAnesthesiaAccepted = (caseId: number) => {
    setAnesthesiaInvitations(prev => prev.filter(c => c.id !== caseId));
    fetchCases();
  };

  const handleAnesthesiaRejected = (caseId: number) => {
    setAnesthesiaInvitations(prev => prev.filter(c => c.id !== caseId));
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
      // Refrescar para reflejar el caso aceptado en la lista principal
      fetchCases();
    }
  };

  const handleInvitationRejected = (caseId: number) => {
    // Quitar de invitaciones pendientes
    setInvitations(prev => ({
      ...prev,
      pending_invitations: prev.pending_invitations.filter(c => c.id !== caseId),
      total_pending: prev.total_pending - 1,
    }));
    // Quitar también de la lista principal de casos
    setCases(prev => prev.filter(c => c.id !== caseId));
  };

  const loadAds = async () => {
    try {
      setLoadingAds(true);
      const [sidebar, between] = await Promise.all([
        advertisementService.getActiveAds('sidebar'),
        advertisementService.getActiveAds('between_content'),
      ]);
      setSidebarAds(sidebar || []);
      setBetweenContentAds(between || []);
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

  const fetchArchivedCases = async () => {
    try {
      setLoadingArchived(true);
      const data = await surgicalCaseService.getCases({ archived: true });
      setArchivedCases(data);
    } catch (err: any) {
      toast.error('Error', 'No se pudieron cargar los casos facturados');
    } finally {
      setLoadingArchived(false);
    }
  };

  const handleTabChange = (value: string) => {
    const tab = value as 'activos' | 'facturados';
    setActiveTab(tab);
    if (tab === 'facturados' && archivedCases.length === 0) {
      fetchArchivedCases();
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
      `¿Estás seguro de eliminar el caso ${patientName}?\n\nEsta acción no se puede deshacer.`
    );
    
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await surgicalCaseService.deleteCase(id);
      notificationService.cancelNotification(id);
      setCases(cases.filter(c => c.id !== id));
      toast.success('Caso eliminado', `El caso ${patientName} fue eliminado exitosamente`);
    } catch (err: any) {
      toast.error('Error', 'No se pudo eliminar el caso');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCaseUpdate = (updatedCase: SurgicalCase) => {
    const existingCase = cases.find(c => c.id === updatedCase.id);
    const justBecamePaid = updatedCase.is_paid && !existingCase?.is_paid;
    // Preserve patient fields from the already-loaded case — toggle operations don't change them
    const merged: SurgicalCase = existingCase
      ? { ...updatedCase, patient_name: existingCase.patient_name, patient_id: existingCase.patient_id }
      : updatedCase;

    if (justBecamePaid) {
      setCases(prev => prev.filter(c => c.id !== updatedCase.id));
      setArchivedCases([]);
      toast.success('Caso cobrado', 'El caso se movió a la pestaña Cobrados y se eliminará en 6 meses');
    } else {
      setCases(prev => prev.map(c => c.id === updatedCase.id ? merged : c));
      const isInvoiceOnlyUpdate = updatedCase.invoice_number !== existingCase?.invoice_number;
      if (!isInvoiceOnlyUpdate) {
        toast.success('Actualizado', 'Estado actualizado correctamente');
      }
    }
  };

  const handleAnesthesiaStatusUpdate = (
    caseId: number,
    patch: { anesthesia_is_operated?: boolean; anesthesia_is_billed?: boolean; anesthesia_is_paid?: boolean; anesthesia_invoice_number?: string | null }
  ) => {
    if ('anesthesia_invoice_number' in patch) {
      // Actualización silenciosa del número de factura
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, ...patch } : c));
      return;
    }
    const justBecamePaid = patch.anesthesia_is_paid === true;
    if (justBecamePaid) {
      // Sacar de la lista activa — el backend ya no lo devuelve como activo
      setCases(prev => prev.filter(c => c.id !== caseId));
      setArchivedCases([]); // forzar recarga del tab cobrados
      toast.success('Anestesia cobrada', 'Tu honorario de anestesia pasó a Cobrados');
    } else {
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, ...patch } : c));
      toast.success('Actualizado', 'Estado actualizado correctamente');
    }
  };

  const handleAssistantStatusUpdate = (
    caseId: number,
    patch: { assistant_is_operated_own?: boolean; assistant_is_billed_own?: boolean; assistant_is_paid_own?: boolean; assistant_invoice_number_own?: string | null }
  ) => {
    if ('assistant_invoice_number_own' in patch) {
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, ...patch } : c));
      return;
    }
    const justBecamePaid = patch.assistant_is_paid_own === true;
    if (justBecamePaid) {
      setCases(prev => prev.filter(c => c.id !== caseId));
      setArchivedCases([]);
      toast.success('Ayudantía cobrada', 'Tu honorario de ayudante pasó a Cobrados');
    } else {
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, ...patch } : c));
      toast.success('Actualizado', 'Estado actualizado correctamente');
    }
  };

  const handleDismissRemoval = async (caseId: number) => {
    try {
      await surgicalCaseService.dismissRemoval(caseId);
      setCases(prev => prev.filter(c => c.id !== caseId));
    } catch (e: any) {
      toast.error('Error', e.message || 'No se pudo descartar la notificación');
    }
  };

  const handleLeaveCase = async (caseId: number, role: 'assistant' | 'anesthesiologist') => {
    try {
      await surgicalCaseService.leaveCase(caseId);
      setCases(prev => prev.filter(c => c.id !== caseId));
      const msg = role === 'anesthesiologist' ? 'Saliste del caso como anestesiólogo' : 'Saliste del caso como ayudante';
      toast.success('Saliste del caso', msg);
    } catch (e: any) {
      toast.error('Error', e.message || 'No se pudo salir del caso');
    }
  };

  const handleCaseError = (error: string) => {
    toast.error('Error', error);
  };

  const filteredCases = useMemo(() => {
    return cases.filter(case_ => {
      return searchQuery === "" ||
        case_.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        case_.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        case_.hospital_name?.toLowerCase().includes(searchQuery.toLowerCase());
    }).sort((a, b) => {
      const diff = new Date(a.surgery_date).getTime() - new Date(b.surgery_date).getTime();
      return sortOrder === 'asc' ? diff : -diff;
    });
  }, [cases, searchQuery, sortOrder]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { style: string; label: string }> = {
      scheduled:  { style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',       label: 'Programada'  },
      completed:  { style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',   label: 'Completada'  },
      billed:     { style: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', label: 'Facturada' },
      paid:       { style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', label: 'Cobrada' },
      cancelled:  { style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',           label: 'Cancelada'   },
    };

    const { style, label } = config[status] || config.scheduled;

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${style}`}>
        {label}
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
              <span className="text-xs font-medium text-muted-foreground">Patrocinado</span>
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
    const ad = betweenContentAds.length
      ? betweenContentAds[index % betweenContentAds.length]
      : null;

    useEffect(() => {
      if (!ad || !adSettings.showBetweenContent) return;
      if (_trackedCaseAds.has(ad.id)) return;
      _trackedCaseAds.add(ad.id);
      advertisementService.trackImpression(ad.id);
    }, [ad?.id, adSettings.showBetweenContent]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!adSettings.showBetweenContent || !ad) return null;

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
                  Patrocinado
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
              <h1 className="text-2xl sm:text-3xl font-semibold mb-1 tracking-tight">Mis Cirugías</h1>
              {activeTab === 'activos' && (
                <p className="text-muted-foreground text-sm">
                  {filteredCases.length} de {cases.length} caso{cases.length !== 1 ? 's' : ''} activos
                  {isFreePlan && (
                    <span className={`ml-2 font-medium ${countForLimit >= FREE_CASE_LIMIT ? 'text-destructive' : 'text-muted-foreground'}`}>
                      · {countForLimit}/{FREE_CASE_LIMIT} (plan gratuito)
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Multi-select PDF — visible siempre, activo solo para premium */}
              {cases.length > 0 && (
                !isPremium ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-muted/40 opacity-60 cursor-not-allowed select-none">
                    <Download className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Exportar PDF</span>
                    <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-medium ml-1">Premium</span>
                  </div>
                ) : selectMode ? (
                  <div className="flex items-center gap-2">
                    {selectedIds.size > 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleBulkExportPdf(selectedIds, () => { setSelectMode(false); setSelectedIds(new Set()); })}
                        disabled={exportingPdf}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold"
                      >
                        {exportingPdf
                          ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          : <Download className="w-4 h-4 mr-1" />
                        }
                        Exportar {selectedIds.size} PDF{selectedIds.size !== 1 ? 's' : ''}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setSelectMode(true)}
                    className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10">
                    <CheckSquare className="w-4 h-4 mr-1" />
                    Exportar PDF
                  </Button>
                )
              )}

              {isFreePlan && countForLimit >= FREE_CASE_LIMIT ? (
                user?.specialty === 'Anestesiología' ? null : (
                  <div className="flex flex-col items-end gap-1">
                    <Button disabled className="opacity-60 cursor-not-allowed">
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Cirugía
                    </Button>
                    <span className="text-xs text-destructive">Durante tu prueba operaste sin límites · Reactiva Premium</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2">
                  {user?.specialty === 'Anestesiología' && (
                    <Button asChild variant="outline" data-tutorial="new-anesthesia-btn">
                      <Link to="/cases/new/anesthesia">
                        <Stethoscope className="w-4 h-4 mr-2" />
                        Nueva Anestesia
                      </Link>
                    </Button>
                  )}
                  {user?.specialty !== 'Anestesiología' && (
                    <Button asChild data-tutorial="new-case-btn">
                      <Link to="/cases/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Cirugía
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-2">
              <TabsTrigger value="activos">
                Activos
                {cases.length > 0 && (
                  <span className="ml-2 text-xs bg-primary/20 text-primary rounded-full px-1.5 py-0.5">
                    {cases.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="facturados">
                <Archive className="w-3.5 h-3.5 mr-1.5" />
                Cobrados
                {archivedCases.length > 0 && (
                  <span className="ml-2 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                    {archivedCases.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activos" className="space-y-6 mt-0">

          {/* SECCIÓN DE INVITACIONES PENDIENTES — AYUDANTE */}
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

          {/* SECCIÓN DE INVITACIONES PENDIENTES — ANESTESIA */}
          {!loadingAnesthesiaInv && anesthesiaInvitations.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20" data-tutorial="anesthesia-invitations">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-600" />
                  <CardTitle className="text-lg">Invitaciones de Anestesia</CardTitle>
                  <Badge variant="destructive">{anesthesiaInvitations.length}</Badge>
                </div>
                <CardDescription>
                  Tienes {anesthesiaInvitations.length} invitación{anesthesiaInvitations.length !== 1 ? 'es' : ''} para colaborar como anestesiólogo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {anesthesiaInvitations.map((inv) => (
                    <AnesthesiaInvitationCard
                      key={inv.id}
                      case={inv}
                      onAccept={handleAnesthesiaAccepted}
                      onReject={handleAnesthesiaRejected}
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
              <div className="flex gap-2">
                <Button
                  variant={sortOrder === "asc" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortOrder("asc")}
                >
                  Más cercana
                </Button>
                <Button
                  variant={sortOrder === "desc" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortOrder("desc")}
                >
                  Más lejana
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
                const isAnesthesiologist = surgicalCase.is_anesthesiologist ?? false;
                const isAssistant = !isOwner && !isAnesthesiologist;
                const wasRemovedAs = surgicalCase.was_removed_as ?? null;

                // Card especial cuando el cirujano reemplazó a este colaborador
                if (wasRemovedAs) {
                  const roleLabel = wasRemovedAs === 'anesthesiologist' ? 'anestesiólogo' : 'médico ayudante';
                  const borderColor = wasRemovedAs === 'anesthesiologist' ? 'border-l-teal-500' : 'border-l-orange-400';
                  return (
                    <React.Fragment key={`case-${surgicalCase.id}`}>
                      <Card className={`border-l-4 ${borderColor} overflow-hidden opacity-80`}>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 border-b ${wasRemovedAs === 'anesthesiologist' ? 'bg-teal-500/10 border-teal-200 dark:border-teal-800/50' : 'bg-orange-500/10 border-orange-200 dark:border-orange-800/50'}`}>
                          <AlertCircle className={`w-3 h-3 shrink-0 ${wasRemovedAs === 'anesthesiologist' ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`} />
                          <span className={`text-xs font-semibold ${wasRemovedAs === 'anesthesiologist' ? 'text-teal-700 dark:text-teal-300' : 'text-orange-700 dark:text-orange-300'}`}>
                            Ya no participás como {roleLabel}
                          </span>
                        </div>
                        <CardContent className="p-3 space-y-2">
                          <p className="text-sm font-bold">{displayPatientName(surgicalCase.patient_name)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(surgicalCase.surgery_date + 'T12:00:00').toLocaleDateString()} · {surgicalCase.hospital_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            El médico principal te cambió de {roleLabel} en este caso.
                          </p>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full mt-1"
                            onClick={() => handleDismissRemoval(surgicalCase.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Eliminar de mi lista
                          </Button>
                        </CardContent>
                      </Card>
                    </React.Fragment>
                  );
                }

                // Color del borde: celeste=cirugía propia, teal=colaborando como anestesiólogo, naranja=ayudante, primary=cirujano
                const roleBorderClass = isAnesthesiologist && isOwner
                  ? 'border-l-sky-400'
                  : isAnesthesiologist
                    ? 'border-l-teal-500'
                    : isAssistant
                      ? 'border-l-orange-400'
                      : 'border-l-primary';

                return (
                  <React.Fragment key={`case-${surgicalCase.id}`}>
                    <Card
                    className={`hover:border-primary transition-colors border-border/70 border-l-4 ${roleBorderClass} overflow-hidden ${selectMode && isOwner ? 'cursor-pointer' : ''} ${selectMode && selectedIds.has(surgicalCase.id) ? 'border-amber-400 ring-1 ring-amber-400 border-l-amber-400' : ''}`}
                    onClick={selectMode && isOwner ? () => toggleSelect(surgicalCase.id) : undefined}
                  >
                      {/* Franja de rol */}
                      {isAnesthesiologist && !isOwner && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 border-b border-teal-200 dark:border-teal-800/50">
                          <Stethoscope className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                          <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">Colaborando como Anestesiólogo</span>
                        </div>
                      )}
                      {isAnesthesiologist && isOwner && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 border-b border-sky-200 dark:border-sky-800/50">
                          <Stethoscope className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                          <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">Tu Cirugía · Anestesiólogo</span>
                        </div>
                      )}
                      {isOwner && !isAnesthesiologist && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 border-b border-sky-200 dark:border-sky-800/50">
                          <Briefcase className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                          <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">Tu Cirugía</span>
                        </div>
                      )}
                      {isAssistant && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border-b border-orange-200 dark:border-orange-800/50">
                          <Users className="w-3 h-3 text-orange-600 dark:text-orange-400 shrink-0" />
                          <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Colaborando como Ayudante</span>
                        </div>
                      )}

                      <CardHeader className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm font-bold">{displayPatientName(surgicalCase.patient_name)}</CardTitle>
                            <UploadingBadge caseId={surgicalCase.id} />
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {selectMode && isOwner && (
                              selectedIds.has(surgicalCase.id)
                                ? <CheckSquare className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            )}
                            {isOwner && surgicalCase.assistant_doctor && surgicalCase.assistant_accepted !== true && surgicalCase.assistant_accepted !== false && (
                              <Badge className="bg-yellow-600 text-white text-xs shrink-0 whitespace-nowrap">⏳</Badge>
                            )}
                            {isOwner && getStatusBadge(surgicalCase.status)}
                          </div>
                        </div>
                        <CardDescription className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="p-1 bg-blue-500/10 rounded">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            </div>
                            <span>{new Date(surgicalCase.surgery_date + 'T12:00:00').toLocaleDateString()}</span>
                            {surgicalCase.surgery_time && (
                              <span className="text-muted-foreground">{surgicalCase.surgery_time.slice(0, 5)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="p-1 bg-purple-500/10 rounded">
                              <Hospital className="w-3.5 h-3.5 text-purple-500" />
                            </div>
                            <span className="truncate">{surgicalCase.hospital_name}</span>
                          </div>
                          {/* Cirujano — siempre visible */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="p-1 bg-orange-500/10 rounded">
                              <Users className="w-3.5 h-3.5 text-orange-500" />
                            </div>
                            <span className="truncate">
                              Cirujano: <span className="font-semibold text-foreground">{surgicalCase.created_by_name ?? 'N/A'}</span>
                            </span>
                          </div>

                          {/* Ayudante — siempre visible */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="p-1 bg-teal-500/10 rounded">
                              <Users className="w-3.5 h-3.5 text-teal-500" />
                            </div>
                            {surgicalCase.assistant_display_name && surgicalCase.assistant_display_name !== 'Sin ayudante' ? (
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="truncate min-w-0">Ayud: <span className="font-semibold text-foreground">{surgicalCase.assistant_display_name}</span></span>
                                {surgicalCase.assistant_accepted === true && (
                                  <Badge variant="default" className="bg-green-600 text-white text-xs shrink-0">✓</Badge>
                                )}
                                {surgicalCase.assistant_accepted === false && (
                                  <Badge variant="destructive" className="bg-red-600 text-white text-xs shrink-0">✗</Badge>
                                )}
                                {surgicalCase.assistant_accepted === null && surgicalCase.assistant_doctor && (
                                  <Badge className="bg-yellow-500 text-white text-xs shrink-0">⏳</Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Ayud: <span className="italic">N/A</span></span>
                            )}
                          </div>

                          {/* Anestesiólogo — siempre visible */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="p-1 bg-cyan-500/10 rounded">
                              <Users className="w-3.5 h-3.5 text-cyan-500" />
                            </div>
                            {surgicalCase.anesthesiologist_display ? (
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="truncate min-w-0">Anest: <span className="font-semibold text-foreground">{surgicalCase.anesthesiologist_display}</span></span>
                                {surgicalCase.anesthesiologist_accepted === true && !(isOwner && isAnesthesiologist) && (
                                  <Badge variant="default" className="bg-green-600 text-white text-xs shrink-0">✓</Badge>
                                )}
                                {surgicalCase.anesthesiologist_accepted === false && (
                                  <Badge variant="destructive" className="bg-red-600 text-white text-xs shrink-0">✗</Badge>
                                )}
                                {surgicalCase.anesthesiologist_accepted === null && (
                                  <Badge className="bg-yellow-500 text-white text-xs shrink-0">⏳</Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Anest: <span className="italic">N/A</span></span>
                            )}
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        {/* Estados según rol */}
                        {isAnesthesiologist ? (
                          <AnesthesiaStatusToggles
                            surgicalCase={surgicalCase}
                            onUpdate={(patch) => handleAnesthesiaStatusUpdate(surgicalCase.id, patch)}
                            onError={handleCaseError}
                          />
                        ) : isAssistant ? (
                          <AssistantStatusToggles
                            surgicalCase={surgicalCase}
                            onUpdate={(patch) => handleAssistantStatusUpdate(surgicalCase.id, patch)}
                            onError={handleCaseError}
                          />
                        ) : isOwner ? (
                          <CaseStatusToggles
                            surgicalCase={surgicalCase}
                            onUpdate={handleCaseUpdate}
                            onError={handleCaseError}
                            compact={true}
                          />
                        ) : null}

                        {isAnesthesiologist && surgicalCase.anesthesia_is_operated && (
                          <Link to={`/cases/${surgicalCase.id}/anesthesia#time`} onClick={e => e.stopPropagation()} className="w-full mt-1 block">
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              className="w-full border-teal-400/60 text-teal-600 hover:bg-teal-400/10 hover:border-teal-400 dark:text-teal-400"
                            >
                              <Clock className="w-3 h-3 mr-1.5" />
                              Agregar tiempos
                            </Button>
                          </Link>
                        )}

                        {isAnesthesiologist ? (
                          <div className="grid grid-cols-3 gap-1 text-center pt-1.5 border-t">
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">Cód.</div>
                              <div className="text-sm font-semibold">{surgicalCase.anesthesia_item_count ?? 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">Proc.</div>
                              <div className="text-sm font-semibold">{surgicalCase.procedure_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">Honorario</div>
                              <div className="text-sm font-bold text-teal-600 dark:text-teal-400">
                                {surgicalCase.anesthesia_total_fee != null
                                  ? `Q ${surgicalCase.anesthesia_total_fee.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                  : '—'}
                              </div>
                            </div>
                          </div>
                        ) : isOwner ? (
                          <div className="grid grid-cols-3 gap-1 text-center pt-1.5 border-t">
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">Proc.</div>
                              <div className="text-sm font-semibold">{surgicalCase.procedure_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">RVU</div>
                              <div className="text-sm font-semibold">{surgicalCase.total_rvu || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">Valor</div>
                              <div className="text-sm font-bold">
                                Q {(surgicalCase.total_value || 0).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1 text-center pt-1.5 border-t">
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">Proc.</div>
                              <div className="text-sm font-semibold">{surgicalCase.procedure_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">RVU</div>
                              <div className="text-sm font-semibold">{surgicalCase.total_rvu || 0}</div>
                            </div>
                          </div>
                        )}

                        {surgicalCase.primary_specialty && (
                          <div className="text-center py-1 border-t">
                            <span className="text-xs text-muted-foreground">
                              {surgicalCase.primary_specialty}
                            </span>
                          </div>
                        )}

                        <div className="flex gap-1 pt-1 border-t">
                          <Button asChild variant="ghost" size="sm" className="flex-1 h-8">
                            <Link to={`/cases/${surgicalCase.id}`}>
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Ver
                            </Link>
                          </Button>
                          {isAnesthesiologist && (
                            <Button asChild variant="ghost" size="sm" className="flex-1 h-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950">
                              <Link to={`/cases/${surgicalCase.id}/anesthesia`}>
                                <Stethoscope className="w-3.5 h-3.5 mr-1" />
                                Anestesia
                              </Link>
                            </Button>
                          )}
                          {canEdit && !surgicalCase.is_paid && (
                            <Button asChild variant="ghost" size="sm" className="flex-1 h-8">
                              <Link to={isOwner && isAnesthesiologist
                                ? `/cases/${surgicalCase.id}/edit/anesthesia`
                                : `/cases/${surgicalCase.id}/edit`}>
                                <Edit className="w-3.5 h-3.5 mr-1" />
                                Editar
                              </Link>
                            </Button>
                          )}
                          {(isAssistant || (isAnesthesiologist && !isOwner)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={e => { e.stopPropagation(); handleLeaveCase(surgicalCase.id, isAnesthesiologist ? 'anesthesiologist' : 'assistant'); }}
                            >
                              <LogOut className="w-3.5 h-3.5 mr-1" />
                              Salir
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
            </TabsContent>

            <TabsContent value="facturados" className="mt-0">
              {loadingArchived ? (
                <div className="flex items-center justify-center py-20">
                  <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : archivedCases.length === 0 ? (
                <Card className="border-2 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Archive className="w-20 h-20 text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                      Sin casos facturados
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-base text-center max-w-md">
                      Los casos que marques como cobrados aparecerán aquí. Se eliminan automáticamente a los 6 meses.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20 px-4 py-3 text-sm space-y-1">
                    <p className="font-medium text-amber-800 dark:text-amber-300">Retención automática de datos</p>
                    <p className="text-amber-700 dark:text-amber-400/80">
                      Las <span className="font-semibold">imágenes</span> se eliminan a los <span className="font-semibold">3 meses</span> de cobrar — exportá el PDF antes si querés conservarlas.
                    </p>
                    <p className="text-amber-700 dark:text-amber-400/80">
                      El <span className="font-semibold">caso completo</span> se elimina a los <span className="font-semibold">6 meses</span> de cobrar.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {archivedCases.length} caso{archivedCases.length !== 1 ? 's' : ''}
                    </p>
                    {isPremium && (
                      archivedSelectMode ? (
                        <div className="flex items-center gap-2">
                          {archivedSelectedIds.size > 0 && (
                            <Button
                              size="sm"
                              onClick={() => handleBulkExportPdf(archivedSelectedIds, () => { setArchivedSelectMode(false); setArchivedSelectedIds(new Set()); })}
                              disabled={exportingArchivedPdf}
                              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold"
                            >
                              {exportingArchivedPdf
                                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                : <Download className="w-4 h-4 mr-1" />
                              }
                              Exportar {archivedSelectedIds.size} PDF{archivedSelectedIds.size !== 1 ? 's' : ''}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => { setArchivedSelectMode(false); setArchivedSelectedIds(new Set()); }}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setArchivedSelectMode(true)}
                          className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10">
                          <CheckSquare className="w-4 h-4 mr-1" />
                          Exportar PDF
                        </Button>
                      )
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {archivedCases.map((surgicalCase) => {
                      const imagesPurgeDate = surgicalCase.images_purge_at ? new Date(surgicalCase.images_purge_at) : null;
                      const casePurgeDate   = surgicalCase.archived_at     ? new Date(new Date(surgicalCase.archived_at).getTime() + 180 * 24 * 60 * 60 * 1000) : null;
                      const now = new Date();
                      const imagesAlreadyPurged = imagesPurgeDate && imagesPurgeDate <= now;
                      return (
                      <Card
                        key={surgicalCase.id}
                        className={`opacity-80 hover:opacity-100 transition-opacity ${archivedSelectMode ? 'cursor-pointer' : ''} ${archivedSelectMode && archivedSelectedIds.has(surgicalCase.id) ? 'border-amber-400 ring-1 ring-amber-400 opacity-100' : ''}`}
                        onClick={archivedSelectMode ? () => toggleArchivedSelect(surgicalCase.id) : undefined}
                      >
                        <CardHeader className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <CardTitle className="text-sm font-bold">{displayPatientName(surgicalCase.patient_name)}</CardTitle>
                            <div className="flex items-center gap-1.5">
                              {archivedSelectMode && (
                                archivedSelectedIds.has(surgicalCase.id)
                                  ? <CheckSquare className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                  : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                Cobrado
                              </span>
                            </div>
                          </div>
                          <CardDescription className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className="p-1 bg-blue-500/10 rounded">
                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              </div>
                              <span>{new Date(surgicalCase.surgery_date + 'T12:00:00').toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                              <div className="p-1 bg-purple-500/10 rounded">
                                <Hospital className="w-3.5 h-3.5 text-purple-500" />
                              </div>
                              <span className="truncate">{surgicalCase.hospital_name}</span>
                            </div>
                            {surgicalCase.invoice_number && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-muted-foreground">Factura:</span>
                                <span className="font-medium">#{surgicalCase.invoice_number}</span>
                              </div>
                            )}
                            {(imagesPurgeDate || casePurgeDate) && (
                              <div className="text-xs mt-0.5 space-y-0.5">
                                {imagesPurgeDate && (
                                  imagesAlreadyPurged ? (
                                    <p className="text-muted-foreground">Imágenes eliminadas</p>
                                  ) : (
                                    <p className="text-amber-600 dark:text-amber-400">
                                      Imgs. eliminan el {imagesPurgeDate.toLocaleDateString()}
                                    </p>
                                  )
                                )}
                                {casePurgeDate && (
                                  <p className="text-muted-foreground">
                                    Caso elimina el {casePurgeDate.toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 space-y-2">
                          <div className="grid grid-cols-3 gap-1 text-center pt-1.5 border-t">
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">Proc.</div>
                              <div className="text-sm font-semibold">{surgicalCase.procedure_count || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">RVU</div>
                              <div className="text-sm font-semibold">{surgicalCase.total_rvu || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">Valor</div>
                              <div className="text-sm font-bold">
                                Q {(surgicalCase.total_value || 0).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 pt-1 border-t">
                            <Button asChild variant="ghost" size="sm" className="flex-1 h-8">
                              <Link to={`/cases/${surgicalCase.id}`}>
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Ver
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {!loadingAds && adSettings.showSidebarAds && sidebarAds.length > 0 && (
          <aside className="hidden xl:block w-80 flex-shrink-0">
            <SidebarAd />
          </aside>
        )}
      </div>
      </div>

    </AppLayout>
  );
};

export default CasesPage;