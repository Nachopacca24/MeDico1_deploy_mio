// src/services/googleCalendarService.ts - ACTUALIZADO PARA OAUTH DESDE BACKEND

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ⚠️ VERIFICAR QUE LAS VARIABLES EXISTAN
if (!GOOGLE_API_KEY) {
  console.error('❌ ERROR: Falta VITE_GOOGLE_API_KEY');
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
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
    if (!userId) {
      console.warn('⚠️ No hay usuario autenticado');
      return `${this.STORAGE_PREFIX}${key}`;
    }
    return `${this.STORAGE_PREFIX}${userId}_${key}`;
  }

  setTokens(accessToken: string, refreshToken?: string): void {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error('❌ No se pueden guardar tokens sin usuario autenticado');
      return;
    }

    console.log(`✅ Guardando tokens para usuario: ${userId}`);
    localStorage.setItem(this.getStorageKey('access_token'), accessToken);
    if (refreshToken) {
      localStorage.setItem(this.getStorageKey('refresh_token'), refreshToken);
    }
    localStorage.setItem(this.getStorageKey('connected_user_id'), userId);
  }

  getAccessToken(): string | null {
    const userId = this.getCurrentUserId();
    const connectedUserId = localStorage.getItem(this.getStorageKey('connected_user_id'));

    if (userId && connectedUserId && userId !== connectedUserId) {
      console.warn('⚠️ Token no pertenece al usuario actual, limpiando...');
      this.clearTokens();
      return null;
    }

    return localStorage.getItem(this.getStorageKey('access_token'));
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.getStorageKey('refresh_token'));
  }

  clearTokens(): void {
    const userId = this.getCurrentUserId();
    console.log(`🧹 Limpiando tokens de Google Calendar para usuario: ${userId || 'unknown'}`);

    localStorage.removeItem(this.getStorageKey('access_token'));
    localStorage.removeItem(this.getStorageKey('refresh_token'));
    localStorage.removeItem(this.getStorageKey('connected_user_id'));
  }

  isConnected(): boolean {
    const token = this.getAccessToken();
    const userId = this.getCurrentUserId();

    if (!userId) {
      console.warn('⚠️ No hay usuario autenticado');
      return false;
    }

    return !!token;
  }

  async initialize(): Promise<void> {
    if (this.gapiInited) {
      console.log('✅ Google API ya inicializada');
      return;
    }

    console.log('🔄 Inicializando Google API...');

    return new Promise((resolve, reject) => {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;

      gapiScript.onload = () => {
        console.log('📦 Script GAPI cargado');
        (window as any).gapi.load('client', async () => {
          try {
            await (window as any).gapi.client.init({
              apiKey: GOOGLE_API_KEY,
              discoveryDocs: [DISCOVERY_DOC],
            });
            this.gapiInited = true;
            console.log('✅ GAPI inicializado');
            resolve();
          } catch (error) {
            console.error('❌ Error inicializando GAPI:', error);
            reject(error);
          }
        });
      };

      gapiScript.onerror = () => {
        console.error('❌ Error cargando script GAPI');
        reject(new Error('Failed to load GAPI script'));
      };

      document.body.appendChild(gapiScript);
    });
  }

  async connect(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    console.log(`🔗 Conectando Google Calendar para usuario: ${userId}`);

    try {
      // Obtener JWT token del usuario
      const authToken = localStorage.getItem('medico_token');
      if (!authToken) {
        throw new Error('No hay token de autenticación');
      }

      // Llamar al backend para iniciar OAuth
      const response = await fetch(`${API_BASE_URL}/api/medico/google-calendar/auth/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al iniciar autenticación');
      }

      const data = await response.json();

      // Redirigir a la URL de autorización de Google
      console.log('🚀 Redirigiendo a Google OAuth...');
      window.location.href = data.auth_url;

    } catch (error) {
      console.error('❌ Error al conectar:', error);
      throw error;
    }
  }

  async handleCallback(accessToken: string, refreshToken?: string): Promise<void> {
    console.log('✅ Procesando callback de Google OAuth');

    this.setTokens(accessToken, refreshToken);

    // Inicializar GAPI y configurar token
    await this.initialize();
    (window as any).gapi.client.setToken({ access_token: accessToken });

    console.log('✅ Google Calendar conectado exitosamente');
  }

  async disconnect(): Promise<void> {
    const token = this.getAccessToken();

    if (token) {
      try {
        const authToken = localStorage.getItem('medico_token');
        await fetch(`${API_BASE_URL}/api/medico/google-calendar/revoke/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        console.log('✅ Token revocado en Google');
      } catch (error) {
        console.error('Error al revocar token:', error);
      }
    }

    this.clearTokens();

    if ((window as any).gapi?.client) {
      (window as any).gapi.client.setToken(null);
    }

    console.log('✅ Desconectado de Google Calendar');
  }

  private async ensureToken(): Promise<void> {
    const token = this.getAccessToken();

    if (!token) {
      throw new Error('No hay token de acceso disponible. Conéctate primero.');
    }

    if (!(window as any).gapi?.client) {
      await this.initialize();
    }

    (window as any).gapi.client.setToken({ access_token: token });
  }

  async getEvents(
    timeMin: Date = new Date(),
    timeMax?: Date
  ): Promise<CalendarEvent[]> {
    await this.ensureToken();

    const request: any = {
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
    };

    if (timeMax) {
      request.timeMax = timeMax.toISOString();
    }

    try {
      const response = await (window as any).gapi.client.calendar.events.list(request);
      return response.result.items || [];
    } catch (error) {
      console.error('Error obteniendo eventos:', error);
      throw error;
    }
  }

  async createEvent(event: CalendarEvent): Promise<string> {
    await this.ensureToken();

    try {
      const response = await (window as any).gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      console.log('✅ Evento creado:', response.result.id);
      return response.result.id;
    } catch (error) {
      console.error('❌ Error creando evento:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, event: CalendarEvent): Promise<void> {
    await this.ensureToken();

    try {
      await (window as any).gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
      });

      console.log('✅ Evento actualizado:', eventId);
    } catch (error) {
      console.error('❌ Error actualizando evento:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.ensureToken();

    try {
      await (window as any).gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });

      console.log('✅ Evento eliminado:', eventId);
    } catch (error) {
      console.error('❌ Error eliminando evento:', error);
      throw error;
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