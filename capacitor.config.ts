import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.evergreen.holdings',
  appName: 'Evergreen Holdings',
  webDir: 'dist',
  backgroundColor: '#070a09',
  // Package the same Vite build. Never ship a development server.url.
  server: { androidScheme: 'https', hostname: 'localhost' },
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
  ios: { contentInset: 'never', allowsLinkPreview: false },
  plugins: {
    CapacitorHttp: { enabled: false },
    CapacitorCookies: { enabled: false },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
}
export default config
