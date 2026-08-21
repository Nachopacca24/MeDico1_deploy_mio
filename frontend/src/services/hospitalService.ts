/**
 * Service for Hospitals API
 */
import { authService } from '@/shared/services/authService';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/medico/hospitals`;

export interface Hospital {
  id: number;
  name: string;
  location?: string;
  place_type?: 'hospital' | 'clinica' | 'consultorio';
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
}

class HospitalService {
  async getHospitals(): Promise<Hospital[]> {
    try {
      // ❌ ANTES: authService.authenticatedFetch`${API_BASE_URL}/`)
      // ✅ AHORA: authService.authenticatedFetch(`${API_BASE_URL}/`)
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/`);

      if (!response.ok) {
        throw new Error(`Error al obtener hospitales: ${response.status}`);
      }

      // response.ok can be true with an empty/truncated body (e.g. the
      // backend restarting mid-response) — response.json() throws a raw,
      // unfriendly error in that case rather than a normal failure.
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
      console.error('Error fetching hospitals:', error);
      throw error;
    }
  }

  async getHospital(id: number): Promise<Hospital> {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/${id}/`);

      if (!response.ok) {
        throw new Error(`Error al obtener hospital: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching hospital:', error);
      throw error;
    }
  }

  async favoriteHospital(hospitalId: number): Promise<void> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_BASE_URL}/${hospitalId}/favorite/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error('Error al agregar a favoritos');
      }
    } catch (error) {
      console.error('Error favoriting hospital:', error);
      throw error;
    }
  }

  async unfavoriteHospital(hospitalId: number): Promise<void> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_BASE_URL}/${hospitalId}/unfavorite/`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok && response.status !== 404) {
        throw new Error('Error al quitar de favoritos');
      }
    } catch (error) {
      console.error('Error unfavoriting hospital:', error);
      throw error;
    }
  }

  async getFavoriteHospitals(): Promise<Hospital[]> {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/favorites/`);

      if (!response.ok) {
        throw new Error('Error al obtener hospitales favoritos');
      }

      const data = await response.json();
      return Array.isArray(data) ? data.map((fav: any) => fav.hospital) : [];
    } catch (error) {
      console.error('Error fetching favorite hospitals:', error);
      throw error;
    }
  }
}

export const hospitalService = new HospitalService();