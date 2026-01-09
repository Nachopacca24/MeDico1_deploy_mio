// src/services/surgicalCaseService.ts

import { authService } from '@/shared/services/authService';
import { calendarSyncService } from './calendarSyncService';
import type { 
  SurgicalCase, 
  CreateCaseData, 
  UpdateCaseData, 
  CaseStats,
  AssistedCasesResponse,
  InvitationResponse,
  Procedure
} from '@/types/surgical-case';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class SurgicalCaseService {
  /**
   * Helper method to handle responses and errors properly
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        contentType,
        body: text.substring(0, 500)
      });
      
      throw new Error(
        `Error del servidor: La API devolvió ${response.status} ${response.statusText}. ` +
        `Verifica que el endpoint exista en Django y que el servidor esté corriendo.`
      );
    }

    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || `Error ${response.status}: ${response.statusText}`);
      } catch (e) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    }

    return await response.json();
  }

  // ==================== CASOS PROPIOS ====================

  async getCases(params?: {
    status?: string;
    hospital?: number;
    date_from?: string;
    date_to?: string;
    search?: string;
    assisted_only?: boolean;
  }): Promise<SurgicalCase[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      
      const url = `${API_URL}/api/v1/medico/cases/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await authService.authenticatedFetch(url);
      return await this.handleResponse<SurgicalCase[]>(response);
    } catch (error: any) {
      console.error('Error fetching cases:', error);
      throw error;
    }
  }

  async getCase(id: number): Promise<SurgicalCase> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${id}/`
      );
      return await this.handleResponse<SurgicalCase>(response);
    } catch (error: any) {
      console.error('Error fetching case:', error);
      throw error;
    }
  }

  async getStats(): Promise<CaseStats> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/stats/`
      );

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Stats endpoint returned non-JSON response');
        return {
          total_cases: 0,
          total_procedures: 0,
          total_value: 0,
          cases_by_status: {},
          cases_by_specialty: {},
          recent_cases: []
        };
      }

      const data = await response.json();
      
      const transformedData: CaseStats = {
        total_cases: data.total_cases,
        total_procedures: data.total_procedures,
        total_value: data.total_value,
        cases_by_status: data.cases_by_status || {},
        cases_by_specialty: Object.entries(data.cases_by_specialty || {}).reduce((acc, [key, count]) => {
          acc[key] = { count: count as number, total_value: 0 };
          return acc;
        }, {} as Record<string, { count: number; total_value: number }>),
        recent_cases: data.recent_cases || []
      };
      
      return transformedData;
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        total_cases: 0,
        total_procedures: 0,
        total_value: 0,
        cases_by_status: {},
        cases_by_specialty: {},
        recent_cases: []
      };
    }
  }

  /**
   * Create a new surgical case
   * ✅ CON SINCRONIZACIÓN DE GOOGLE CALENDAR
   */
  async createCase(data: CreateCaseData): Promise<SurgicalCase> {
    try {
      console.log('Creating case with data:', data);
      
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      
      const surgicalCase = await this.handleResponse<SurgicalCase>(response);
      console.log('🔍 Caso creado, calendar_event_id:', surgicalCase.calendar_event_id);

      // ✅ SINCRONIZAR CON GOOGLE CALENDAR
      try {
        const eventId = await calendarSyncService.createEventForCase(surgicalCase);
        
        if (eventId) {
          // ✅ IMPORTANTE: Usar skipCalendarSync=true para evitar crear duplicados
          const updatedCase = await this.updateCase(surgicalCase.id, { 
            calendar_event_id: eventId 
          } as UpdateCaseData, true);
          
          console.log('🔍 Caso después de guardar eventId, calendar_event_id:', updatedCase.calendar_event_id);
          console.log('✅ Caso creado y sincronizado con Google Calendar');
          return updatedCase;
        }
      } catch (calendarError) {
        console.error('⚠️ Error sincronizando con Google Calendar (caso creado exitosamente):', calendarError);
        // No lanzar error - el caso ya fue creado exitosamente
      }

      return surgicalCase;
    } catch (error: any) {
      console.error('Error creating case:', error);
      throw error;
    }
  }

  /**
   * Update a surgical case
   * ✅ CON SINCRONIZACIÓN DE GOOGLE CALENDAR (sin duplicados)
   * ✅ CON NORMALIZACIÓN DE DATOS NUMÉRICOS
   */
  async updateCase(id: number, data: UpdateCaseData, skipCalendarSync: boolean = false): Promise<SurgicalCase> {
    try {
      console.log('=== ACTUALIZANDO CASO ===');
      console.log('ID:', id);
      console.log('Data enviada:', JSON.stringify(data, null, 2));
      console.log('skipCalendarSync:', skipCalendarSync);
      
      // ✅ LIMPIAR Y NORMALIZAR DATOS DE PROCEDIMIENTOS
      const cleanedData = { ...data };
      if (cleanedData.procedures && Array.isArray(cleanedData.procedures)) {
        cleanedData.procedures = cleanedData.procedures.map((proc: any) => {
          // Convertir valores a números
          const hospitalFactor = typeof proc.hospital_factor === 'string' 
            ? parseFloat(proc.hospital_factor) 
            : proc.hospital_factor;
          
          const calculatedValue = typeof proc.calculated_value === 'string'
            ? parseFloat(proc.calculated_value)
            : proc.calculated_value;
          
          const rvu = typeof proc.rvu === 'string'
            ? parseFloat(proc.rvu)
            : proc.rvu;
          
          return {
            ...proc,
            hospital_factor: hospitalFactor,
            // ✅ REDONDEAR calculated_value a 2 decimales para cumplir con max_digits=12
            calculated_value: Math.round(calculatedValue * 100) / 100,
            rvu: rvu
          };
        });
      }
      
      console.log('=== DATA LIMPIADA ===');
      console.log(JSON.stringify(cleanedData, null, 2));
      
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${id}/`,
        {
          method: 'PATCH',
          body: JSON.stringify(cleanedData),
        }
      );
      
      console.log('=== RESPUESTA DEL SERVIDOR ===');
      console.log('Status:', response.status);
      console.log('OK:', response.ok);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          console.log('=== ERROR DATA ===');
          console.log(errorData);
          console.log('=== ERROR DATA STRINGIFIED ===');
          console.log(JSON.stringify(errorData, null, 2));
          
          let errorMessage = 'Error al actualizar el caso';
          if (typeof errorData === 'object') {
            if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            } else if (errorData.procedures) {
              // Error específico en procedures
              console.log('=== PROCEDURES ERROR ===');
              console.log('Type:', typeof errorData.procedures);
              console.log('Is Array:', Array.isArray(errorData.procedures));
              console.log('Content:', errorData.procedures);
              
              if (Array.isArray(errorData.procedures)) {
                errorMessage = `Error en procedimientos: ${errorData.procedures.map((err: any, idx: number) => {
                  if (typeof err === 'object') {
                    return `Procedimiento ${idx + 1}: ${JSON.stringify(err)}`;
                  }
                  return `Procedimiento ${idx + 1}: ${err}`;
                }).join('; ')}`;
              } else {
                errorMessage = `Error en procedimientos: ${JSON.stringify(errorData.procedures)}`;
              }
            } else {
              const fieldErrors = Object.entries(errorData)
                .map(([field, messages]) => {
                  if (Array.isArray(messages)) {
                    return `${field}: ${messages.join(', ')}`;
                  }
                  return `${field}: ${messages}`;
                })
                .join('; ');
              
              if (fieldErrors) {
                errorMessage = fieldErrors;
              }
            }
          }
          
          throw new Error(errorMessage);
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const surgicalCase = await response.json();
      console.log('=== CASO ACTUALIZADO ===');
      console.log(surgicalCase);
      console.log('calendar_event_id en response:', surgicalCase.calendar_event_id);

      // ✅ SINCRONIZAR CON GOOGLE CALENDAR - SOLO SI NO SE SALTEA
      if (!skipCalendarSync) {
        const hasRelevantChanges = !!(
          data.patient_name || 
          data.surgery_date || 
          data.surgery_time || 
          data.surgery_end_time || 
          data.hospital || 
          data.diagnosis ||
          data.procedures
        );

        if (hasRelevantChanges) {
          try {
            // Si tiene calendar_event_id, actualizar; si no, crear uno nuevo
            if (surgicalCase.calendar_event_id) {
              const success = await calendarSyncService.updateEventForCase(surgicalCase);
              if (success) {
                console.log('✅ Evento actualizado en Google Calendar');
              }
            } else {
              // No tiene calendar_event_id, crear uno nuevo
              console.log('⚠️ Caso sin calendar_event_id, creando evento...');
              const eventId = await calendarSyncService.createEventForCase(surgicalCase);
              
              if (eventId) {
                // ✅ IMPORTANTE: Usar skipCalendarSync=true para evitar recursión
                const updatedCase = await this.updateCase(surgicalCase.id, { 
                  calendar_event_id: eventId 
                } as UpdateCaseData, true);
                
                // ✅ CRÍTICO: Actualizar el objeto local con el eventId
                surgicalCase.calendar_event_id = eventId;
                
                console.log('✅ Evento creado y vinculado en Google Calendar');
              }
            }
          } catch (calendarError) {
            console.error('⚠️ Error sincronizando con Google Calendar:', calendarError);
          }
        }
      }
      
      return surgicalCase;
    } catch (error: any) {
      console.error('=== ERROR CAPTURADO ===');
      console.error(error);
      throw error;
    }
  }

  /**
   * Delete a surgical case
   * ✅ CON ELIMINACIÓN DE GOOGLE CALENDAR
   */
  async deleteCase(id: number): Promise<void> {
    try {
      // ✅ OBTENER EL CASO PARA ELIMINAR EL EVENTO DE CALENDAR
      try {
        const surgicalCase = await this.getCase(id);
        if (surgicalCase.calendar_event_id) {
          await calendarSyncService.deleteEventForCase(surgicalCase.calendar_event_id);
          console.log('✅ Evento eliminado de Google Calendar');
        }
      } catch (calendarError) {
        console.error('⚠️ Error eliminando evento de Google Calendar:', calendarError);
        // Continuar con la eliminación del caso de todos modos
      }

      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${id}/`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to delete case');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Caso eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting case:', error);
      throw error;
    }
  }

  async updateStatus(id: number, status: string): Promise<SurgicalCase> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${id}/update-status/`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      );
      return await this.handleResponse<SurgicalCase>(response);
    } catch (error: any) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  // ==================== PROCEDIMIENTOS ====================

  async addProcedure(caseId: number, procedure: Omit<Procedure, 'id'>): Promise<Procedure> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${caseId}/add-procedure/`,
        {
          method: 'POST',
          body: JSON.stringify(procedure),
        }
      );
      return await this.handleResponse<Procedure>(response);
    } catch (error: any) {
      console.error('Error adding procedure:', error);
      throw error;
    }
  }

  async removeProcedure(caseId: number, procedureId: number): Promise<void> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${caseId}/remove-procedure/${procedureId}/`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to remove procedure');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Error removing procedure:', error);
      throw error;
    }
  }

  // ==================== CASOS ASISTIDOS ====================

  async getAssistedCases(): Promise<AssistedCasesResponse> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/assisted/`
      );
      return await this.handleResponse<AssistedCasesResponse>(response);
    } catch (error: any) {
      console.error('Error fetching assisted cases:', error);
      throw error;
    }
  }

  /**
   * Accept invitation to assist in a case
   * ✅ CON SINCRONIZACIÓN AUTOMÁTICA A GOOGLE CALENDAR
   */
  async acceptInvitation(caseId: number): Promise<InvitationResponse> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${caseId}/accept-invitation/`,
        {
          method: 'POST',
        }
      );
      const result = await this.handleResponse<InvitationResponse>(response);

      // ✅ AGREGAR AUTOMÁTICAMENTE AL CALENDARIO DEL AYUDANTE
      try {
        // Obtener el caso completo para sincronizarlo
        const surgicalCase = await this.getCase(caseId);
        
        // Crear evento en el calendario del ayudante
        const eventId = await calendarSyncService.createEventForCase(surgicalCase);
        
        if (eventId) {
          console.log('✅ Invitación aceptada y agregada a Google Calendar del ayudante');
        }
      } catch (calendarError) {
        console.error('⚠️ Error sincronizando con Google Calendar (invitación aceptada exitosamente):', calendarError);
        // No lanzar error - la invitación ya fue aceptada
      }

      return result;
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Reject invitation to assist in a case
   */
  async rejectInvitation(caseId: number): Promise<InvitationResponse> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/medico/cases/${caseId}/reject-invitation/`,
        {
          method: 'POST',
        }
      );
      return await this.handleResponse<InvitationResponse>(response);
    } catch (error: any) {
      console.error('Error rejecting invitation:', error);
      throw error;
    }
  }

  // ==================== ESTADOS DE PROCESO ====================

  async toggleOperated(id: number, isOperated: boolean): Promise<SurgicalCase> {
    return this.updateCase(id, { is_operated: isOperated });
  }

  async toggleBilled(id: number, isBilled: boolean): Promise<SurgicalCase> {
    return this.updateCase(id, { is_billed: isBilled });
  }

  async togglePaid(id: number, isPaid: boolean): Promise<SurgicalCase> {
    return this.updateCase(id, { is_paid: isPaid });
  }

  // ==================== UTILIDADES ====================

  canDelete(surgicalCase: SurgicalCase): { allowed: boolean; reason?: string } {
    if (!surgicalCase.is_paid) {
      return {
        allowed: false,
        reason: 'No se puede eliminar una cirugía que no ha sido cobrada'
      };
    }
    return { allowed: true };
  }

  canEdit(surgicalCase: SurgicalCase): boolean {
    return surgicalCase.can_edit ?? false;
  }

  isOwner(surgicalCase: SurgicalCase): boolean {
    return surgicalCase.is_owner ?? false;
  }

  hasPendingInvitation(surgicalCase: SurgicalCase): boolean {
    return !!(surgicalCase.assistant_doctor && !surgicalCase.assistant_accepted);
  }

  isAcceptedByAssistant(surgicalCase: SurgicalCase): boolean {
    return !!(surgicalCase.assistant_doctor && surgicalCase.assistant_accepted);
  }
}

export const surgicalCaseService = new SurgicalCaseService();