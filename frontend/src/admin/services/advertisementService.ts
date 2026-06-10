// src/admin/services/advertisementService.ts

import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface Advertisement {
  id: number;
  client: number;
  client_name: string;
  client_plan?: 'bronze' | 'silver' | 'gold';
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
  category: AdCategory;
  priority: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  status_display: string;
  impressions: number;
  clicks: number;
  ctr: number;
  is_active: boolean;
  target_specialties: string[];
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
  category?: string;
  priority?: number;
  start_date: string;
  end_date: string;
  status?: string;
  target_specialties?: string[];
}

export type AdCategory = 'general' | 'congreso' | 'casa_medica' | 'hospital' | 'tecnologia' | 'farmaceutica' | 'educacion' | 'clinica';

export interface ActiveAd {
  id: number;
  title?: string;
  image_url: string;
  image_alt_text?: string;
  redirect_url: string;
  open_in_new_tab: boolean;
  placement: string;
  category?: AdCategory;
  target_specialties: string[];
}

export interface FeedAd {
  id: number;
  title?: string;
  description?: string;
  image_url: string;
  image_alt_text?: string;
  redirect_url: string;
  open_in_new_tab: boolean;
  category: AdCategory;
  category_display: string;
  target_specialties: string[];
  client_name: string;
}

class AdvertisementService {
  // Module-level cache so re-fetches within 5 min are instant
  private static adCache = new Map<string, { data: ActiveAd[]; fetchedAt: number }>();
  private static readonly CACHE_TTL_MS       = 5 * 60 * 1000; // 5 min for results with ads
  private static readonly CACHE_TTL_EMPTY_MS = 15 * 1000;     // 15 s for empty results (avoid hammering)

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
    category?: string;
    search?: string;
  }): Promise<Advertisement[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.client) queryParams.append('client', params.client.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.placement) queryParams.append('placement', params.placement);
      if (params?.category) queryParams.append('category', params.category);
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
      if (data.category) formData.append('category', data.category);
      formData.append('priority', (data.priority || 0).toString());
      formData.append('start_date', data.start_date);
      formData.append('end_date', data.end_date);
      formData.append('status', data.status || 'draft');
      if (data.target_specialties !== undefined) {
        formData.append('target_specialties', JSON.stringify(data.target_specialties));
      }

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
      if (data.category) formData.append('category', data.category);
      if (data.priority !== undefined) formData.append('priority', data.priority.toString());
      if (data.start_date) formData.append('start_date', data.start_date);
      if (data.end_date) formData.append('end_date', data.end_date);
      if (data.status) formData.append('status', data.status);
      if (data.target_specialties !== undefined) {
        formData.append('target_specialties', JSON.stringify(data.target_specialties));
      }

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

  async getActiveAds(placement: string = 'home_banner', specialty?: string): Promise<ActiveAd[]> {
    const cacheKey = `${placement}:${specialty ?? ''}`;
    const cached = AdvertisementService.adCache.get(cacheKey);
    if (cached) {
      const ttl = cached.data.length > 0
        ? AdvertisementService.CACHE_TTL_MS
        : AdvertisementService.CACHE_TTL_EMPTY_MS;
      if (Date.now() - cached.fetchedAt < ttl) return cached.data;
    }

    try {
      const params = new URLSearchParams();
      if (placement) params.append('placement', placement);
      if (specialty) params.append('specialty', specialty);
      const response = await fetch(
        `${API_URL}/api/v1/advertising/public/ads/?${params.toString()}`
      );

      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

      const data: ActiveAd[] = await response.json();
      // Always cache — empty responses use a shorter TTL (see getter above)
      AdvertisementService.adCache.set(cacheKey, { data, fetchedAt: Date.now() });

      // Preload images so they appear instantly when the ad timer fires
      data.forEach(ad => {
        if (ad.image_url) {
          const img = new Image();
          img.src = ad.image_url;
        }
      });

      return data;
    } catch (error) {
      console.error('Error en getActiveAds:', error);
      return [];
    }
  }

  async getFeed(params?: { category?: string; specialty?: string; search?: string }): Promise<FeedAd[]> {
    try {
      const query = new URLSearchParams();
      if (params?.category) query.append('category', params.category);
      if (params?.specialty) query.append('specialty', params.specialty);
      if (params?.search) query.append('search', params.search);
      const response = await fetch(`${API_URL}/api/v1/advertising/public/feed/?${query.toString()}`);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error en getFeed:', error);
      return [];
    }
  }

  private _impressedIds = new Set<number>();

  async trackImpression(adId: number): Promise<void> {
    if (this._impressedIds.has(adId)) return;
    this._impressedIds.add(adId);
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