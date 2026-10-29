import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { FocusSession, Task } from '../types'
import { useModalFocus } from './useModalFocus'

export function EndFocusDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  const panel=useModalFocus(open,onCancel)
  if (!open) return null
  return <div className="overlay high" onMouseDown={onCancel}><div ref={panel} role="dialog" aria-modal="true" aria-label="End focus session" className="mini-dialog confirm-dialog" onMouseDown={event => event.stopPropagation()}>
    <div className="mini-title"><h3>End focus session?</h3><button onClick={onCancel} aria-label="Close"><X /></button></div>
    <p>Your elapsed focus time will be saved to Recent Work.</p>
    <div className="mini-actions"><button onClick={onCancel}>Cancel</button><button className="create-button danger-action" onClick={onConfirm}>End session</button></div>
  </div></div>
}

export function SessionCompleteDialog({ open, session, task, durationMs, pending=false, error='', onClose, onSave }: { open: boolean; session: FocusSession; task?: Task; durationMs: number; pending?:boolean;error?:string;onClose?:()=>void; onSave: (result: { depth: 'distracted' | 'normal' | 'deep'; note: string; completeTask: boolean }) => void }) {
  const [depth, setDepth] = useState<'distracted' | 'normal' | 'deep'>('normal')
  const [note, setNote] = useState('')
  const [completeTask, setCompleteTask] = useState(false)
  const [dismissed,setDismissed]=useState(false)
  const close=()=>{if(!pending){setDismissed(true);onClose?.()}}
  const panel=useModalFocus(open&&!dismissed,close,pending)
  useEffect(()=>{if(open){setDismissed(false);setDepth('normal');setNote('');setCompleteTask(false)}},[open,session.startedAt])
  if (!open||dismissed) return null
  return <div className="overlay high"><div ref={panel} role="dialog" aria-modal="true" aria-label="Session complete" className="mini-dialog session-complete-dialog">
    <div className="mini-title"><h3>Session complete</h3><button disabled={pending} aria-label="Close session summary" onClick={close}><X/></button></div>
    {error&&<p role="alert" className="collab-error">{error}</p>}
    <div className="session-summary"><span>Duration</span><strong>{Math.floor(durationMs/60000)}m {Math.floor(durationMs/1000)%60}s</strong>{session.title && <small>{session.title}</small>}</div>
    <fieldset><legend>How was it?</legend><div className="depth-options">{(['distracted', 'normal', 'deep'] as const).map(value => <button key={value} className={depth === value ? 'active' : ''} onClick={() => setDepth(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></fieldset>
    <label>Optional note<textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Add a reflection…" /></label>
    {task && <label className="complete-task-toggle"><input type="checkbox" checked={completeTask} onChange={event => setCompleteTask(event.target.checked)} /><span>Mark “{task.title}” complete</span></label>}
    <div className="mini-actions"><button className="create-button" disabled={pending} onClick={() => onSave({ depth, note: note.trim(), completeTask })}>{pending?'Saving…':'Save session'}</button></div>
  </div></div>
}
