export const releaseOrigin = 'https://evergreen-android-downloads.vercel.app'
export const releaseManifestUrl = `${releaseOrigin}/latest.json`
export const updateReminderKey = 'evergreen.android-update-reminder.v1'
export const updateReminderMs = 24 * 60 * 60 * 1000

export interface InstalledApp { id: string; build: string; version: string }
export interface AndroidRelease {
  schema: 1
  appId: 'com.evergreen.holdings'
  platform: 'android'
  versionCode: number
  versionName: string
  downloadUrl: string
  sha256: string
  bytes: number
}

export function parseAndroidRelease(value: unknown): AndroidRelease {
  if (!value || typeof value !== 'object') throw new Error('Versão inválida.')
  const r = value as Record<string, unknown>
  if (r.schema !== 1 || r.appId !== 'com.evergreen.holdings' || r.platform !== 'android'
    || !Number.isSafeInteger(r.versionCode) || Number(r.versionCode) < 1
    || Number(r.versionCode) > 2100000000
    || typeof r.versionName !== 'string' || !/^\d+\.\d+(?:\.\d+)?$/.test(r.versionName)
    || typeof r.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(r.sha256)
    || !Number.isSafeInteger(r.bytes) || Number(r.bytes) < 1 || Number(r.bytes) > 512 * 1024 * 1024
    || typeof r.downloadUrl !== 'string') throw new Error('Versão inválida.')
  const url = new URL(r.downloadUrl)
  if (url.origin !== releaseOrigin || url.username || url.password || url.search || url.hash
    || url.pathname !== `/releases/${r.versionCode}/Evergreen.apk`
    || url.href !== r.downloadUrl) throw new Error('Download não autorizado.')
  return r as unknown as AndroidRelease
}

export function newerAndroidRelease(installed: InstalledApp, release: AndroidRelease) {
  return installed.id === release.appId && /^\d+$/.test(installed.build)
    && Number.isSafeInteger(Number(installed.build)) && Number(installed.build) > 0
    && release.versionCode > Number(installed.build)
}

export function updateWasDeferred(raw: string | null, build: number, now = Date.now()) {
  try {
    const reminder = JSON.parse(raw || 'null')
    return reminder?.build === build && Number.isFinite(reminder.until)
      && reminder.until > now && reminder.until <= now + updateReminderMs
  } catch { return false }
}

// Public metadata only. Never attach Evergreen cookies/tokens or follow redirects.
export async function fetchAndroidRelease(signal?: AbortSignal): Promise<AndroidRelease> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(abort, 8000)
  try {
    const response = await fetch(releaseManifestUrl, {
      credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Versão indisponível.')
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Versão indisponível.')
    const chunks: Uint8Array[] = []
    let length = 0
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        length += value.byteLength
        if (length > 16384) throw new Error('Resposta de versão inválida.')
        chunks.push(value)
      }
    } finally { await reader.cancel().catch(() => {}) }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    return parseAndroidRelease(JSON.parse(new TextDecoder().decode(bytes)))
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
