import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.medicoapp.medico',
  appName: 'MéDico App',
  webDir: 'dist',
  android: {
    // Allow the WebView to handle deep links before the system does
    allowMixedContent: false,
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
