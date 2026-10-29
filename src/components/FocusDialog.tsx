import { useEffect, useState } from 'react'
import { Clock3, Timer, X } from 'lucide-react'
import type { FocusMode, FocusSessionDraft, Objective, Task } from '../types'
import { useModalFocus } from './useModalFocus'

export function FocusDialog({ open, tasks, objectives, initialTaskId, defaultMinutes=25, pending=false, error='', onClose, onStart }: {
  open: boolean
  tasks: Task[]
  objectives: Objective[]
  initialTaskId?: string
  defaultMinutes?: number
  pending?:boolean
  error?:string
  onClose: () => void
  onStart: (draft: FocusSessionDraft) => void
}) {
  const [mode, setMode] = useState<FocusMode>('timer')
  const [duration, setDuration] = useState(25)
  const [custom, setCustom] = useState(40)
  const [taskId, setTaskId] = useState('')
  const [objectiveId, setObjectiveId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const close=()=>{if(!pending)onClose()}
  const panel=useModalFocus(open,close,pending)

  useEffect(() => {
    if (!open) return
    const task = tasks.find(item => item.id === initialTaskId)
    setMode('timer'); setDuration([25,50,90].includes(defaultMinutes)?defaultMinutes:0); setCustom(defaultMinutes); setTaskId(task?.id ?? ''); setObjectiveId(task?.objectiveId ?? ''); setTitle(task?.title ?? ''); setDescription('')
  }, [open, initialTaskId])


  if (!open) return null
  const start = () => onStart({ mode, durationMs: mode === 'timer' ? Math.min(480,Math.max(1,duration === 0 ? custom : duration)) * 60 * 1000 : null, taskId: taskId || undefined, objectiveId: objectiveId || undefined, title: title.trim()||'Focus session', description: description.trim() })
  const chooseTask = (id: string) => {
    setTaskId(id)
    const task = tasks.find(item => item.id === id)
    if (task) { setTitle(task.title); if (!objectiveId && task.objectiveId) setObjectiveId(task.objectiveId) }
  }

  return <div className="overlay high" onMouseDown={close}><div ref={panel} role="dialog" aria-modal="true" aria-label="Start Focus" className="mini-dialog focus-dialog" onMouseDown={event => event.stopPropagation()}>
    <div className="mini-title"><h3>Start Focus</h3><button disabled={pending} onClick={close} aria-label="Close start focus"><X /></button></div>
    {error&&<p role="alert" className="collab-error">{error}</p>}
    <div className="focus-mode-switch" role="group" aria-label="Focus mode"><button className={mode === 'timer' ? 'active' : ''} onClick={() => setMode('timer')}><Timer /> Timer</button><button className={mode === 'stopwatch' ? 'active' : ''} onClick={() => setMode('stopwatch')}><Clock3 /> Stopwatch</button></div>
    {mode === 'timer' && <div className="focus-duration"><span>Duration</span><div className="duration-grid">{[25, 50, 90].map(value => <button key={value} className={duration === value ? 'active' : ''} onClick={() => setDuration(value)}>{value}m</button>)}<button className={duration === 0 ? 'active' : ''} onClick={() => setDuration(0)}>Custom</button></div>{duration === 0 && <label>Minutes<input type="number" min="1" max="480" value={custom} onChange={event => setCustom(Math.max(1, Number(event.target.value)))} /></label>}</div>}
    <label>Task<select value={taskId} onChange={event => chooseTask(event.target.value)}><option value="">No task</option>{tasks.filter(task => task.status !== 'done').map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
    <label>Objective<select value={objectiveId} onChange={event => setObjectiveId(event.target.value)}><option value="">No objective</option>{objectives.map(objective => <option key={objective.id} value={objective.id}>{objective.title}</option>)}</select></label>
    <label>Title<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Optional focus title" /></label>
    <label>Description<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="What will you accomplish?" /></label>
    <div className="mini-actions"><button onClick={onClose} disabled={pending}>Cancel</button><button className="create-button" disabled={pending} onClick={start}>{pending?'Starting…':'Start'}</button></div>
  </div></div>
}
