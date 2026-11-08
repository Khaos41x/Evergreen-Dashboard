import { AppSelect } from '../features/appearance/AppSelect'
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
  const start = () => onStart({ mode, durationMs: mode === 'timer' ? Math.min(480,Math.max(1,duration === 0 ? custom : duration)) * 60 * 1000 : null, taskId: taskId || undefined, objectiveId: objectiveId || undefined, title: title.trim()||"Sessão de foco", description: description.trim() })
  const chooseTask = (id: string) => {
    setTaskId(id)
    const task = tasks.find(item => item.id === id)
    if (task) { setTitle(task.title); if (!objectiveId && task.objectiveId) setObjectiveId(task.objectiveId) }
  }

  return <div className="overlay high" onMouseDown={close}><div ref={panel} role="dialog" aria-modal="true" aria-label="Iniciar foco" className="mini-dialog focus-dialog" onMouseDown={event => event.stopPropagation()}>
    <div className="mini-title"><h3>Iniciar foco</h3><button disabled={pending} onClick={close} aria-label="Fechar início de foco"><X /></button></div>
    {error&&<p role="alert" className="collab-error">{error}</p>}
    <div className="focus-mode-switch" role="group" aria-label="Modo de foco"><button className={mode === 'timer' ? 'active' : ''} onClick={() => setMode('timer')}><Timer /> Temporizador</button><button className={mode === 'stopwatch' ? 'active' : ''} onClick={() => setMode('stopwatch')}><Clock3 /> Cronômetro</button></div>
    {mode === 'timer' && <div className="focus-duration"><span>Duração</span><div className="duration-grid">{[25, 50, 90].map(value => <button key={value} className={duration === value ? 'active' : ''} onClick={() => setDuration(value)}>{value}m</button>)}<button className={duration === 0 ? 'active' : ''} onClick={() => setDuration(0)}>Personalizado</button></div>{duration === 0 && <label>Minutos<input type="number" min="1" max="480" value={custom} onChange={event => setCustom(Math.max(1, Number(event.target.value)))} /></label>}</div>}
    <label>Tarefa<AppSelect value={taskId} onChange={event => chooseTask(event.target.value)}><option value="">Sem tarefa</option>{tasks.filter(task => task.status !== 'done').map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</AppSelect></label>
    <label>Objetivo<AppSelect value={objectiveId} onChange={event => setObjectiveId(event.target.value)}><option value="">Sem objetivo</option>{objectives.map(objective => <option key={objective.id} value={objective.id}>{objective.title}</option>)}</AppSelect></label>
    <label>Título<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Título opcional da sessão" /></label>
    <label>Descrição<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="O que você pretende realizar?" /></label>
    <div className="mini-actions"><button onClick={onClose} disabled={pending}>Cancelar</button><button className="create-button" disabled={pending} onClick={start}>{pending?"Iniciando…":"Iniciar"}</button></div>
  </div></div>
}
