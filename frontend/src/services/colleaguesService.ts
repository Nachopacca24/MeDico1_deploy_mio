// services/colleaguesService.ts
import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Colleague {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  specialty: string | null;
  hospital_default: string | null;
  avatar: string | null;
  friend_code: string;
  phone: string | null;
}

export interface FriendRequest {
  id: number;
  from_user: Colleague;
  to_user: Colleague;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface FriendRequestsResponse {
  received: {
    count: number;
    requests: FriendRequest[];
  };
  sent: {
    count: number;
    requests: FriendRequest[];
  };
}

export interface SearchColleagueResponse extends Colleague {
  are_friends: boolean;
  pending_request: boolean;
}

class ColleaguesService {
  /**
   * Wraps authService.authenticatedFetch (which transparently refreshes an
   * expired access token and retries once on 401) instead of calling axios
   * directly with a synchronous, never-refreshed token. The previous
   * axios-based version had no refresh path at all, so once a user's access
   * token expired mid-session, every call here — including the 60s
   * pending-colleague-request poll in useInvitationBadges — failed with a
   * silent, permanent 401 until the user reloaded the app.
   *
   * Throws an axios-shaped error ({ response: { status, data } }) so the
   * existing `error.response?.data?.error` handling in ColleaguesPage.tsx
   * keeps working unchanged.
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await authService.authenticatedFetch(`${API_URL}${path}`, options);
    if (!response.ok) {
      let data: any = {};
      try { data = await response.json(); } catch { /* empty/non-JSON error body */ }
      throw { response: { status: response.status, data } };
    }
    return response.json();
  }

  /**
   * Buscar colega por código
   */
  async searchColleague(friendCode: string): Promise<SearchColleagueResponse> {
    return this.request('/api/auth/colleagues/search/', {
      method: 'POST',
      body: JSON.stringify({ friend_code: friendCode }),
    });
  }

  /**
   * Enviar solicitud de amistad
   */
  async sendFriendRequest(friendCode: string): Promise<{ message: string; friend_request: FriendRequest }> {
    return this.request('/api/auth/friend-requests/send/', {
      method: 'POST',
      body: JSON.stringify({ friend_code: friendCode }),
    });
  }

  /**
   * Obtener lista de colegas
   */
  async getColleagues(): Promise<{ count: number; colleagues: Colleague[] }> {
    return this.request('/api/auth/colleagues/');
  }

  /**
   * Obtener solicitudes de amistad (enviadas y recibidas)
   */
  async getFriendRequests(): Promise<FriendRequestsResponse> {
    return this.request('/api/auth/friend-requests/');
  }

  /**
   * Aceptar solicitud de amistad
   */
  async acceptFriendRequest(requestId: number): Promise<{ message: string; colleague: Colleague }> {
    return this.request(`/api/auth/friend-requests/${requestId}/accept/`, { method: 'POST' });
  }

  /**
   * Rechazar solicitud de amistad
   */
  async rejectFriendRequest(requestId: number): Promise<{ message: string }> {
    return this.request(`/api/auth/friend-requests/${requestId}/reject/`, { method: 'POST' });
  }

  /**
   * Eliminar colega
   */
  async removeColleague(colleagueId: number): Promise<{ message: string }> {
    return this.request(`/api/auth/colleagues/${colleagueId}/`, { method: 'DELETE' });
  }
}

export const colleaguesService = new ColleaguesService();
