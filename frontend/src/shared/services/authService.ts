// src/shared/services/authService.ts

import { parseAuthError, NetworkError, TokenRefreshError } from './authErrors';
import { googleCalendarService } from '@/services/googleCalendarService';

const API_URL = import.meta.env.VITE_API_URL || '';
const AUTH_ENDPOINTS = {
  register: `${API_URL}/api/auth/register/`,
  login: `${API_URL}/api/auth/login/`,
  logout: `${API_URL}/api/auth/logout/`,
  refresh: `${API_URL}/api/auth/refresh/`,
  me: `${API_URL}/api/auth/me/`,
  changePassword: `${API_URL}/api/auth/change-password/`,
  google: `${API_URL}/api/auth/google/`,
};

// Tipos TypeScript
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: number;
  is_admin: boolean;
  plan: string;
  friend_code: string;
  name: string;
  phone?: string;
  specialty?: string;
  license_number?: string;
  hospital_default?: string;
  avatar?: string;
  signature_image?: string;
  is_verified: boolean;
  is_email_verified: boolean;
  theme_preference: 'light' | 'dark' | 'system';
  is_profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  phone?: string;
  specialty?: string;
  license_number?: string;
  hospital_default?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
  email_verification_sent?: boolean;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
  new_password2: string;
}

// Manejo de tokens en localStorage
const TOKEN_STORAGE_KEYS = {
  access: 'medico_access_token',
  refresh: 'medico_refresh_token',
  user: 'medico_user',
  lastUserId: 'medico_last_user_id',
};

class AuthService {
  private refreshPromise: Promise<string> | null = null;

  /**
   * Guardar tokens en localStorage
   */
  private saveTokens(tokens: AuthTokens): void {
    localStorage.setItem(TOKEN_STORAGE_KEYS.access, tokens.access);
    localStorage.setItem(TOKEN_STORAGE_KEYS.refresh, tokens.refresh);
  }

  /**
   * 🔒 Guardar información del usuario en localStorage
   */
  private saveUser(user: User): void {
    const previousUserId = localStorage.getItem(TOKEN_STORAGE_KEYS.lastUserId);
    const currentUserId = user.id.toString();

    // Si el usuario cambió, limpiar tokens de Google Calendar
    if (previousUserId && previousUserId !== currentUserId) {
      console.log(`🔄 Usuario cambió de ${previousUserId} a ${currentUserId}, limpiando Google Calendar`);
      googleCalendarService.clearTokens();
    }

    localStorage.setItem(TOKEN_STORAGE_KEYS.user, JSON.stringify(user));
    localStorage.setItem(TOKEN_STORAGE_KEYS.lastUserId, currentUserId);
  }

  /**
   * Obtener access token de localStorage
   */
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.access);
  }

  /**
   * Obtener refresh token de localStorage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.refresh);
  }

  /**
   * Obtener usuario almacenado en localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(TOKEN_STORAGE_KEYS.user);
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * 🔒 Limpiar todos los datos de autenticación
   */
  clearAuth(): void {
    console.log('🧹 Limpiando todos los datos de autenticación');

    // Limpiar tokens de autenticación
    localStorage.removeItem(TOKEN_STORAGE_KEYS.access);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.refresh);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.user);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.lastUserId);

    // 🔒 CRÍTICO: Limpiar tokens de Google Calendar
    googleCalendarService.clearTokens();
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Registrar nuevo usuario
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw await parseAuthError(response);
      }

      const result: AuthResponse = await response.json();

      // Guardar tokens y usuario
      this.saveTokens(result.tokens);
      this.saveUser(result.user);

      return result;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new NetworkError();
      }
      throw error;
    }
  }

  /**
   * 🔒 Login de usuario
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw await parseAuthError(response);
      }

      const result: AuthResponse = await response.json();

      // Guardar tokens y usuario (esto limpiará Google Calendar si es usuario diferente)
      this.saveTokens(result.tokens);
      this.saveUser(result.user);

      console.log(`✅ Login exitoso para usuario: ${result.user.email}`);

      return result;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new NetworkError();
      }
      throw error;
    }
  }

  /**
   * 🔒 Login con Google
   */
  async loginWithGoogle(token: string): Promise<AuthResponse> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.google, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw await parseAuthError(response);
      }

      const result: AuthResponse = await response.json();

      this.saveTokens(result.tokens);
      this.saveUser(result.user);

      console.log(`✅ Login con Google exitoso para usuario: ${result.user.email}`);

      return result;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new NetworkError();
      }
      throw error;
    }
  }

  /**
   * 🔒 Logout de usuario
   */
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    const currentUser = this.getCurrentUser();

    console.log(`🚪 Logout de usuario: ${currentUser?.email || 'unknown'}`);

    if (refreshToken) {
      try {
        await fetch(AUTH_ENDPOINTS.logout, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAccessToken()}`,
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      } catch (error) {
        console.error('Error durante logout:', error);
      }
    }

    // 🔒 CRÍTICO: Limpiar TODOS los datos (incluyendo Google Calendar)
    this.clearAuth();

    console.log('✅ Logout completado');
  }

  /**
   * Renovar access token usando refresh token
   */
  async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new TokenRefreshError('No refresh token available');
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(AUTH_ENDPOINTS.refresh, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!response.ok) {
          throw new TokenRefreshError('Refresh token expired or invalid');
        }

        const result = await response.json();
        localStorage.setItem(TOKEN_STORAGE_KEYS.access, result.access);

        return result.access;
      } catch (error) {
        if (error instanceof TypeError) {
          throw new NetworkError();
        }
        this.clearAuth();
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Obtener información del usuario actual desde el servidor
   */
  async fetchCurrentUser(): Promise<User> {
    const response = await this.authenticatedFetch(AUTH_ENDPOINTS.me);

    if (!response.ok) {
      throw new Error('Unable to fetch user data');
    }

    const user: User = await response.json();
    this.saveUser(user);

    return user;
  }

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await this.authenticatedFetch(AUTH_ENDPOINTS.me, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await parseAuthError(response);
    }

    const result = await response.json();
    this.saveUser(result.user);

    return result.user;
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    const response = await this.authenticatedFetch(AUTH_ENDPOINTS.changePassword, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await parseAuthError(response);
    }
  }

  /**
   * Realizar fetch con autenticación automática
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error('No access token available');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      ...(options.headers as Record<string, string>),
    };

    let bodyToSend = options.body;

    if (options.body instanceof FormData) {
      // FormData - no agregar Content-Type
    } else if (options.body) {
      headers['Content-Type'] = 'application/json';

      if (typeof options.body === 'string') {
        bodyToSend = options.body;
      } else {
        bodyToSend = JSON.stringify(options.body);
      }
    }

    let response = await fetch(url, {
      ...options,
      headers,
      body: bodyToSend,
    });

    if (response.status === 401) {
      try {
        const newAccessToken = await this.refreshAccessToken();

        const retryHeaders: Record<string, string> = {
          'Authorization': `Bearer ${newAccessToken}`,
          ...(options.headers as Record<string, string>),
        };

        let retryBody = options.body;

        if (options.body instanceof FormData) {
          // FormData - no hacer nada
        } else if (options.body) {
          retryHeaders['Content-Type'] = 'application/json';
          retryBody = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }

        response = await fetch(url, {
          ...options,
          headers: retryHeaders,
          body: retryBody,
        });
      } catch (error) {
        this.clearAuth();
        window.location.href = '/login';
        throw error;
      }
    }

    return response;
  }
}

export const authService = new AuthService();
