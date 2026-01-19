// src/admin/services/advertisementService.ts

import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface Advertisement {
  id: number;
  client: number;
  client_name: string;
  campaign_name: string;
  title?: string;
  description?: string;
  image: string;
  image_url: string;
  image_alt_text?: string;
  redirect_url: string;
  open_in_new_tab: boolean;
  placement: 'home_banner' | 'sidebar' | 'footer' | 'popup' | 'between_content';
  placement_display: string;
  priority: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  status_display: string;
  impressions: number;
  clicks: number;
  ctr: number;
  is_active: boolean;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AdvertisementCreate {
  client: number;
  campaign_name: string;
  title?: string;
  description?: string;
  image: File;
  image_alt_text?: string;
  redirect_url: string;
  open_in_new_tab?: boolean;
  placement: string;
  priority?: number;
  start_date: string;
  end_date: string;
  status?: string;
}

export interface ActiveAd {
  id: number;
  title?: string;
  image_url: string;
  image_alt_text?: string;
  redirect_url: string;
  open_in_new_tab: boolean;
  placement: string;
}

class AdvertisementService {
  private async handleResponse(response: Response) {
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Respuesta no-JSON recibida:', text.substring(0, 200));
      throw new Error(`El servidor devolvió HTML en lugar de JSON. Estado: ${response.status}`);
    }

    if (!response.ok) {
      const error = await response.json();
      console.error('Error detallado del servidor:', error);
      throw new Error(error.detail || error.message || JSON.stringify(error) || `Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    // Manejar respuesta paginada de Django REST Framework
    if (data && data.results && Array.isArray(data.results)) {
      return data.results;
    }
    return data;
  }

  async getAdvertisements(params?: {
    client?: number;
    status?: string;
    placement?: string;
    search?: string;
  }): Promise<Advertisement[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.client) queryParams.append('client', params.client.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.placement) queryParams.append('placement', params.placement);
      if (params?.search) queryParams.append('search', params.search);

      const url = `${API_URL}/api/v1/advertising/advertisements/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await authService.authenticatedFetch(url);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getAdvertisements:', error);
      throw error;
    }
  }

  async getAdvertisement(id: number): Promise<Advertisement> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/advertising/advertisements/${id}/`
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en getAdvertisement:', error);
      throw error;
    }
  }

  async createAdvertisement(data: AdvertisementCreate): Promise<Advertisement> {
    try {
      const formData = new FormData();
      formData.append('client', data.client.toString());
      formData.append('campaign_name', data.campaign_name);
      if (data.title) formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      formData.append('image', data.image);
      if (data.image_alt_text) formData.append('image_alt_text', data.image_alt_text);
      formData.append('redirect_url', data.redirect_url);
      formData.append('open_in_new_tab', data.open_in_new_tab ? 'true' : 'false');
      formData.append('placement', data.placement);
      formData.append('priority', (data.priority || 0).toString());
      formData.append('start_date', data.start_date);
      formData.append('end_date', data.end_date);
      formData.append('status', data.status || 'draft');

      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/advertising/advertisements/`,
        {
          method: 'POST',
          body: formData,
        }
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en createAdvertisement:', error);
      throw error;
    }
  }

  async updateAdvertisement(id: number, data: Partial<AdvertisementCreate>): Promise<Advertisement> {
    try {
      const formData = new FormData();
      
      if (data.client) formData.append('client', data.client.toString());
      if (data.campaign_name) formData.append('campaign_name', data.campaign_name);
      if (data.title) formData.append('title', data.title);
      if (data.description) formData.append('description', data.description);
      if (data.image) formData.append('image', data.image);
      if (data.image_alt_text) formData.append('image_alt_text', data.image_alt_text);
      if (data.redirect_url) formData.append('redirect_url', data.redirect_url);
      if (data.open_in_new_tab !== undefined) formData.append('open_in_new_tab', data.open_in_new_tab ? 'true' : 'false');
      if (data.placement) formData.append('placement', data.placement);
      if (data.priority !== undefined) formData.append('priority', data.priority.toString());
      if (data.start_date) formData.append('start_date', data.start_date);
      if (data.end_date) formData.append('end_date', data.end_date);
      if (data.status) formData.append('status', data.status);

      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/advertising/advertisements/${id}/`,
        {
          method: 'PATCH',
          body: formData,
        }
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error en updateAdvertisement:', error);
      throw error;
    }
  }

  async deleteAdvertisement(id: number): Promise<void> {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/v1/advertising/advertisements/${id}/`,
        {
          method: 'DELETE',
        }
      );
      
      if (!response.ok && response.status !== 204) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error('Error en deleteAdvertisement:', error);
      throw error;
    }
  }

  async getActiveAds(placement: string = 'home_banner'): Promise<ActiveAd[]> {
    try {
      const response = await fetch(
        `${API_URL}/api/v1/advertising/public/ads/?placement=${placement}`
      );
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error en getActiveAds:', error);
      return [];
    }
  }

  async trackImpression(adId: number): Promise<void> {
    try {
      await fetch(
        `${API_URL}/api/v1/advertising/public/ads/${adId}/impression/`,
        { method: 'POST' }
      );
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  }

  async trackClick(adId: number): Promise<void> {
    try {
      await fetch(
        `${API_URL}/api/v1/advertising/public/ads/${adId}/click/`,
        { method: 'POST' }
      );
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  }
}

export const advertisementService = new AdvertisementService();