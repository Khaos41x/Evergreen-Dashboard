import type { CapacitorConfig } from '@capacitor/cli'
import {readFileSync} from 'node:fs'
const liveUpdateKey=JSON.parse(readFileSync('src/mobile/live-update-key.json','utf8'))

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
    CapacitorUpdater: {
      autoUpdate: false,
      updateUrl: '', statsUrl: '', channelUrl: '',
      publicKey: liveUpdateKey.pkcs1,
      allowModifyUrl: false,
      appReadyTimeout: 30000,
      responseTimeout: 30,
      resetWhenUpdate: true,
      keepUrlPathAfterReload: true,
      autoDeleteFailed: false,
      autoDeletePrevious: true,
    },
    CapacitorHttp: { enabled: false },
    CapacitorCookies: { enabled: false },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
}
export default config
