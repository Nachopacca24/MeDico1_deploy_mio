// src/services/googleCalendarService.ts

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar';

// ⚠️ VERIFICAR QUE LAS VARIABLES EXISTAN
if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
  console.error('❌ ERROR: Faltan variables de entorno de Google Calendar');
  console.log('VITE_GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? '✅ Configurado' : '❌ NO configurado');
  console.log('VITE_GOOGLE_API_KEY:', GOOGLE_API_KEY ? '✅ Configurado' : '❌ NO configurado');
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
  private tokenClient: any = null;
  private gapiInited = false;
  private gisInited = false;
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

  setTokens(accessToken: string): void {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error('❌ No se pueden guardar tokens sin usuario autenticado');
      return;
    }

    console.log(`✅ Guardando tokens para usuario: ${userId}`);
    localStorage.setItem(this.getStorageKey('access_token'), accessToken);
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

  clearTokens(): void {
    const userId = this.getCurrentUserId();
    console.log(`🧹 Limpiando tokens de Google Calendar para usuario: ${userId || 'unknown'}`);

    localStorage.removeItem(this.getStorageKey('access_token'));
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
    if (this.gapiInited && this.gisInited) {
      console.log('✅ Google API ya inicializada');
      return;
    }

    console.log('🔄 Inicializando Google APIs...');

    return new Promise((resolve, reject) => {
      let gapiLoaded = false;
      let gisLoaded = false;

      const checkBothLoaded = () => {
        if (gapiLoaded && gisLoaded) {
          console.log('✅ Ambas APIs inicializadas correctamente');
          resolve();
        }
      };

      // Cargar GAPI
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
            gapiLoaded = true;
            console.log('✅ GAPI inicializado');
            checkBothLoaded();
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

      // Cargar GIS
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = true;
      gisScript.defer = true;
      gisScript.onload = () => {
        console.log('📦 Script GIS cargado');
        try {
          this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: '', // Se define en connect()
          });
          this.gisInited = true;
          gisLoaded = true;
          console.log('✅ GIS inicializado');
          checkBothLoaded();
        } catch (error) {
          console.error('❌ Error inicializando GIS:', error);
          reject(error);
        }
      };
      gisScript.onerror = () => {
        console.error('❌ Error cargando script GIS');
        reject(new Error('Failed to load GIS script'));
      };
      document.body.appendChild(gisScript);
    });
  }

  async connect(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    console.log(`🔗 Conectando Google Calendar para usuario: ${userId}`);

    try {
      await this.initialize();
    } catch (error) {
      console.error('❌ Error en inicialización:', error);
      throw new Error('No se pudo inicializar Google Calendar');
    }

    return new Promise((resolve, reject) => {
      try {
        // ✅ Configurar callback ANTES de solicitar token
        this.tokenClient.callback = async (resp: any) => {
          if (resp.error !== undefined) {
            console.error('❌ Error en autenticación:', resp);
            reject(new Error(resp.error || 'Error de autenticación'));
            return;
          }

          console.log('✅ Token recibido exitosamente');
          this.setTokens(resp.access_token);

          // Configurar token en GAPI
          (window as any).gapi.client.setToken({ access_token: resp.access_token });

          console.log(`✅ Google Calendar conectado para usuario: ${userId}`);
          resolve();
        };

        // Verificar si ya tiene token válido
        const token = this.getAccessToken();
        if (token) {
          console.log('🔍 Verificando token existente...');
          try {
            (window as any).gapi.client.setToken({ access_token: token });
            console.log('✅ Token válido existente');
            resolve();
            return;
          } catch (error) {
            console.warn('⚠️ Token existente inválido, solicitando nuevo...');
          }
        }

        // Solicitar nuevo token
        console.log('🚀 Abriendo popup de Google OAuth...');
        this.tokenClient.requestAccessToken({ 
          prompt: 'consent',
          // ✅ Hint del email del usuario actual
          hint: this.getCurrentUser()?.email 
        });
      } catch (error) {
        console.error('❌ Error al conectar:', error);
        reject(error);
      }
    });
  }

  private getCurrentUser(): any {
    const userStr = localStorage.getItem('medico_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  async disconnect(): Promise<void> {
    const token = this.getAccessToken();

    if (token) {
      try {
        await (window as any).google.accounts.oauth2.revoke(token);
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

    // Intentar obtener el email del token de acceso si no hay id_token
    try {
      if (token.id_token) {
        const payload = JSON.parse(atob(token.id_token.split('.')[1] || ''));
        return payload.email || null;
      }
      
      // Si no hay id_token, el email podría estar en el hint o user info que ya tenemos
      const user = this.getCurrentUser();
      return user?.email || null;
    } catch {
      const user = this.getCurrentUser();
      return user?.email || null;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();