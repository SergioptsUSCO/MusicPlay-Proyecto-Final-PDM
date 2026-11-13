import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.musicplay.app',
  appName: 'MusicPlay',
  webDir: 'www/browser',
  backgroundColor: '#060a08',
  server: { androidScheme: 'https' },
  android: { backgroundColor: '#060a08', allowMixedContent: false }
};

export default config;
