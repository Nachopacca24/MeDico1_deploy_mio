// src/services/googleCalendarService.ts - VERSIÓN MEJORADA CON MANEJO DE ERRORES

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const REDIRECT_URI = window.location.origin + '/calendar';

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
    if (!userId) {
      console.warn('⚠️ No hay usuario autenticado');
      return `${this.STORAGE_PREFIX}${key}`;
    }
    return `${this.STORAGE_PREFIX}${userId}_${key}`;
  }

  /**
   * ✅ MEJORADO: Guardar token con timestamp de expiración
   */
  setTokens(accessToken: string, expiresIn: number = 3600): void {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error('❌ No se pueden guardar tokens sin usuario autenticado');
      return;
    }

    console.log(`✅ Guardando tokens para usuario: ${userId}`);

    // Calcular tiempo de expiración (expiresIn está en segundos)
    const expiryTime = Date.now() + (expiresIn * 1000);

    localStorage.setItem(this.getStorageKey('access_token'), accessToken);
    localStorage.setItem(this.getStorageKey('connected_user_id'), userId);
    localStorage.setItem(this.getStorageKey('token_timestamp'), Date.now().toString());
    localStorage.setItem(this.getStorageKey(this.TOKEN_EXPIRY_KEY), expiryTime.toString());

    console.log(`⏰ Token expirará en ${expiresIn} segundos (${new Date(expiryTime).toLocaleString()})`);
  }

  /**
   * ✅ NUEVO: Verificar si el token ha expirado
   */
  private isTokenExpired(): boolean {
    const expiryStr = localStorage.getItem(this.getStorageKey(this.TOKEN_EXPIRY_KEY));
    if (!expiryStr) return true;

    const expiryTime = parseInt(expiryStr);
    const now = Date.now();

    // Considerar expirado si faltan menos de 5 minutos
    const isExpired = now >= (expiryTime - 5 * 60 * 1000);

    if (isExpired) {
      console.warn('⚠️ Token de Google Calendar expirado o próximo a expirar');
    }

    return isExpired;
  }

  /**
   * ✅ MEJORADO: Obtener token solo si no ha expirado
   */
  getAccessToken(): string | null {
    const userId = this.getCurrentUserId();
    const connectedUserId = localStorage.getItem(this.getStorageKey('connected_user_id'));

    if (userId && connectedUserId && userId !== connectedUserId) {
      console.warn('⚠️ Token no pertenece al usuario actual, limpiando...');
      this.clearTokens();
      return null;
    }

    // ✅ Verificar si el token ha expirado
    if (this.isTokenExpired()) {
      console.warn('⚠️ Token expirado, requiere reconexión');
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
    localStorage.removeItem(this.getStorageKey('token_timestamp'));
    localStorage.removeItem(this.getStorageKey(this.TOKEN_EXPIRY_KEY));
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

  /**
   * 🆕 CONECTAR CON REDIRECCIÓN (NO POPUP)
   */
  async connect(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    console.log(`🔗 Conectando Google Calendar para usuario: ${userId}`);
    console.log('🚀 Redirigiendo a Google OAuth...');

    // Guardar estado para validar después
    const state = `user_${userId}_${Date.now()}`;
    localStorage.setItem('google_oauth_state', state);

    // Construir URL de autorización de Google
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', SCOPES);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('prompt', 'consent');

    // Redirigir a Google
    window.location.href = authUrl.toString();
  }

  /**
   * ✅ MEJORADO: Manejar callback con expiración de token
   */
  async handleOAuthCallback(): Promise<boolean> {
    const hash = window.location.hash;

    if (!hash) {
      return false;
    }

    console.log('🔍 Detectado hash en URL, procesando...');

    try {
      // Parsear el hash (formato: #access_token=xxx&token_type=Bearer&expires_in=3599&state=xxx)
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const state = params.get('state');
      const error = params.get('error');
      const expiresIn = params.get('expires_in');

      if (error) {
        console.error('❌ Error en OAuth:', error);
        throw new Error(`Error de OAuth: ${error}`);
      }

      if (!accessToken) {
        console.warn('⚠️ No se encontró access_token en la URL');
        return false;
      }

      // Validar estado
      const savedState = localStorage.getItem('google_oauth_state');
      if (state !== savedState) {
        console.error('❌ Estado inválido - posible ataque CSRF');
        throw new Error('Estado de OAuth inválido');
      }

      console.log('✅ Token recibido de Google');

      // ✅ Guardar token con tiempo de expiración
      const expirySeconds = expiresIn ? parseInt(expiresIn) : 3600;
      this.setTokens(accessToken, expirySeconds);

      // Inicializar GAPI y configurar token
      await this.initialize();
      (window as any).gapi.client.setToken({ access_token: accessToken });

      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Limpiar estado
      localStorage.removeItem('google_oauth_state');

      console.log('✅ Google Calendar conectado exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error procesando callback:', error);
      // Limpiar URL incluso si hay error
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.removeItem('google_oauth_state');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const token = this.getAccessToken();

    if (token) {
      try {
        // Revocar token en Google
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
          method: 'POST',
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

  /**
   * ✅ MEJORADO: Verificar y renovar token antes de usar
   */
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

  /**
   * ✅ MEJORADO: Manejo robusto de errores
   */
  private async handleApiError(error: any): Promise<void> {
    console.error('❌ Error en API de Google Calendar:', error);

    // Si el error es de autenticación, limpiar tokens
    if (error?.result?.error?.code === 401 || error?.status === 401) {
      console.warn('⚠️ Token inválido o expirado, limpiando sesión');
      this.clearTokens();
      throw new Error('Sesión de Google Calendar expirada. Por favor, reconéctate.');
    }

    throw error;
  }

  async getEvents(
    timeMin: Date = new Date(),
    timeMax?: Date
  ): Promise<CalendarEvent[]> {
    try {
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

      const response = await (window as any).gapi.client.calendar.events.list(request);
      return response.result.items || [];
    } catch (error) {
      await this.handleApiError(error);
      return []; // Fallback
    }
  }

  async createEvent(event: CalendarEvent): Promise<string> {
    try {
      await this.ensureToken();

      const response = await (window as any).gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      console.log('✅ Evento creado:', response.result.id);
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

      console.log('✅ Evento actualizado:', eventId);
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

      console.log('✅ Evento eliminado:', eventId);
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