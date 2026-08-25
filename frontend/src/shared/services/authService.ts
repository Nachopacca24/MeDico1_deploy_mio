// src/shared/services/authService.ts

import { parseAuthError, AuthError, NetworkError, TokenRefreshError } from './authErrors';
import { googleCalendarService } from '@/services/googleCalendarService';
import { pushNotificationService } from '@/services/pushNotificationService';

const API_URL = import.meta.env.VITE_API_URL || '';
const AUTH_ENDPOINTS = {
  register: `${API_URL}/api/auth/register/`,
  login: `${API_URL}/api/auth/login/`,
  logout: `${API_URL}/api/auth/logout/`,
  refresh: `${API_URL}/api/auth/refresh/`,
  me: `${API_URL}/api/auth/me/`,
  changePassword: `${API_URL}/api/auth/change-password/`,
  google: `${API_URL}/api/auth/google/`,
  apple: `${API_URL}/api/auth/apple/`,
  forgotPassword: `${API_URL}/api/auth/forgot-password/`,
  resetPassword: `${API_URL}/api/auth/reset-password/`,
  deleteAccount: `${API_URL}/api/auth/delete-account/`,
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
  plan: 'free' | 'premium';
  trial_ends_at: string | null;
  is_permanent_premium: boolean;
  ls_renews_at: string | null;
  ls_cancelled: boolean;
  ls_payment_overdue_since: string | null;
  ls_payment_failed_downgrade: boolean;
  has_premium_access: boolean;
  credit_days: number;
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
  surgery_reminder_hours: number;
  receives_announcements: boolean;
  receives_reminders: boolean;
  is_profile_complete: boolean;
  has_usable_password: boolean;
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
  referral_code?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
  email_verification_sent?: boolean;
  // Set when this signup/first-login used a colleague's referral code and it
  // was applied successfully — the referrer's display name, for the
  // "you're now colleagues" toast. null/undefined otherwise.
  colleague_name?: string | null;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
  new_password2: string;
}

// Refresh token persists in localStorage; access token lives in memory only.
// This eliminates XSS access-token theft: memory is not reachable from injected scripts.
const TOKEN_STORAGE_KEYS = {
  refresh: 'medico_refresh_token',
  user: 'medico_user',
  lastUserId: 'medico_last_user_id',
};

// Purge any legacy access token left in localStorage from older versions
if (typeof window !== 'undefined') {
  localStorage.removeItem('medico_access_token');
}

class AuthService {
  private refreshPromise: Promise<string> | null = null;
  private _accessToken: string | null = null; // lives in memory only

  private saveTokens(tokens: AuthTokens): void {
    this._accessToken = tokens.access;
    localStorage.setItem(TOKEN_STORAGE_KEYS.refresh, tokens.refresh);
  }

  /**
   * 🔒 Guardar información del usuario en localStorage
   */
  private saveUser(user: User): void {
    const previousUserId = localStorage.getItem(TOKEN_STORAGE_KEYS.lastUserId);
    const currentUserId = user.id.toString();
    if (previousUserId && previousUserId !== currentUserId) {
      googleCalendarService.invalidateCache();
    }
    // User PII is NOT persisted to localStorage — only lastUserId for cache invalidation
    localStorage.setItem(TOKEN_STORAGE_KEYS.lastUserId, currentUserId);
  }

