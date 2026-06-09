// src/services/googleCalendarService.ts
// Uses Authorization Code flow: the backend exchanges the code for tokens and
// stores the refresh token encrypted in the database. The frontend only ever
// holds a short-lived access token in memory — nothing sensitive in localStorage.

import { Capacitor } from '@capacitor/core';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_URL = import.meta.env.VITE_API_URL || '';
const REDIRECT_URI = 'https://medicoapp.app/calendar';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

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

interface CachedToken {
  access_token: string;
  expires_at: number; // ms timestamp
  email: string;
}

class GoogleCalendarService {
  private gapiInited = false;
  // In-memory token cache — cleared on page reload (intentional: backend is the source of truth)
  private cachedToken: CachedToken | null = null;

  private getAppJwt(): string | null {
    return localStorage.getItem('medico_access_token');
  }

  private authHeaders(): Record<string, string> {
    const jwt = this.getAppJwt();
    return jwt ? { Authorization: `Bearer ${jwt}` } : {};
  }

  // ─── Connection status ────────────────────────────────────────────────────

  async checkStatus(): Promise<{ connected: boolean; email: string }> {
    const resp = await fetch(`${API_URL}/api/v1/medico/google-calendar/status/`, {
      headers: this.authHeaders(),
    });
    if (!resp.ok) return { connected: false, email: '' };
    return resp.json();
  }

  // ─── Token management ─────────────────────────────────────────────────────

  // Returns a valid access token, asking the backend to refresh if needed.
  // Result is cached in memory until 5 minutes before expiry.
  async getValidToken(): Promise<string | null> {
    const BUFFER_MS = 5 * 60 * 1000;
    if (this.cachedToken && Date.now() < this.cachedToken.expires_at - BUFFER_MS) {
      return this.cachedToken.access_token;
    }

    const resp = await fetch(`${API_URL}/api/v1/medico/google-calendar/token/`, {
      headers: this.authHeaders(),
    });

    if (!resp.ok) {
      this.cachedToken = null;
      return null;
    }

    const data = await resp.json();
    if (!data.connected || !data.access_token) {
      this.cachedToken = null;
      return null;
    }

    this.cachedToken = {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
      email: data.email || '',
    };

    return this.cachedToken.access_token;
  }

  isConnectedLocally(): boolean {
    // Fast synchronous check — true only when we already have a cached token
    if (!this.cachedToken) return false;
    return Date.now() < this.cachedToken.expires_at - 5 * 60 * 1000;
  }

  getCachedEmail(): string {
    return this.cachedToken?.email || '';
  }

  invalidateCache(): void {
    this.cachedToken = null;
  }

  // ─── OAuth flow ───────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    const state = `cal_${Date.now()}`;
    localStorage.setItem('google_oauth_state', state);

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');

    if (Capacitor.isNativePlatform()) {
      // On Android/iOS use Chrome Custom Tabs / SFSafariViewController.
      // Google blocks OAuth in embedded WebViews — Custom Tabs are required.
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: url.toString() });
    } else {
      window.location.href = url.toString();
    }
  }

  // Called on page load (web) or from appUrlOpen event (Android/iOS App Links).
  // sourceUrl: pass the full URL when called from appUrlOpen; omit for web page load.
  async handleOAuthCallback(sourceUrl?: string): Promise<'connected' | 'error' | false> {
    const isAppLink = !!sourceUrl;
    const params = isAppLink
      ? new URL(sourceUrl!).searchParams
      : new URLSearchParams(window.location.search);

    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (!code && !error) return false;

    // Clean the browser URL only on web (App Links don't change window.location)
    if (!isAppLink) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (error) throw new Error(`Error de Google: ${error}`);

    const savedState = localStorage.getItem('google_oauth_state');
    localStorage.removeItem('google_oauth_state');
    if (state !== savedState) throw new Error('Estado de OAuth inválido');

    const resp = await fetch(`${API_URL}/api/v1/medico/google-calendar/connect/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify({ code }),
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || 'No se pudo conectar con Google Calendar');
    }

    const data = await resp.json();
    this.cachedToken = {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
      email: data.email || '',
    };

    // GAPI init is best-effort — connection succeeds even if it fails (token is on the backend)
    try {
      await this.initGapi(data.access_token);
    } catch {
      // GAPI may fail due to CSP restrictions on some platforms (Safari PWA, etc.)
      // Calendar API calls will still work via getValidToken() → backend refresh
    }
    return 'connected';
  }

  async disconnect(): Promise<void> {
    await fetch(`${API_URL}/api/v1/medico/google-calendar/disconnect/`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    this.cachedToken = null;
    if (window.gapi?.client) window.gapi.client.setToken(null);
  }

  // ─── GAPI initialization ──────────────────────────────────────────────────

  private async initGapi(accessToken: string): Promise<void> {
    if (!this.gapiInited || !window.gapi?.client?.calendar) {
      await this.loadGapi();
    }
    window.gapi.client.setToken({ access_token: accessToken });
  }

  private loadGapi(): Promise<void> {
    if (this.gapiInited && window.gapi?.client?.calendar) return Promise.resolve();

    // 8-second timeout — prevents hanging forever when CSP blocks content.googleapis.com iframe
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('GAPI load timeout')), 8000)
    );

    return Promise.race([timeout, new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
      const script = existing ?? document.createElement('script');

      const init = async () => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
            if (!window.gapi.client.calendar) {
              await window.gapi.client.load('calendar', 'v3');
            }
            this.gapiInited = true;
            resolve();
          } catch {
            try {
              await window.gapi.client.load('calendar', 'v3');
              this.gapiInited = true;
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        });
      };

      if (existing) {
        init();
      } else {
        (script as HTMLScriptElement).src = 'https://apis.google.com/js/api.js';
        (script as HTMLScriptElement).async = true;
        (script as HTMLScriptElement).onload = init;
        (script as HTMLScriptElement).onerror = () =>
          reject(new Error('No se pudo cargar la librería de Google Calendar'));
        document.body.appendChild(script);
      }
    })]);
  }

  private async ensureToken(): Promise<void> {
    const token = await this.getValidToken();
    if (!token) throw new Error('No hay sesión de Google Calendar. Conéctate primero.');

    if (!window.gapi?.client?.calendar) await this.loadGapi();
    if (!window.gapi?.client?.calendar) throw new Error('La librería de Google Calendar no pudo cargarse.');

    window.gapi.client.setToken({ access_token: token });
  }

  private async handleApiError(error: unknown): Promise<never> {
    const e = error as { result?: { error?: { code?: number } }; status?: number };
    if (e?.result?.error?.code === 401 || e?.status === 401) {
      this.cachedToken = null;
      throw new Error('Sesión de Google Calendar expirada. Por favor, reconéctate.');
    }
    throw error;
  }

  // ─── Calendar API ─────────────────────────────────────────────────────────

  async getEvents(timeMin: Date = new Date(), timeMax?: Date): Promise<CalendarEvent[]> {
    try {
      await this.ensureToken();
      const request: GapiEventParams = {
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
      return this.handleApiError(error);
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
      return this.handleApiError(error);
    }
  }

  async updateEvent(eventId: string, event: CalendarEvent): Promise<void> {
    try {
      await this.ensureToken();
      await window.gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: event,
      });
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.ensureToken();
      await window.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });
    } catch (error) {
      return this.handleApiError(error);
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
