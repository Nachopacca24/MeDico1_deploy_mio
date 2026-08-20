import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.medicoapp.medico',
  appName: 'MeDico App',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'medico1deploymio-production.up.railway.app',
    ],
    cleartext: false,
  },
  plugins: {
    Badge: {
      persist: true,
      autoClear: true,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com', 'apple.com'],
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