  getAccessToken(): string | null {
    return this._accessToken;
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.refresh);
  }

  /**
   * Obtener usuario almacenado en localStorage
   */
  getCurrentUser(): User | null {
    return null; // User data is never persisted locally — always fetched from server
  }

  /**
   * 🔒 Limpiar todos los datos de autenticación
   */
  clearAuth(): void {
    this._accessToken = null;
    localStorage.removeItem(TOKEN_STORAGE_KEYS.refresh);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.lastUserId);
    localStorage.removeItem('medico_user'); // purge legacy key if present

    // 🔒 CRÍTICO: Limpiar tokens de Google Calendar
    googleCalendarService.invalidateCache();

    // 🔒 CRÍTICO: si otro usuario inicia sesión en este mismo dispositivo sin que la
    // app se reinicie, esto evita que el token de push (FCM) siga asociado a esta
    // cuenta — sin esto, el próximo login no lo re-registraría y las notificaciones
    // de esta cuenta podrían seguir llegando al dispositivo del otro usuario.
    pushNotificationService.markStale();
  }

  // A session exists if there's a refresh token — access token restores itself on first request
  isAuthenticated(): boolean {
    return !!this.getRefreshToken();
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

      const rawBody = await response.text();
      let result: AuthResponse;
      try {
        result = JSON.parse(rawBody);
      } catch {
        console.error('[register] Invalid JSON response', { status: response.status, url: AUTH_ENDPOINTS.register, body: rawBody.slice(0, 500) || '(vacía)' });
        throw new NetworkError('El servidor devolvió una respuesta inválida. Intentá de nuevo en unos minutos.');
      }

      // Guardar tokens y usuario
      this.saveTokens(result.tokens);
      this.saveUser(result.user);

      return result;
    } catch (error) {
      if (error instanceof NetworkError || error instanceof AuthError) throw error;
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
    const url = AUTH_ENDPOINTS.login;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        // parseAuthError already builds a clean, user-facing AuthError — throw it
        // as-is instead of wrapping it in a NetworkError with the raw URL baked
        // into the message (that used to end up shown directly in the UI toast).
        throw await parseAuthError(response);
      }

      const rawBody = await response.text();
      let result: AuthResponse;
      try {
        result = JSON.parse(rawBody);
      } catch {
        console.error('[login] Invalid JSON response', { status: response.status, url, body: rawBody.slice(0, 500) || '(vacía)' });
        throw new NetworkError('El servidor devolvió una respuesta inválida. Intentá de nuevo en unos minutos.');
      }

      this.saveTokens(result.tokens);
      this.saveUser(result.user);

      return result;
    } catch (error) {
      if (error instanceof NetworkError || error instanceof AuthError) throw error;
      if (error instanceof TypeError) {
        // TypeError: "Failed to fetch" → CORS bloqueado o sin red
        console.error('[login] Network-level failure', { url, detail: (error as TypeError).message });
        throw new NetworkError('No se pudo conectar. Verificá tu conexión a internet e intentá de nuevo.');
      }
      throw error;
    }
  }

  /**
   * 🔒 Login con Google
   */
  async loginWithGoogle(token: string, referralCode?: string): Promise<AuthResponse> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.google, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, ...(referralCode ? { referral_code: referralCode } : {}) }),
      });

      if (!response.ok) {
        throw await parseAuthError(response);
      }

      const result: AuthResponse = await response.json();

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
   * 🍎 Login con Apple (Sign in with Apple)
   */
  async loginWithApple(payload: {
    identity_token: string;
    given_name?: string | null;
    family_name?: string | null;
    email?: string | null;
    referral_code?: string;
  }): Promise<AuthResponse> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.apple, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw await parseAuthError(response);
      }

      const rawBody = await response.text();
      let result: AuthResponse;
      try {
        result = JSON.parse(rawBody);
      } catch {
        console.error('[loginWithApple] Invalid JSON response', { status: response.status, url: AUTH_ENDPOINTS.apple, body: rawBody.slice(0, 500) || '(vacía)' });
        throw new NetworkError('El servidor devolvió una respuesta inválida. Intentá de nuevo en unos minutos.');
      }
      this.saveTokens(result.tokens);
      this.saveUser(result.user);
      return result;
    } catch (error) {
      if (error instanceof NetworkError || error instanceof AuthError) throw error;
      if (error instanceof TypeError) {
        throw new NetworkError();
      }
      throw error;
    }
  }

  /**
   * 🔒 Logout de usuario
   *
   * clearAuth() es lo único de lo que depende un logout correcto (borra los
   * tokens locales y llama a markStale() para el próximo login) — por eso corre
   * de forma síncrona, ya. El blacklist del refresh token en el backend y la
   * baja del push token son solo limpieza del lado del servidor: no bloquean
   * al usuario, se disparan en background ("fire and forget") para que cerrar
   * sesión sea instantáneo en vez de esperar dos round-trips de red seguidos.
   */
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    const accessToken = this.getAccessToken();

    if (refreshToken) {
      fetch(AUTH_ENDPOINTS.logout, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh: refreshToken }),
      }).catch(error => console.error('Error durante logout:', error));
    }

    pushNotificationService.removeToken().catch(() => {
      /* clearAuth().markStale() below still protects the next login */
    });

    // 🔒 CRÍTICO: Limpiar TODOS los datos (incluyendo Google Calendar)
    this.clearAuth();
  }

  /**
   * Eliminar cuenta propia del usuario
   */
  async deleteAccount(payload: { password?: string; confirmation?: string }): Promise<void> {
    const refreshToken = this.getRefreshToken();
    const response = await this.authenticatedFetch(AUTH_ENDPOINTS.deleteAccount, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, refresh: refreshToken }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'No se pudo eliminar la cuenta.');
    }
    this.clearAuth();
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
        this._accessToken = result.access;
        if (result.refresh) {
          localStorage.setItem(TOKEN_STORAGE_KEYS.refresh, result.refresh);
        }

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

  async forgotPassword(email: string): Promise<void> {
    const response = await fetch(AUTH_ENDPOINTS.forgotPassword, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      throw await parseAuthError(response);
    }
  }

  async resetPassword(token: string, new_password: string, new_password2: string): Promise<void> {
    const response = await fetch(AUTH_ENDPOINTS.resetPassword, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password, confirm_password: new_password2 }),
    });
    if (!response.ok) {
      throw await parseAuthError(response);
    }
  }

  /**
   * Realizar fetch con autenticación automática
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // If no access token in memory (e.g. page reload), restore it via refresh token
    let accessToken = this.getAccessToken();
    if (!accessToken) {
      try {
        accessToken = await this.refreshAccessToken();
      } catch {
        this.clearAuth();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
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
