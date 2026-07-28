// src/services/googleCalendarService.ts
// Uses Authorization Code flow: the backend exchanges the code for tokens and
// stores the refresh token encrypted in the database. The frontend only ever
// holds a short-lived access token in memory — nothing sensitive in localStorage.

import { Capacitor } from '@capacitor/core';
import { authService } from '@/shared/services/authService';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_URL = import.meta.env.VITE_API_URL || '';
const REDIRECT_URI = 'https://medicoapp.app/calendar';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  colorId?: string;
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

interface CachedToken {
  access_token: string;
  expires_at: number; // ms timestamp
  email: string;
  calendar_color_id: string;
}

interface CachedEvents {
  events: CalendarEvent[];
  fetchedAt: number;
  key: string;
}

const EVENTS_TTL_MS = 15 * 60 * 1000; // 15 minutes

class GoogleCalendarService {
  // In-memory token cache — cleared on page reload (intentional: backend is the source of truth)
  private cachedToken: CachedToken | null = null;
  // Events cache — persists across navigation (singleton survives component remounts)
  private eventsCache: CachedEvents | null = null;

  // Returns cached events synchronously if still fresh — used to init React state
  getCachedEventsSync(timeMin: Date, timeMax?: Date): CalendarEvent[] | null {
    const key = `${timeMin.getTime()}-${timeMax?.getTime() ?? ''}`;
    if (
      this.eventsCache &&
      this.eventsCache.key === key &&
      Date.now() - this.eventsCache.fetchedAt < EVENTS_TTL_MS
    ) {
      return this.eventsCache.events;
    }
    return null;
  }


  // ─── Connection status ────────────────────────────────────────────────────

  async checkStatus(): Promise<{ connected: boolean; email: string }> {
    const resp = await authService.authenticatedFetch(
      `${API_URL}/api/v1/medico/google-calendar/status/`
    );
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

    const resp = await authService.authenticatedFetch(
      `${API_URL}/api/v1/medico/google-calendar/token/`
    );

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
      calendar_color_id: data.calendar_color_id || '',
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

  getCalendarColorId(): string {
    return this.cachedToken?.calendar_color_id || '';
  }

  async saveCalendarColorId(colorId: string): Promise<void> {
    await authService.authenticatedFetch(
      `${API_URL}/api/v1/medico/google-calendar/preferences/`,
      { method: 'PATCH', body: JSON.stringify({ calendar_color_id: colorId }) }
    );
    if (this.cachedToken) {
      this.cachedToken.calendar_color_id = colorId;
    }
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

    const resp = await authService.authenticatedFetch(
      `${API_URL}/api/v1/medico/google-calendar/connect/`,
      { method: 'POST', body: JSON.stringify({ code }) }
    );

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || 'No se pudo conectar con Google Calendar');
    }

    const data = await resp.json();
    this.cachedToken = {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
      email: data.email || '',
      calendar_color_id: '',
    };

    return 'connected';
  }

  async disconnect(): Promise<void> {
    await authService.authenticatedFetch(
      `${API_URL}/api/v1/medico/google-calendar/disconnect/`,
      { method: 'DELETE' }
    );
    this.cachedToken = null;
  }

  private async getToken(): Promise<string> {
    const token = await this.getValidToken();
    if (!token) throw new Error('No hay sesión de Google Calendar. Conéctate primero.');
    return token;
  }

  private calendarFetch(
    path: string,
    token: string,
    options: RequestInit = {}
  ): Promise<Response> {
    return fetch(`https://www.googleapis.com/calendar/v3${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
  }

  private async handleCalendarResponse<T>(resp: Response): Promise<T> {
    if (resp.status === 401) {
      this.cachedToken = null;
      throw new Error('Sesión de Google Calendar expirada. Por favor, reconéctate.');
    }
    if (!resp.ok) {
      let msg = `Error ${resp.status}`;
      try { msg = (await resp.json()).error?.message || msg; } catch { /* ignore */ }
      throw new Error(msg);
    }
    if (resp.status === 204) return undefined as T;
    return resp.json();
  }

  // ─── Calendar API — direct REST, no GAPI dependency ──────────────────────

  async getEvents(timeMin: Date = new Date(), timeMax?: Date): Promise<CalendarEvent[]> {
    const cacheKey = `${timeMin.getTime()}-${timeMax?.getTime() ?? ''}`;
    if (
      this.eventsCache &&
      this.eventsCache.key === cacheKey &&
      Date.now() - this.eventsCache.fetchedAt < EVENTS_TTL_MS
    ) {
      return this.eventsCache.events;
    }

    const token = await this.getToken();
    const params = new URLSearchParams({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      showDeleted: 'false',
      singleEvents: 'true',
      orderBy: 'startTime',
    });
    if (timeMax) params.set('timeMax', timeMax.toISOString());

    const resp = await this.calendarFetch(`/calendars/primary/events?${params}`, token);
    const data = await this.handleCalendarResponse<{ items?: CalendarEvent[] }>(resp);
    const events = data.items || [];

    this.eventsCache = { events, fetchedAt: Date.now(), key: cacheKey };
    return events;
  }

  async createEvent(event: CalendarEvent, stableId?: string): Promise<string> {
    this.eventsCache = null;
    const token = await this.getToken();
    const payload = stableId ? { ...event, id: stableId } : event;
    const resp = await this.calendarFetch('/calendars/primary/events', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    // 409 = event already exists with this stable ID — idempotent, treat as success
    if (stableId && resp.status === 409) {
      return stableId;
    }
    const data = await this.handleCalendarResponse<{ id: string }>(resp);
    return data.id;
  }

  async updateEvent(eventId: string, event: CalendarEvent): Promise<void> {
    this.eventsCache = null;
    const token = await this.getToken();
    const resp = await this.calendarFetch(
      `/calendars/primary/events/${encodeURIComponent(eventId)}`, token, {
        method: 'PUT',
        body: JSON.stringify(event),
      }
    );
    await this.handleCalendarResponse<void>(resp);
  }

  async deleteEvent(eventId: string): Promise<void> {
    this.eventsCache = null;
    const token = await this.getToken();
    const resp = await this.calendarFetch(
      `/calendars/primary/events/${encodeURIComponent(eventId)}`, token, {
        method: 'DELETE',
      }
    );
    await this.handleCalendarResponse<void>(resp);
  }
}

export const googleCalendarService = new GoogleCalendarService();
