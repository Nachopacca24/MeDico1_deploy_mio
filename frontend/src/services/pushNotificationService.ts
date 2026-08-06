// src/services/pushNotificationService.ts
// Handles FCM push notifications via @capacitor-firebase/messaging

import { Capacitor } from '@capacitor/core';
import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || '';

// Dispatches a navigation event that NotificationInitializer picks up via useNavigate.
// Falls back to sessionStorage so the route is not lost if React isn't mounted yet.
function navigateTo(route: string) {
  sessionStorage.setItem('pending_notification_route', route);
  window.dispatchEvent(new CustomEvent('notification_navigate', { detail: { route } }));
}

export type PushInitResult = 'granted' | 'denied' | 'not-native' | 'error';

class PushNotificationService {
  private listenersRegistered = false;
  private tokenRegistered = false;

  async init(): Promise<PushInitResult> {
    if (!Capacitor.isNativePlatform()) return 'not-native';

    try {
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

      if (!this.listenersRegistered) {
        // Create notification channel (Android 8+ only, ignored on older versions)
        if (Capacitor.getPlatform() === 'android') {
          try {
            await FirebaseMessaging.createChannel({
              id: 'medico_default',
              name: 'MeDico',
              importance: 4, // IMPORTANCE_HIGH
              visibility: 1, // VISIBILITY_PUBLIC
              vibration: true,
              lights: true,
            });
          } catch { /* Android < 8 doesn't support channels */ }
        }

        const { receive } = await FirebaseMessaging.requestPermissions();
        console.log('[FCM] Permiso:', receive);
        if (receive !== 'granted') return 'denied';

        await FirebaseMessaging.addListener('tokenReceived', async ({ token }) => {
          this.tokenRegistered = false;
          await this.registerToken(token);
        });

        await FirebaseMessaging.addListener('notificationReceived', async ({ notification }) => {
          try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            const route = (notification.data as Record<string, string> | undefined)?.route;
            await LocalNotifications.schedule({
              notifications: [{
                id: Date.now() % 2147483647,
                title: notification.title ?? 'MeDico',
                body: notification.body ?? '',
                channelId: 'medico_default',
                extra: route ? { route } : undefined,
              }],
            });
            // Also register the action listener here so tapping the local
            // notification navigates when the app is in the foreground.
            const { LocalNotifications: LN } = await import('@capacitor/local-notifications');
            LN.addListener('localNotificationActionPerformed', ({ notification: ln }) => {
              const r = (ln.extra as Record<string, string> | undefined)?.route;
              if (r) navigateTo(r);
            });
          } catch (err) {
            console.error('[FCM] LocalNotifications error:', err);
          }
        });

        await FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
          const data = notification.data as Record<string, string> | undefined;
          const route = data?.route;
          if (route) navigateTo(route);
        });

        this.listenersRegistered = true;
      }

      // Register token on every init until it succeeds
      if (!this.tokenRegistered) {
        const { token } = await FirebaseMessaging.getToken();
        console.log('[FCM] Token obtenido:', token ? 'OK' : 'null');
        if (token) await this.registerToken(token);
      }
      return 'granted';
    } catch (err) {
      console.error('[FCM] Error:', err);
      return 'error';
    }
  }

  private async registerToken(token: string): Promise<void> {
    try {
      const response = await authService.authenticatedFetch(`${API_URL}/api/v1/medico/push-token/`, {
        method: 'POST',
        body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
      });
      if (response.ok) {
        this.tokenRegistered = true;
        console.log('[FCM] Token registrado');
      }
    } catch {
      // Will retry on next init() call
    }
  }

  async checkStatus(): Promise<'active' | 'no-permission' | 'no-token' | 'not-native'> {
    if (!Capacitor.isNativePlatform()) return 'not-native';
    try {
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
      const { receive } = await FirebaseMessaging.checkPermissions();
      if (receive !== 'granted') return 'no-permission';
      return this.tokenRegistered ? 'active' : 'no-token';
    } catch {
      return 'no-token';
    }
  }

  async removeToken(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
      const { token } = await FirebaseMessaging.getToken();
      if (token) {
        try {
          await authService.authenticatedFetch(`${API_URL}/api/v1/medico/push-token/`, {
            method: 'DELETE',
            body: JSON.stringify({ token }),
          });
        } catch { /* backend cleanup is best-effort — markStale() below still protects the next login */ }
      }
      await FirebaseMessaging.deleteToken();
    } catch { /* silent */ } finally {
      this.tokenRegistered = false;
    }
  }

  /**
   * Forces the next init() to re-register the FCM token with the backend.
   * Call this whenever a session ends (logout, account deletion, forced
   * session expiry) — otherwise, if a different user logs in on this same
   * device without the app fully restarting, this in-memory flag would still
   * say "already registered" and skip re-registering, leaving the token
   * (and therefore this device's notifications) assigned to the PREVIOUS
   * user on the backend.
   */
  markStale(): void {
    this.tokenRegistered = false;
  }
}

export const pushNotificationService = new PushNotificationService();
