// favoritesService.ts - Servicio para manejar favoritos con el backend
import { authService } from '@/shared/services/authService';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/medico/favorites`;

export interface Favorite {
  id: number;
  surgery_code: string;
  surgery_name?: string;
  specialty?: string;
  created_at: string;
}

export interface ToggleFavoriteRequest {
  surgery_code: string;
  surgery_name?: string;
  specialty?: string;
}

export interface ToggleFavoriteResponse {
  message: string;
  action: 'added' | 'removed';
  is_favorite: boolean;
  data?: Favorite;
}

class FavoritesService {
  /**
   * Obtener todos los favoritos del usuario autenticado
   */
  async getFavorites(): Promise<Favorite[]> {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/`);
      
      if (!response.ok) {
        throw new Error(`Error al obtener favoritos: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Verificar si es array
      if (!Array.isArray(data)) {
        return [];
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener solo los códigos de cirugías favoritas (para compatibilidad)
   */
  async getFavoriteCodes(): Promise<Set<string>> {
    try {
      const favorites = await this.getFavorites();
      
      if (!Array.isArray(favorites)) {
        return new Set();
      }
      
      // Normalizar códigos: trim y convertir a string
      const codes = new Set(favorites.map(f => String(f.surgery_code || '').trim()));
      return codes;
    } catch (error) {
      return new Set();
    }
  }

  /**
   * Agregar un favorito
   */
  async addFavorite(data: ToggleFavoriteRequest): Promise<Favorite> {
    const response = await authService.authenticatedFetch(`${API_BASE_URL}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al agregar favorito');
    }

    return await response.json();
  }

  /**
   * Eliminar un favorito por ID
   */
  async removeFavorite(id: number): Promise<void> {
    const response = await authService.authenticatedFetch(`${API_BASE_URL}/${id}/`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Error al eliminar favorito');
    }
  }

  /**
   * Eliminar un favorito por código de cirugía
   */
  async removeFavoriteByCode(surgeryCode: string): Promise<void> {
    const favorites = await this.getFavorites();
    const favorite = favorites.find(f => f.surgery_code === surgeryCode);
    
    if (favorite) {
      await this.removeFavorite(favorite.id);
    }
  }

  /**
   * Toggle favorito (agregar si no existe, eliminar si existe)
   */
  async toggleFavorite(data: ToggleFavoriteRequest): Promise<ToggleFavoriteResponse> {
    try {
      const response = await authService.authenticatedFetch(`${API_BASE_URL}/toggle/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al alternar favorito');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar todos los favoritos
   */
  async clearAll(): Promise<{ message: string; count: number }> {
    const response = await authService.authenticatedFetch(`${API_BASE_URL}/clear/`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Error al limpiar favoritos');
    }

    return await response.json();
  }

  /**
   * Verificar si una cirugía es favorita
   */
  async isFavorite(surgeryCode: string): Promise<boolean> {
    try {
      const codes = await this.getFavoriteCodes();
      return codes.has(surgeryCode);
    } catch (error) {
      return false;
    }
  }

  /**
   * Migrar favoritos desde localStorage al backend
   */
  async migrateFromLocalStorage(operations: any[]): Promise<void> {
    try {
      const localFavorites = localStorage.getItem('surgery-favorites');
      if (!localFavorites) return;

      const favoriteCodes: string[] = JSON.parse(localFavorites);
      
      for (const code of favoriteCodes) {
        const operation = operations.find(op => op.codigo === code);
        
        if (operation) {
          try {
            await this.addFavorite({
              surgery_code: operation.codigo,
              surgery_name: operation.cirugia,
              specialty: operation.especialidad,
            });
          } catch (error) {
            // Ignorar duplicados silenciosamente
          }
        }
      }
    } catch (error) {
      // Fallo silencioso en migración
    }
  }
}

export const favoritesService = new FavoritesService();
