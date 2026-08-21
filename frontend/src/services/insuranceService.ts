import { authService } from '@/shared/services/authService';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/medico/insurances`;

export interface InsuranceCompany {
  id: number;
  name: string;
  is_favorite?: boolean;
}

class InsuranceService {
  async getInsurances(): Promise<InsuranceCompany[]> {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('El servidor no devolvió una respuesta válida. Intentá de nuevo en unos segundos.');
      }
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).results)) return (data as any).results;
      return [];
    } catch (error) {
      console.error('Error fetching insurances:', error);
      throw error;
    }
  }

  async favoriteInsurance(id: number): Promise<void> {
    const response = await authService.authenticatedFetch(`${API_BASE_URL}/${id}/favorite/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Error al agregar a favoritos');
  }

  async unfavoriteInsurance(id: number): Promise<void> {
    const response = await authService.authenticatedFetch(`${API_BASE_URL}/${id}/unfavorite/`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 404) throw new Error('Error al quitar de favoritos');
  }
}

export const insuranceService = new InsuranceService();
