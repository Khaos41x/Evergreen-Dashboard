import { useEffect, useRef, useState } from 'react'
import type { FocusSession } from '../types'
import { getFocusElapsedMs } from '../state/useFocusSession'

function formatSeconds(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds)
  const minutes = Math.floor(safe / 60).toString().padStart(2, '0')
  const seconds = Math.floor(safe % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function getDisplaySeconds(session: FocusSession, elapsedMs: number) {
  if (session.status === 'idle') return 0
  if (session.mode === 'timer' && session.durationMs !== null) return Math.max(0, Math.ceil((session.durationMs - elapsedMs) / 1000))
  return Math.floor(elapsedMs / 1000)
}

export function FocusTimer({ session, onComplete }: { session: FocusSession; onComplete: () => void }) {
  const ringRef = useRef<HTMLDivElement>(null)
  const completedRef = useRef<string | null>(null)
  const completeRef=useRef(onComplete);completeRef.current=onComplete
  const {startedAt,durationMs,status,mode,pausedAt,accumulatedPausedMs}=session
  const [displaySeconds, setDisplaySeconds] = useState(() => getDisplaySeconds(session, getFocusElapsedMs(session)))

  useEffect(() => {
    const sessionKey=`${startedAt}:${durationMs}:${mode}`
    const snapshot:FocusSession={startedAt,durationMs,status,mode,pausedAt,accumulatedPausedMs,title:'',description:''}
    let frame = 0
    let interval:ReturnType<typeof setInterval>|undefined
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const render = () => {
      const elapsedMs = getFocusElapsedMs(snapshot)
      const nextSeconds = getDisplaySeconds(snapshot, elapsedMs)
      setDisplaySeconds(current => current === nextSeconds ? current : nextSeconds)

      const progress = session.mode === 'timer' && session.durationMs
        ? Math.min(1, elapsedMs / session.durationMs)
        : 0
      ringRef.current?.style.setProperty('--timer-progress', `${progress * 100}%`)

      if (session.mode === 'timer' && session.durationMs !== null && elapsedMs >= session.durationMs && session.status === 'running' && completedRef.current !== sessionKey) {
        completedRef.current = sessionKey
        completeRef.current()
        return
      }
      if (session.status === 'running'&&!reduced) frame = requestAnimationFrame(render)
    }
    const resumeClock=()=>{cancelAnimationFrame(frame);render()}
    window.addEventListener('evergreen:resume',resumeClock);document.addEventListener('visibilitychange',resumeClock)
    render()
    if(reduced&&session.status==='running')interval=setInterval(render,1000)
    return () => {window.removeEventListener('evergreen:resume',resumeClock);document.removeEventListener('visibilitychange',resumeClock);cancelAnimationFrame(frame);if(interval)clearInterval(interval)}
  }, [startedAt,durationMs,status,mode,pausedAt,accumulatedPausedMs])

  const statusLabel = session.status === 'idle' ? "PRONTO" : session.status === 'paused' ? "PAUSADO" : session.status === 'completed' ? "CONCLUÍDO" : session.mode === 'timer' ? "TEMPORIZADOR" : "CRONÔMETRO"
  const footer = session.status === 'idle' ? "Comece quando quiser" : session.mode === 'timer' && session.durationMs !== null ? `de ${Math.round(session.durationMs / 60000)} min` : "Tempo decorrido"

  return <div ref={ringRef} className={`hero-timer ${session.mode==='stopwatch'?'stopwatch':''} ${session.status === 'paused' ? 'paused' : ''} ${session.status === 'idle' ? 'idle' : ''}`}>
    <div><small>{statusLabel}</small><strong>{formatSeconds(displaySeconds)}</strong><span>{footer}</span></div>
  </div>
}
