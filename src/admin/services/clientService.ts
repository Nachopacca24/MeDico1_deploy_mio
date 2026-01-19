// src/admin/services/clientService.ts

import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface Client {
  id: number;
  company_name: string;
  contact_name?: string;
  email: string;
  phone?: string;
  plan: 'bronze' | 'silver' | 'gold';
  plan_display: string;
  amount_paid: string;
  currency: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'inactive' | 'pending' | 'expired';
  status_display: string;
  notes?: string;
  is_active: boolean;
  days_remaining: number;
  ad_count: number;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientCreateUpdate {
  company_name: string;
  contact_name?: string;
  email: string;
  phone?: string;
  plan: 'bronze' | 'silver' | 'gold';
  amount_paid: number | string;
  currency?: string;
  start_date: string;
  end_date: string;
  status?: 'active' | 'inactive' | 'pending' | 'expired';
  notes?: string;
}

export interface ClientStats {
  total_clients: number;
  active_clients: number;
  clients_by_plan: {
    gold: number;
    silver: number;
    bronze: number;
  };
}

class ClientService {
  private async handleResponse(response: Response) {
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Respuesta no-JSON recibida:', text.substring(0, 200));
      throw new Error(`El servidor devolvió HTML en lugar de JSON. Estado: ${response.status}`);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.message || `Error HTTP: ${response.status}`);
    }

    return await response.json();
  }

  async getClients(params?: {
    status?: string;
    plan?: string;
    search?: string;
  }): Promise<Client[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.plan) queryParams.append('plan', params.plan);
      if (params?.search) queryParams.append('search', params.search);

      const url = `${API_URL}/api/v1/advertising/clients/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log('🌐 Fetching from URL:', url);
      const response = await authService.authenticatedFetch(url);
      console.log('📡 Response status:', response.status);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getClients:', error);
      throw error;
    }
  }

  async getClient(id: number): Promise<Client> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/advertising/clients/${id}/`
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getClient:', error);
      throw error;
    }
  }

  async createClient(data: ClientCreateUpdate): Promise<Client> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/advertising/clients/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en createClient:', error);
      throw error;
    }
  }

  async updateClient(id: number, data: Partial<ClientCreateUpdate>): Promise<Client> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/advertising/clients/${id}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en updateClient:', error);
      throw error;
    }
  }

  async deleteClient(id: number): Promise<void> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/advertising/clients/${id}/`,
        {
          method: 'DELETE',
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error('Error en deleteClient:', error);
      throw error;
    }
  }

  async getClientStats(): Promise<ClientStats> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/advertising/clients/stats/`
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getClientStats:', error);
      throw error;
    }
  }

  async getActiveClients(): Promise<Client[]> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/advertising/clients/active/`
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getActiveClients:', error);
      throw error;
    }
  }

  async getExpiringClients(): Promise<Client[]> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/advertising/clients/expiring_soon/`
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getExpiringClients:', error);
      throw error;
    }
  }
}

export const clientService = new ClientService();