// services/colleaguesService.ts
import axios from 'axios';

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
  private getAuthHeaders() {
    const token = localStorage.getItem('medico_access_token');
    
    if (!token) {
      console.warn('⚠️ No se encontró el token de autenticación');
    }
    
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Buscar colega por código
   */
  async searchColleague(friendCode: string): Promise<SearchColleagueResponse> {
    const response = await axios.post(
      `${API_URL}/api/auth/colleagues/search/`,
      { friend_code: friendCode },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  /**
   * Enviar solicitud de amistad
   */
  async sendFriendRequest(friendCode: string): Promise<{ message: string; friend_request: FriendRequest }> {
    const response = await axios.post(
      `${API_URL}/api/auth/friend-requests/send/`,
      { friend_code: friendCode },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  /**
   * Obtener lista de colegas
   */
  async getColleagues(): Promise<{ count: number; colleagues: Colleague[] }> {
    const response = await axios.get(
      `${API_URL}/api/auth/colleagues/`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  /**
   * Obtener solicitudes de amistad (enviadas y recibidas)
   */
  async getFriendRequests(): Promise<FriendRequestsResponse> {
    const response = await axios.get(
      `${API_URL}/api/auth/friend-requests/`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  /**
   * Aceptar solicitud de amistad
   */
  async acceptFriendRequest(requestId: number): Promise<{ message: string; colleague: Colleague }> {
    const response = await axios.post(
      `${API_URL}/api/auth/friend-requests/${requestId}/accept/`,
      {},
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  /**
   * Rechazar solicitud de amistad
   */
  async rejectFriendRequest(requestId: number): Promise<{ message: string }> {
    const response = await axios.post(
      `${API_URL}/api/auth/friend-requests/${requestId}/reject/`,
      {},
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  /**
   * Eliminar colega
   */
  async removeColleague(colleagueId: number): Promise<{ message: string }> {
    const response = await axios.delete(
      `${API_URL}/api/auth/colleagues/${colleagueId}/`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }
}

export const colleaguesService = new ColleaguesService();