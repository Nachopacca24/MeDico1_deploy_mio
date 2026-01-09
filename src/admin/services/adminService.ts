// src/admin/services/adminService.ts

import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface AdminStats {
  totalUsers: number;
  totalCases: number;
  casesThisMonth: number;
}

export interface RecentActivity {
  id: number;
  type: 'user' | 'case' | 'hospital';
  description: string;
  timestamp: string;
  user_name?: string;
}

class AdminService {
  private async handleResponse(response: Response) {
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Respuesta no-JSON recibida:', text.substring(0, 200));
      throw new Error(`El servidor devolvió HTML en lugar de JSON. Estado: ${response.status}`);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Error HTTP: ${response.status}`);
    }

    return await response.json();
  }

  async getDashboardStats(): Promise<AdminStats> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/admin/stats/`
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getDashboardStats:', error);
      throw error;
    }
  }

  async getRecentActivity(): Promise<RecentActivity[]> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/admin/activity/`
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getRecentActivity:', error);
      throw error;
    }
  }

  async getUsers() {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/admin/users/`
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getUsers:', error);
      throw error;
    }
  }

  async deleteUser(userId: number): Promise<void> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/admin/users/${userId}/delete/`,
        {
          method: 'POST',
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error en deleteUser:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();