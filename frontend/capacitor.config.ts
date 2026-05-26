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
    allowNavigation: [
      'medico1deploymio-production.up.railway.app',
    ],
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#111827',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
