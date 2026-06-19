import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || '';

export interface SiteSettings {
  PREMIUM_PRICE: string;
  ANNUAL_PRICE: string;
  TRIAL_DAYS: string;
  ANDROID_TESTERS_COUNT: string;
  ANDROID_MIN_VERSION: string;
}

export const siteSettingsService = {
  async getPublic(): Promise<SiteSettings> {
    const res = await fetch(`${API_URL}/api/v1/settings/`);
    if (!res.ok) return { PREMIUM_PRICE: '7', ANNUAL_PRICE: '84', TRIAL_DAYS: '30', ANDROID_TESTERS_COUNT: '12', ANDROID_MIN_VERSION: '1.0' };
    return res.json();
  },

  async getAdmin(): Promise<SiteSettings> {
    const res = await authService.authenticatedFetch(`${API_URL}/api/admin/settings/`);
    if (!res.ok) throw new Error('Error al cargar configuración');
    return res.json();
  },

  async update(data: Partial<SiteSettings>): Promise<void> {
    const res = await authService.authenticatedFetch(`${API_URL}/api/admin/settings/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al guardar');
    }
  },
};
