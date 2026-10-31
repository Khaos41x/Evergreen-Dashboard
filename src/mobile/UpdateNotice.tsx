import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Download } from 'lucide-react'
import { fetchAndroidRelease, newerAndroidRelease, updateReminderKey, updateReminderMs, updateWasDeferred, type AndroidRelease } from './releases'

export function UpdateNotice() {
  const [release, setRelease] = useState<AndroidRelease | null>(null)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState('')
  const reminder = useRef<string | null>(null)
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return
    const controller = new AbortController()
    let pending = false, lastSuccess = 0, lastAttempt = 0
    try { reminder.current = localStorage.getItem(updateReminderKey) } catch { /* Preference storage is optional. */ }
    const check = async () => {
      const now = Date.now()
      if (pending || (lastAttempt && now - lastAttempt < 60000) || (lastSuccess && now - lastSuccess < 6 * 60 * 60 * 1000)) return
      pending = true; lastAttempt = now
      try {
        const installed = await App.getInfo()
        if (controller.signal.aborted) return
        const latest = await fetchAndroidRelease(controller.signal)
        if (controller.signal.aborted) return
        lastSuccess = Date.now()
        setRelease(newerAndroidRelease(installed, latest) && !updateWasDeferred(reminder.current, latest.versionCode) ? latest : null)
      } catch { /* Offline checks never block login, workspace or focus. */ }
      finally { pending = false }
    }
    const resume = () => { void check() }
    window.addEventListener('evergreen:resume', resume)
    window.addEventListener('online', resume)
    void check()
    return () => {
      controller.abort()
      window.removeEventListener('evergreen:resume', resume)
      window.removeEventListener('online', resume)
    }
  }, [])
  if (!release) return null
  const defer = () => {
    reminder.current = JSON.stringify({ build: release.versionCode, until: Date.now() + updateReminderMs })
    try { localStorage.setItem(updateReminderKey, reminder.current) } catch { /* Keep the in-memory preference. */ }
    setRelease(null); setError('')
  }
  const download = async () => {
    setOpening(true); setError('')
    try { await Browser.open({ url: release.downloadUrl }) }
    catch { setError('Não foi possível abrir o download. Tente novamente.') }
    finally { setOpening(false) }
  }
  return <aside className="mobile-update-notice" aria-label="Atualização do aplicativo">
    <div className="mobile-update-copy"><p className="mobile-update-title" role="status">Nova versão disponível</p>
    <p className="mobile-update-description">Evergreen {release.versionName}. Baixe e confirme a instalação no Android.</p>
    {error && <p className="mobile-update-error" role="alert">{error}</p>}</div>
    <div className="mobile-update-actions">
      <button type="button" className="mobile-update-download" onClick={() => { void download() }} disabled={opening}><Download size={18} aria-hidden="true" />{opening ? 'Abrindo…' : 'Baixar atualização'}</button>
      <button type="button" className="mobile-update-later" onClick={defer} disabled={opening}>Mais tarde</button>
    </div>
  </aside>
}
