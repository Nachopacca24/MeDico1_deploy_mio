/**
 * Service for Surgical Cases API
 */
import { authService } from '@/shared/services/authService';
import type {
  SurgicalCase,
  SurgicalCaseCreate,
  SurgicalCaseUpdate,
  CaseStats,
  CaseFilters,
  CaseProcedure,
} from '@/types/surgical-case';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/medico/cases`;

class SurgicalCaseService {
  /**
   * Get all cases with optional filters
   */
  async getCases(filters?: CaseFilters): Promise<SurgicalCase[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.hospital) params.append('hospital', filters.hospital.toString());
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      if (filters?.search) params.append('search', filters.search);
      
      const url = `${API_BASE_URL}/?${params.toString()}`;
      const response = await authService.authenticatedFetch(url);
      
      if (!response.ok) {
        throw new Error(`Error al obtener casos: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle paginated response from DRF
      if (data && typeof data === 'object' && 'results' in data) {
        return Array.isArray(data.results) ? data.results : [];
      }
      
      // Handle direct array response (if pagination is disabled)
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching cases:', error);
      throw error;
    }
  }

  /**
   * Get a single case by ID
   */
  async getCase(id: number): Promise<SurgicalCase> {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/${id}/`);
      
      if (!response.ok) {
        throw new Error(`Error al obtener caso: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching case:', error);
      throw error;
    }
  }

  /**
   * Create a new case
   */
  async createCase(data: SurgicalCaseCreate): Promise<SurgicalCase> {
    try {
      console.log('Creating case with data:', data);
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('Create case response status:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create case error response:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(JSON.stringify(errorJson, null, 2));
        } catch {
          throw new Error(errorText || 'Error al crear caso');
        }
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating case:', error);
      throw error;
    }
  }

  /**
   * Update an existing case
   */
  async updateCase(id: number, data: Partial<SurgicalCaseCreate>): Promise<SurgicalCase> {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar caso');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating case:', error);
      throw error;
    }
  }

  /**
   * Delete a case
   */
  async deleteCase(id: number): Promise<void> {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/${id}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar caso');
      }
    } catch (error) {
      console.error('Error deleting case:', error);
      throw error;
    }
  }

  /**
   * Get cases statistics
   */
  async getStats(): Promise<CaseStats> {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/stats/`);
      
      if (!response.ok) {
        throw new Error(`Error al obtener estadísticas: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  /**
   * Add a procedure to an existing case
   */
  async addProcedure(caseId: number, procedure: Omit<CaseProcedure, 'id' | 'created_at' | 'updated_at'>): Promise<CaseProcedure> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_BASE_URL}/${caseId}/add-procedure/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(procedure),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al agregar procedimiento');
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding procedure:', error);
      throw error;
    }
  }

  /**
   * Remove a procedure from a case
   */
  async removeProcedure(caseId: number, procedureId: number): Promise<void> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_BASE_URL}/${caseId}/remove-procedure/${procedureId}/`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Error al eliminar procedimiento');
      }
    } catch (error) {
      console.error('Error removing procedure:', error);
      throw error;
    }
  }

  /**
   * Update case status only
   */
  async updateStatus(caseId: number, status: string): Promise<SurgicalCase> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_BASE_URL}/${caseId}/update-status/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar estado');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }
}

export const surgicalCaseService = new SurgicalCaseService();
