import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface AnesthesiaItem {
  id: number;
  surgery_code: string;
  surgery_name: string;
  base_units: number;
  order: number;
  created_at: string;
}

export interface AnesthesiaCase {
  id: number;
  case: number;
  unit_value: number;
  time_units: number | null;
  time_minutes: number | null;
  anesthesiologist_name: string | null;
  anesthesiologist: number | null;
  anesthesiologist_display: string | null;
  anesthesiologist_accepted: boolean | null;
  equipment_name: string | null;
  equipment_cost: number | null;
  notes: string | null;
  items: AnesthesiaItem[];
  is_operated: boolean;
  is_billed: boolean;
  is_paid: boolean;
  total_base_units: number;
  total_units: number;
  total_fee: number;
  created_at: string;
  updated_at: string;
}

class AnesthesiaService {
  private url(caseId: number) {
    return `${API_URL}/api/v1/medico/cases/${caseId}/anesthesia/`;
  }

  async get(caseId: number): Promise<AnesthesiaCase | null> {
    const res = await authService.authenticatedFetch(this.url(caseId));
    if (!res.ok) return null;
    const data = await res.json();
    return data ?? null;
  }

  async create(caseId: number, data: {
    unit_value: number;
    anesthesiologist?: number | null;
    anesthesiologist_name?: string | null;
    equipment_name?: string | null;
    equipment_cost?: number | null;
    notes?: string;
  }): Promise<AnesthesiaCase> {
    const res = await authService.authenticatedFetch(this.url(caseId), {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al crear la sesión de anestesia');
    }
    return res.json();
  }

  async update(caseId: number, data: {
    unit_value?: number;
    time_minutes?: number | null;
    time_units?: number | null;
    equipment_name?: string | null;
    equipment_cost?: number | null;
    notes?: string;
  }): Promise<AnesthesiaCase> {
    const res = await authService.authenticatedFetch(this.url(caseId), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar la sesión de anestesia');
    }
    return res.json();
  }

  async addItem(caseId: number, item: {
    surgery_code: string;
    surgery_name: string;
    base_units: number;
  }): Promise<AnesthesiaCase> {
    const res = await authService.authenticatedFetch(`${this.url(caseId)}items/`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al agregar código');
    }
    return res.json();
  }

  async removeItem(caseId: number, itemId: number): Promise<AnesthesiaCase> {
    const res = await authService.authenticatedFetch(`${this.url(caseId)}items/${itemId}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar código');
    }
    return res.json();
  }

  async updateStatus(caseId: number, data: {
    is_operated?: boolean;
    is_billed?: boolean;
    is_paid?: boolean;
  }): Promise<AnesthesiaCase> {
    const res = await authService.authenticatedFetch(this.url(caseId), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar estado de anestesia');
    }
    return res.json();
  }

  async getPendingInvitations(): Promise<{ pending_invitations: import('@/types/surgical-case').SurgicalCase[]; total_pending: number }> {
    const res = await authService.authenticatedFetch(`${API_URL}/api/v1/medico/cases/anesthesia-invitations/`);
    if (!res.ok) return { pending_invitations: [], total_pending: 0 };
    return res.json();
  }

  async respond(caseId: number, accepted: boolean): Promise<AnesthesiaCase> {
    const res = await authService.authenticatedFetch(`${this.url(caseId)}respond/`, {
      method: 'POST',
      body: JSON.stringify({ accepted }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al responder la invitación');
    }
    return res.json();
  }
}

export const anesthesiaService = new AnesthesiaService();
