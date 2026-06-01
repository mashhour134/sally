import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.airguard.app',
  appName: 'Air Guard',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
