import { useCallback, useEffect, useState } from 'react'
import type { FocusSession, FocusSessionDraft } from '../types'

const storageKey = 'evergreen.focus-session.v1'

export const idleFocusSession: FocusSession = {
  mode: 'timer',
  status: 'idle',
  startedAt: null,
  pausedAt: null,
  accumulatedPausedMs: 0,
  durationMs: 50 * 60 * 1000,
  title: '',
  description: '',
}

export function getFocusElapsedMs(session: FocusSession, now = Date.now()) {
  if (!session.startedAt) return 0
  const end = (session.status === 'paused' || session.status === 'completed') && session.pausedAt ? session.pausedAt : now
  return Math.max(0, end - session.startedAt - session.accumulatedPausedMs)
}

function loadFocusSession(): { data: FocusSession; error: string } {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return { data: idleFocusSession, error: '' }
    const session = JSON.parse(raw) as FocusSession
    if (!session || !['timer', 'stopwatch'].includes(session.mode) || !['idle', 'running', 'paused', 'completed'].includes(session.status) || typeof session.accumulatedPausedMs !== 'number') throw new Error('Invalid focus data')
    if (session.mode === 'timer' && session.status === 'running' && session.durationMs !== null && getFocusElapsedMs(session) >= session.durationMs) {
      return { data: { ...session, status: 'completed', pausedAt: session.startedAt! + session.accumulatedPausedMs + session.durationMs }, error: '' }
    }
    return { data: session, error: '' }
  } catch {
    return { data: idleFocusSession, error: 'A sessão de foco local não pôde ser lida. O original foi preservado. Exporte um backup antes de recuperar os dados.' }
  }
}

export function useFocusSession() {
  const [initial] = useState(loadFocusSession)
  const [session, setSession] = useState<FocusSession>(initial.data)
  const [storageError, setStorageError] = useState(initial.error)

  useEffect(() => {
    if (initial.error) return
    try {
      if (session.status === 'idle') localStorage.removeItem(storageKey)
      else localStorage.setItem(storageKey, JSON.stringify(session))
      setStorageError('')
    } catch { setStorageError('Não foi possível salvar a sessão de foco neste navegador.') }
  }, [session, initial.error])

  const start = useCallback((draft: FocusSessionDraft) => {
    setSession({ ...draft, status: 'running', startedAt: Date.now(), pausedAt: null, accumulatedPausedMs: 0 })
  }, [])
  const pause = useCallback(() => setSession(current => current.status === 'running' ? { ...current, status: 'paused', pausedAt: Date.now() } : current), [])
  const resume = useCallback(() => setSession(current => current.status === 'paused' && current.pausedAt ? { ...current, status: 'running', accumulatedPausedMs: current.accumulatedPausedMs + (Date.now() - current.pausedAt), pausedAt: null } : current), [])
  const complete = useCallback(() => setSession(current => current.status === 'running' ? { ...current, status: 'completed', pausedAt: Date.now() } : current), [])
  const reset = useCallback(() => setSession(idleFocusSession), [])

  return { session, storageError, setSession, start, pause, resume, complete, reset }
}
