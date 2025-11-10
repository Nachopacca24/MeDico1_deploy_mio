/**
 * Service for Hospitals API
 */
import { authService } from '@/shared/services/authService';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/medico/hospitals`;

export interface Hospital {
  id: number;
  name: string;
  location?: string;
  rate_multiplier: number;
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
}

class HospitalService {
  /**
   * Get all hospitals (favorites first)
   */
  async getHospitals(): Promise<Hospital[]> {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/`);
      
      if (!response.ok) {
        throw new Error(`Error al obtener hospitales: ${response.status}`);
      }
      
      const data = await response.json();
      // Django REST Framework may return paginated results {count, next, previous, results: [...]}
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).results)) return (data as any).results;
      return [];
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      throw error;
    }
  }  /**
   * Get a single hospital by ID
   */
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

  /**
   * Add hospital to favorites
   */
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

  /**
   * Remove hospital from favorites
   */
  async unfavoriteHospital(hospitalId: number): Promise<void> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_BASE_URL}/${hospitalId}/unfavorite/`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Error al quitar de favoritos');
      }
    } catch (error) {
      console.error('Error unfavoriting hospital:', error);
      throw error;
    }
  }

  /**
   * Get only favorite hospitals
   */
  async getFavoriteHospitals(): Promise<Hospital[]> {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/favorites/`);
      
      if (!response.ok) {
        throw new Error('Error al obtener hospitales favoritos');
      }
      
      const data = await response.json();
      // Extract hospitals from favorite objects
      return Array.isArray(data) ? data.map((fav: any) => fav.hospital) : [];
    } catch (error) {
      console.error('Error fetching favorite hospitals:', error);
      throw error;
    }
  }
}

export const hospitalService = new HospitalService();
