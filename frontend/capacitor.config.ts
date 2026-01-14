import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.briefing.app',
  appName: 'Briefing',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#000000',
    preferredContentMode: 'mobile'
  },
  server: {
    // Allow loading from your API server
    allowNavigation: ['*.fly.dev', '*.supabase.co']
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
