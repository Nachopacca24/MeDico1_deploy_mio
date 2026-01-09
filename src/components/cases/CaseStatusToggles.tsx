// src/components/cases/CaseStatusToggles.tsx

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Loader2, Check } from 'lucide-react';
import { surgicalCaseService } from '@/services/surgicalCaseService';
import type { SurgicalCase } from '@/types/surgical-case';

interface CaseStatusTogglesProps {
  surgicalCase: SurgicalCase;
  onUpdate: (updatedCase: SurgicalCase) => void;
  onError: (error: string) => void;
  compact?: boolean;
}

export function CaseStatusToggles({ 
  surgicalCase, 
  onUpdate, 
  onError,
  compact = false 
}: CaseStatusTogglesProps) {
  const [updating, setUpdating] = useState<'operated' | 'billed' | 'paid' | null>(null);

  const isOperated = surgicalCase.is_operated ?? false;
  const isBilled = surgicalCase.is_billed ?? false;
  const isPaid = surgicalCase.is_paid ?? false;

  const handleToggle = async (
    type: 'operated' | 'billed' | 'paid',
    currentValue: boolean
  ) => {
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
      {/* Operado */}
      <Button
        variant={isOperated ? 'default' : 'outline'}
        size={buttonSize}
        onClick={() => handleToggle('operated', isOperated)}
        disabled={updating !== null}
        className={
          isOperated 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
        }
      >
        {updating === 'operated' && <Loader2 className={`${iconSize} animate-spin mr-1.5`} />}
        {!updating && isOperated && <Check className={`${iconSize} mr-1.5`} />}
        <span>Operado</span>
      </Button>

      {/* Facturado */}
      <Button
        variant={isBilled ? 'default' : 'outline'}
        size={buttonSize}
        onClick={() => handleToggle('billed', isBilled)}
        disabled={updating !== null || (!isOperated && !isBilled)}
        className={
          isBilled 
            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
            : 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300'
        }
      >
        {updating === 'billed' && <Loader2 className={`${iconSize} animate-spin mr-1.5`} />}
        {!updating && isBilled && <Check className={`${iconSize} mr-1.5`} />}
        <span>Facturado</span>
      </Button>

      {/* Cobrado */}
      <Button
        variant={isPaid ? 'default' : 'outline'}
        size={buttonSize}
        onClick={() => handleToggle('paid', isPaid)}
        disabled={updating !== null || (!isBilled && !isPaid)}
        className={
          isPaid 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
        }
      >
        {updating === 'paid' && <Loader2 className={`${iconSize} animate-spin mr-1.5`} />}
        {!updating && isPaid && <Check className={`${iconSize} mr-1.5`} />}
        <span>Cobrado</span>
      </Button>
    </div>
  );
}