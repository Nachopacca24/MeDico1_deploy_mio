// src/services/googleCalendarService.ts

// Minimal type shim for the dynamically-loaded Google API client.
interface GapiEventParams {
  calendarId: string;
  [key: string]: unknown;
}
interface GapiCalendarClient {
  events: {
    list(params: GapiEventParams): Promise<{ result: { items: CalendarEvent[] } }>;
    insert(params: GapiEventParams & { resource: CalendarEvent }): Promise<{ result: { id: string } }>;
    update(params: GapiEventParams & { eventId: string; resource: CalendarEvent }): Promise<unknown>;
    delete(params: GapiEventParams & { eventId: string }): Promise<unknown>;
  };
}
interface GapiClientLib {
  init(config: { discoveryDocs: string[] }): Promise<void>;
  load(api: string, version: string): Promise<void>;
  setToken(token: { access_token: string } | null): void;
  getToken(): { access_token: string } | null;
  calendar: GapiCalendarClient;
}
declare global {
  interface Window {
    gapi: {
      load(api: string, callback: () => void): void;
      client: GapiClientLib;
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// Single redirect URI for all platforms (web + Android App Links).
// Google requires https for sensitive scopes — custom URI schemes are not allowed.
const REDIRECT_URI = 'https://medicoapp.app/calendar';

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
  private readonly EMAIL_KEY = 'user_email';
  private readonly LAST_CONNECT_KEY = 'last_connect';

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

  setTokens(accessToken: string, expiresIn: number = 3600, email?: string): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;

    const expiryTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem(this.getStorageKey('access_token'), accessToken);
    localStorage.setItem(this.getStorageKey('connected_user_id'), userId);
    localStorage.setItem(this.getStorageKey('token_timestamp'), Date.now().toString());
    localStorage.setItem(this.getStorageKey(this.TOKEN_EXPIRY_KEY), expiryTime.toString());
    localStorage.setItem(this.getStorageKey(this.LAST_CONNECT_KEY), Date.now().toString());
    if (email) {
      localStorage.setItem(this.getStorageKey(this.EMAIL_KEY), email);
    }
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

    // Don't clear tokens on expiry — keep them so we know the user was connected
    // and can attempt a silent refresh.
    if (this.isTokenExpired()) return null;

    return localStorage.getItem(this.getStorageKey('access_token'));
  }

  // True if there are stored credentials for the current user (even if expired).
  hasStoredCredentials(): boolean {
    const userId = this.getCurrentUserId();
    if (!userId) return false;
    const connectedUserId = localStorage.getItem(this.getStorageKey('connected_user_id'));
    if (!connectedUserId || connectedUserId !== userId) return false;
    return !!localStorage.getItem(this.getStorageKey('access_token'));
  }

  // Returns ms elapsed since last successful connect, or null if never connected.
  getTimeSinceLastConnect(): number | null {
    const lastConnectStr = localStorage.getItem(this.getStorageKey(this.LAST_CONNECT_KEY));
    if (!lastConnectStr) return null;
    return Date.now() - parseInt(lastConnectStr);
  }

  clearTokens(): void {
    localStorage.removeItem(this.getStorageKey('access_token'));
    localStorage.removeItem(this.getStorageKey('connected_user_id'));
    localStorage.removeItem(this.getStorageKey('token_timestamp'));
    localStorage.removeItem(this.getStorageKey(this.TOKEN_EXPIRY_KEY));
    localStorage.removeItem(this.getStorageKey(this.EMAIL_KEY));
    localStorage.removeItem(this.getStorageKey(this.LAST_CONNECT_KEY));
  }

  isConnected(): boolean {
    if (!this.getCurrentUserId()) return false;
    return !!this.getAccessToken();
  }

  async initialize(): Promise<void> {
    if (this.gapiInited && window.gapi?.client?.calendar) return;

    return new Promise((resolve, reject) => {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;

      gapiScript.onload = () => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              discoveryDocs: [DISCOVERY_DOC],
                });

            if (!window.gapi.client.calendar) {
              await window.gapi.client.load('calendar', 'v3');
            }

            this.gapiInited = true;
            resolve();
          } catch (error: any) {
            try {
              await window.gapi.client.load('calendar', 'v3');
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

  private buildAuthUrl(state: string, prompt: 'consent' | 'select_account' | 'none'): string {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', SCOPES);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('prompt', prompt);
    return authUrl.toString();
  }

  async connect(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const state = `user_${userId}_${Date.now()}`;
    localStorage.setItem('google_oauth_state', state);

    // select_account: no vuelve a pedir permisos si ya fueron otorgados, solo elegir cuenta
    window.location.href = this.buildAuthUrl(state, 'select_account');
  }

  // Attempts a silent token refresh without any visible UI.
  // Uses sessionStorage to guard against infinite redirect loops when Google
  // cannot refresh silently (interaction_required).
  async connectSilent(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) throw new Error('Usuario no autenticado');

    const state = `silent_${userId}_${Date.now()}`;
    localStorage.setItem('google_oauth_state', state);
    localStorage.setItem('google_oauth_silent', '1');

    window.location.href = this.buildAuthUrl(state, 'none');
  }

  // Returns 'connected' on success, 'silent_failed' when prompt=none couldn't
  // refresh silently (user needs to interact), or false if there was no OAuth
  // response in the URL.
  async handleOAuthCallback(): Promise<'connected' | 'silent_failed' | false> {
    // On Android the deep link delivers params in the hash or query string
    const hash = window.location.hash;
    const search = window.location.search;
    const raw = hash ? hash.substring(1) : search ? search.substring(1) : '';
    if (!raw) return false;

    const params = new URLSearchParams(raw);
    const accessToken = params.get('access_token');
    const state = params.get('state');
    const error = params.get('error');
    const expiresIn = params.get('expires_in');

    const isSilent = localStorage.getItem('google_oauth_silent') === '1';
    const savedState = localStorage.getItem('google_oauth_state');

    // Clean up URL and flags immediately so back-navigation never re-processes
    window.history.replaceState({}, document.title, window.location.pathname);
    localStorage.removeItem('google_oauth_state');
    localStorage.removeItem('google_oauth_silent');

    if (error) {
      if (isSilent) return 'silent_failed';
      throw new Error(`Error de OAuth: ${error}`);
    }

    if (!accessToken) return false;

    if (state !== savedState) throw new Error('Estado de OAuth inválido');

    const expirySeconds = expiresIn ? parseInt(expiresIn) : 3600;

    // Fetch email from tokeninfo — implicit flow doesn't return an id_token.
    let email: string | undefined;
    try {
      const resp = await fetch(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
      );
      if (resp.ok) {
        const info = await resp.json();
        email = info.email;
      }
    } catch {
      // non-critical — email display is best-effort
    }

    this.setTokens(accessToken, expirySeconds, email);

    await this.initialize();
    window.gapi.client.setToken({ access_token: accessToken });

    return 'connected';
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

    if (window.gapi?.client) {
      window.gapi.client.setToken(null);
    }
  }

  private async ensureToken(): Promise<void> {
    const token = this.getAccessToken();
    if (!token) throw new Error('No hay token de acceso disponible. Conéctate primero.');

    if (!window.gapi?.client?.calendar) {
      await this.initialize();
    }

    if (!window.gapi?.client?.calendar) {
      throw new Error('La librería de Google Calendar no pudo cargarse.');
    }

    window.gapi.client.setToken({ access_token: token });
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

      const response = await window.gapi.client.calendar.events.list(request);
      return response.result.items || [];
    } catch (error) {
      await this.handleApiError(error);
      return [];
    }
  }

  async createEvent(event: CalendarEvent): Promise<string> {
    try {
      await this.ensureToken();
      const response = await window.gapi.client.calendar.events.insert({
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
      await window.gapi.client.calendar.events.update({
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
      await window.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
    } catch (error) {
      await this.handleApiError(error);
      throw new Error('No se pudo eliminar el evento');
    }
  }

  getUserEmail(): string | null {
    return localStorage.getItem(this.getStorageKey(this.EMAIL_KEY));
  }
}

export const googleCalendarService = new GoogleCalendarService();
