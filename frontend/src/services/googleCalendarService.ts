// src/services/googleCalendarService.ts

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const REDIRECT_URI = window.location.origin + '/calendar';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

class GoogleCalendarService {
  private gapiInited = false;
  private readonly STORAGE_PREFIX = 'medico_google_';
  private readonly TOKEN_EXPIRY_KEY = 'token_expiry';

  private getCurrentUserId(): string | null {
    const userStr = localStorage.getItem('medico_user');
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      return user.id?.toString() || null;
    } catch {
      return null;
    }
  }

  private getStorageKey(key: string): string {
    const userId = this.getCurrentUserId();
    if (!userId) return `${this.STORAGE_PREFIX}${key}`;
    return `${this.STORAGE_PREFIX}${userId}_${key}`;
  }

  setTokens(accessToken: string, expiresIn: number = 3600): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    const expiryTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem(this.getStorageKey('access_token'), accessToken);
    localStorage.setItem(this.getStorageKey('connected_user_id'), userId);
    localStorage.setItem(this.getStorageKey('token_timestamp'), Date.now().toString());
    localStorage.setItem(this.getStorageKey(this.TOKEN_EXPIRY_KEY), expiryTime.toString());
  }

  private isTokenExpired(): boolean {
    const expiryStr = localStorage.getItem(this.getStorageKey(this.TOKEN_EXPIRY_KEY));
    if (!expiryStr) return true;
    const expiryTime = parseInt(expiryStr);
    return Date.now() >= (expiryTime - 5 * 60 * 1000);
  }

  getAccessToken(): string | null {
    const userId = this.getCurrentUserId();
    const connectedUserId = localStorage.getItem(this.getStorageKey('connected_user_id'));

    if (userId && connectedUserId && userId !== connectedUserId) {
      this.clearTokens();
      return null;
    }

    if (this.isTokenExpired()) {
      this.clearTokens();
      return null;
    }

    return localStorage.getItem(this.getStorageKey('access_token'));
  }

  clearTokens(): void {
    localStorage.removeItem(this.getStorageKey('access_token'));
    localStorage.removeItem(this.getStorageKey('connected_user_id'));
    localStorage.removeItem(this.getStorageKey('token_timestamp'));
    localStorage.removeItem(this.getStorageKey(this.TOKEN_EXPIRY_KEY));
  }

  isConnected(): boolean {
    if (!this.getCurrentUserId()) return false;
    return !!this.getAccessToken();
  }

  async initialize(): Promise<void> {
    if (this.gapiInited && (window as any).gapi?.client?.calendar) return;

    return new Promise((resolve, reject) => {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;

      gapiScript.onload = () => {
        (window as any).gapi.load('client', async () => {
          try {
            await (window as any).gapi.client.init({
              apiKey: GOOGLE_API_KEY,
              discoveryDocs: [DISCOVERY_DOC],
            });

            if (!(window as any).gapi.client.calendar) {
              await (window as any).gapi.client.load('calendar', 'v3');
            }

            this.gapiInited = true;
            resolve();
          } catch (error: any) {
            try {
              await (window as any).gapi.client.load('calendar', 'v3');
              this.gapiInited = true;
              resolve();
            } catch {
              reject(error);
            }
          }
        });
      };

      gapiScript.onerror = () => {
        reject(new Error('No se pudo cargar la librería de Google Calendar'));
      };

      document.body.appendChild(gapiScript);
    });
  }

  async connect(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const state = `user_${userId}_${Date.now()}`;
    localStorage.setItem('google_oauth_state', state);

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', SCOPES);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('prompt', 'consent');

    window.location.href = authUrl.toString();
  }

  async handleOAuthCallback(): Promise<boolean> {
    const hash = window.location.hash;
    if (!hash) return false;

    try {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const state = params.get('state');
      const error = params.get('error');
      const expiresIn = params.get('expires_in');

      if (error) throw new Error(`Error de OAuth: ${error}`);
      if (!accessToken) return false;

      const savedState = localStorage.getItem('google_oauth_state');
      if (state !== savedState) throw new Error('Estado de OAuth inválido');

      const expirySeconds = expiresIn ? parseInt(expiresIn) : 3600;
      this.setTokens(accessToken, expirySeconds);

      await this.initialize();
      (window as any).gapi.client.setToken({ access_token: accessToken });

      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.removeItem('google_oauth_state');

      return true;
    } catch (error) {
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.removeItem('google_oauth_state');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const token = this.getAccessToken();
    if (token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: 'POST' });
      } catch {
        // revocación best-effort
      }
    }

    this.clearTokens();

    if ((window as any).gapi?.client) {
      (window as any).gapi.client.setToken(null);
    }
  }

  private async ensureToken(): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('No hay token de acceso disponible. Conéctate primero.');

    if (!(window as any).gapi?.client?.calendar) {
      await this.initialize();
    }

    if (!(window as any).gapi?.client?.calendar) {
      throw new Error('La librería de Google Calendar no pudo cargarse.');
    }

    (window as any).gapi.client.setToken({ access_token: token });
  }

  private async handleApiError(error: any): Promise<void> {
    if (error?.result?.error?.code === 401 || error?.status === 401) {
      this.clearTokens();
      throw new Error('Sesión de Google Calendar expirada. Por favor, reconéctate.');
    }
    throw error;
  }

  async getEvents(timeMin: Date = new Date(), timeMax?: Date): Promise<CalendarEvent[]> {
    try {
      await this.ensureToken();

      const request: any = {
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime',
      };

      if (timeMax) request.timeMax = timeMax.toISOString();

      const response = await (window as any).gapi.client.calendar.events.list(request);
      return response.result.items || [];
    } catch (error) {
      await this.handleApiError(error);
      return [];
    }
  }

  async createEvent(event: CalendarEvent): Promise<string> {
    try {
      await this.ensureToken();
      const response = await (window as any).gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      return response.result.id;
    } catch (error) {
      await this.handleApiError(error);
      throw new Error('No se pudo crear el evento');
    }
  }

  async updateEvent(eventId: string, event: CalendarEvent): Promise<void> {
    try {
      await this.ensureToken();
      await (window as any).gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
      });
    } catch (error) {
      await this.handleApiError(error);
      throw new Error('No se pudo actualizar el evento');
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.ensureToken();
      await (window as any).gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
    } catch (error) {
      await this.handleApiError(error);
      throw new Error('No se pudo eliminar el evento');
    }
  }

  getUserEmail(): string | null {
    const token = (window as any).gapi?.client?.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.id_token?.split('.')[1] || ''));
      return payload.email || null;
    } catch {
      return null;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
