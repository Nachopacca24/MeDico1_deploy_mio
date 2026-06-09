// src/services/pushNotificationService.ts
// Handles FCM push notifications via @capacitor-firebase/messaging

import { Capacitor } from '@capacitor/core';
import { authService } from '@/shared/services/authService';

const API_URL = import.meta.env.VITE_API_URL || '';

class PushNotificationService {
  private listenersRegistered = false;
  private tokenRegistered = false;

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

      if (!this.listenersRegistered) {
        // Create notification channel (Android 8+ required)
        if (Capacitor.getPlatform() === 'android') {
          await FirebaseMessaging.createChannel({
            id: 'medico_default',
            name: 'MeDico',
            importance: 4, // IMPORTANCE_HIGH
            visibility: 1, // VISIBILITY_PUBLIC
            vibration: true,
            lights: true,
          });
        }

        const { receive } = await FirebaseMessaging.requestPermissions();
        console.log('[FCM] Permiso:', receive);
        if (receive !== 'granted') return;

        await FirebaseMessaging.addListener('tokenReceived', async ({ token }) => {
          this.tokenRegistered = false;
          await this.registerToken(token);
        });

        await FirebaseMessaging.addListener('notificationReceived', ({ notification }) => {
          console.log('[FCM] Foreground notification:', notification.title);
        });

        await FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
          const data = notification.data as Record<string, string> | undefined;
          if (data?.route) {
            window.location.hash = data.route;
          }
        });

        this.listenersRegistered = true;
      }

      // Register token on every init until it succeeds
      if (!this.tokenRegistered) {
        const { token } = await FirebaseMessaging.getToken();
        console.log('[FCM] Token obtenido:', token ? 'OK' : 'null');
        if (token) await this.registerToken(token);
      }
    } catch (err) {
      console.error('[FCM] Error:', err);
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
        await authService.authenticatedFetch(`${API_URL}/api/v1/medico/push-token/`, {
          method: 'DELETE',
          body: JSON.stringify({ token }),
        });
      }
      await FirebaseMessaging.deleteToken();
      this.tokenRegistered = false;
    } catch { /* silent */ }
  }
}

export const pushNotificationService = new PushNotificationService();
