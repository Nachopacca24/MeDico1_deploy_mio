import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.medicoapp.medico',
  appName: 'MéDico App',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: true,
  },
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'medico1deploymio-production.up.railway.app',
    ],
    cleartext: false,
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '425899211446-4l33eafrfc1k4kco3aiupdhk41lur5l7.apps.googleusercontent.com',
      androidClientId: '425899211446-9kcnaci48ca98i1v9pg1r0l4vi71qdau.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#111827',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
