import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || '';
const SEEN_KEY = 'medico_announcements_last_seen';

export interface Announcement {
  id: number;
  title: string;
  body: string;
  is_active?: boolean;
  created_at: string;
  pushed_to?: number;
}

export const announcementService = {
  async getAnnouncements(): Promise<Announcement[]> {
    const res = await authService.authenticatedFetch(`${API_URL}/api/v1/communication/announcements/`);
    if (!res.ok) return [];
    return res.json();
  },

  // Admin
  async adminGetAll(): Promise<Announcement[]> {
    const res = await authService.authenticatedFetch(`${API_URL}/api/admin/announcements/`);
    if (!res.ok) throw new Error('No se pudieron cargar los anuncios');
    return res.json();
  },

  async adminCreate(title: string, body: string): Promise<Announcement> {
    const res = await authService.authenticatedFetch(`${API_URL}/api/admin/announcements/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Error al crear el anuncio');
    }
    return res.json();
  },

  async adminDelete(id: number): Promise<void> {
    const res = await authService.authenticatedFetch(`${API_URL}/api/admin/announcements/${id}/`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar el anuncio');
  },

  async adminToggle(id: number, isActive: boolean): Promise<void> {
    await authService.authenticatedFetch(`${API_URL}/api/admin/announcements/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  // Read tracking via localStorage
  getLastSeenId(): number {
    return parseInt(localStorage.getItem(SEEN_KEY) || '0', 10);
  },

  markAllSeen(latestId: number): void {
    localStorage.setItem(SEEN_KEY, String(latestId));
  },

  hasUnread(announcements: Announcement[]): boolean {
    if (!announcements.length) return false;
    return announcements[0].id > this.getLastSeenId();
  },
};
