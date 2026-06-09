// src/services/pushNotificationService.ts
// Handles FCM push notifications via @capacitor-firebase/messaging

import { Capacitor } from '@capacitor/core';
import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || '';

class PushNotificationService {
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

      // Request permission (Android 13+ requires explicit permission)
      const { receive } = await FirebaseMessaging.requestPermissions();
      if (receive !== 'granted') return;

      // Get FCM token and register with backend
      const { token } = await FirebaseMessaging.getToken();
      if (token) await this.registerToken(token);

      // Listen for token refresh
      await FirebaseMessaging.addListener('tokenReceived', async ({ token }) => {
        await this.registerToken(token);
      });

      // Handle notifications received while app is in foreground
      await FirebaseMessaging.addListener('notificationReceived', ({ notification }) => {
        console.log('[FCM] Foreground notification:', notification.title);
      });

      // Handle tap on notification (app in background/killed)
      await FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
        const data = notification.data as Record<string, string> | undefined;
        if (data?.route) {
          window.location.hash = data.route;
        }
      });

      this.initialized = true;
    } catch (err) {
      // FCM not available (emulator, old device) — fail silently
    }
  }

  private async registerToken(token: string): Promise<void> {
    try {
      await authService.authenticatedFetch(`${API_URL}/api/v1/medico/push-token/`, {
        method: 'POST',
        body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
      });
    } catch { /* silent — token will be registered on next init */ }
  }

  async removeToken(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
      const { token } = await FirebaseMessaging.getToken();
      if (token) {
        await authService.authenticatedFetch(`${API_URL}/api/v1/medico/push-token/`, {
          method: 'DELETE',
          body: JSON.stringify({ token }),
        });
      }
      await FirebaseMessaging.deleteToken();
    } catch { /* silent */ }
  }
}

export const pushNotificationService = new PushNotificationService();
