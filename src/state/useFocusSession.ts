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

function loadFocusSession(): FocusSession {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return idleFocusSession
    const session = JSON.parse(raw) as FocusSession
    if (session.mode === 'timer' && session.status === 'running' && session.durationMs !== null && getFocusElapsedMs(session) >= session.durationMs) {
      return { ...session, status: 'completed', pausedAt: session.startedAt! + session.accumulatedPausedMs + session.durationMs }
    }
    return session
  } catch {
    return idleFocusSession
  }
}

export function useFocusSession() {
  const [session, setSession] = useState<FocusSession>(loadFocusSession)

  useEffect(() => {
    if (session.status === 'idle') localStorage.removeItem(storageKey)
    else localStorage.setItem(storageKey, JSON.stringify(session))
  }, [session])

  const start = useCallback((draft: FocusSessionDraft) => {
    setSession({ ...draft, status: 'running', startedAt: Date.now(), pausedAt: null, accumulatedPausedMs: 0 })
  }, [])
  const pause = useCallback(() => setSession(current => current.status === 'running' ? { ...current, status: 'paused', pausedAt: Date.now() } : current), [])
  const resume = useCallback(() => setSession(current => current.status === 'paused' && current.pausedAt ? { ...current, status: 'running', accumulatedPausedMs: current.accumulatedPausedMs + (Date.now() - current.pausedAt), pausedAt: null } : current), [])
  const complete = useCallback(() => setSession(current => current.status === 'running' ? { ...current, status: 'completed', pausedAt: Date.now() } : current), [])
  const reset = useCallback(() => setSession(idleFocusSession), [])

  return { session, setSession, start, pause, resume, complete, reset }
}
