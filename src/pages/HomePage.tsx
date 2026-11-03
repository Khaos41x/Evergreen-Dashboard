import {HeroTree} from '../components/HeroTree'
import { useEffect, useState } from 'react'
import { Activity, CalendarDays, ChevronRight, CircleCheck, CircleGauge, CirclePlay, Ellipsis, ListTodo, Orbit, Pause, Play, Plus, Square, SquareCheckBig, Target, UserRoundPlus, UsersRound } from 'lucide-react'
import type { FocusSession, Objective, Person, Task, TeamMember, WorkspaceActivity } from '../types'
import { AssigneeAvatar } from '../components/ui'
import { FocusTimer } from '../components/FocusTimer'
import { getFocusElapsedMs } from '../state/useFocusSession'

export function getGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Bom dia"
  if (hour >= 12 && hour < 18) return "Boa tarde"
  return "Boa noite"
}

function relativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return "Agora"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min atrás`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h atrás`
  return `${Math.floor(hours / 24)} dias atrás`
}

export function HomePage({ tasks, objectives, activities, teamMembers, currentUser, focusSession, openTasks, addTask, createObjective, openFocus, pauseFocus, resumeFocus, requestEndFocus, completeFocus, timezone, connected, focusedTodayMs, dailyGoalMinutes, onInvite, organizationName }: {
  organizationName?:string
  onInvite?:()=>void
  focusedTodayMs?: number
  dailyGoalMinutes?: number
  timezone?: string
  connected?: boolean
  tasks: Task[]
  objectives: Objective[]
  activities: WorkspaceActivity[]
  teamMembers: TeamMember[]
  currentUser: Person
  focusSession: FocusSession
  openTasks: () => void
  addTask: () => void
  createObjective: () => void
  openFocus: () => void
  pauseFocus: () => void
  resumeFocus: () => void
  requestEndFocus: () => void
  completeFocus: () => void
}) {
  const [now, setNow] = useState(Date.now())


  useEffect(() => {
    if (focusSession.status !== 'running') return
    const resume=()=>setNow(Date.now());window.addEventListener('evergreen:resume',resume)
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {window.clearInterval(timer);window.removeEventListener('evergreen:resume',resume)}
  }, [focusSession.status])

  const elapsedMs = getFocusElapsedMs(focusSession, now)
  const elapsedMinutes = Math.floor(elapsedMs / 60000)
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
  const completedFocusMs = activities.reduce((total, activity) => activity.createdAt >= dayStart.getTime() ? total + (activity.durationMs ?? 0) : total, 0)
  const focusedTodayMinutes = Math.floor((focusedTodayMs ?? (completedFocusMs + elapsedMs)) / 60000)
  const progress = dailyGoalMinutes ? Math.min(100,100*focusedTodayMinutes/dailyGoalMinutes) : focusSession.mode === 'timer' && focusSession.durationMs ? Math.min(100, (elapsedMs / focusSession.durationMs) * 100) : 0
  const activeTasks = tasks.filter(task => task.status !== 'done')
  const currentPriority = activeTasks.find(task => task.priority === 'urgent' || task.priority === 'high') ?? activeTasks[0]
  const nextAction = activeTasks.find(task => task.status === 'in-progress') ?? activeTasks.find(task => task.status === 'todo')
  const firstName = currentUser.name.trim().split(/\s+/)[0] || 'Você'
  const greeting = getGreeting(timezone?Number(new Intl.DateTimeFormat('pt-BR',{timeZone:timezone,hour:'numeric',hourCycle:'h23'}).format(new Date())):new Date().getHours())
  const todayLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', month: 'short', day: 'numeric',timeZone:timezone }).format(new Date())



  return <main className="reference-home">
    <div className="home-top-grid">
      <section className="reference-hero">
        <div className="hero-art" aria-hidden="true"><HeroTree/></div>
        {focusSession.status !== 'idle' && <div className="hero-team" aria-label="Pessoas nesta sessão de foco"><AssigneeAvatar person={currentUser} size="lg" /></div>}
        <FocusTimer session={focusSession} onComplete={completeFocus} />
        <div className="hero-copy">
          <h1>{greeting}, {firstName}.</h1>
          <p>Veja o que importa hoje{organizationName?`${organizationName.trim().toLowerCase()==='orkto'?' na':' no'} ${organizationName}`:''}.</p>
          <div className={`hero-buttons${focusSession.status !== 'idle' ? ' hero-buttons-active' : ''}`}>
            {focusSession.status === 'idle' ? <button onClick={openFocus}><Play /> Iniciar foco</button> : <>
              <button onClick={focusSession.status === 'paused' ? resumeFocus : pauseFocus}>{focusSession.status === 'paused' ? <Play /> : <Pause />}{focusSession.status === 'paused' ? "Retomar" : "Pausar"}</button>
              <button onClick={requestEndFocus}><Square /> Encerrar sessão</button>
            </>}
          </div>
        </div>
      </section>

      <section className="today-panel">
        <header><CalendarDays /><strong>Hoje</strong><time>{todayLabel}</time></header>
        <div className="today-list">
          <button onClick={openTasks}><Target className={currentPriority ? 'today-accent' : ''} /><span><small>Prioridade atual</small><strong>{currentPriority?.title ?? "Nenhuma prioridade definida"}</strong></span><ChevronRight /></button>
          <div className="today-progress"><CircleGauge className="progress-ring-small" /><div><small>Progresso do foco <b>{Math.round(progress)}%</b></small><i><em style={{ width: `${progress}%` }} /></i><p>{focusedTodayMinutes}min em foco</p></div></div>
          <button onClick={openTasks}><SquareCheckBig /><span><strong>Tarefas restantes</strong></span><b>{activeTasks.length}</b><ChevronRight /></button>
          <button onClick={openTasks}><CirclePlay /><span><small>Próxima ação</small><strong>{nextAction?.title ?? "Nenhuma próxima ação"}</strong></span><ChevronRight /></button>
          <div className="today-static-row"><CircleCheck className="check-accent" /><span><small>Bloqueios</small><strong>Não avaliado</strong></span></div>
        </div>
      </section>
    </div>

    <div className="home-bottom-grid">
      <section className="my-day-panel">
        <header><ListTodo /><strong>Meu dia</strong><span>{activeTasks.length} {activeTasks.length === 1 ? 'tarefa' : 'tarefas'} · {focusedTodayMinutes}min em foco</span></header>
        {activeTasks.length > 0 ? <div className="my-day-list">{activeTasks.slice(0, 5).map(task => <div className="day-task no-project" key={task.id}><span className="day-check" /><button className="day-title" onClick={openTasks}>{task.title}</button><span className="day-flex" /><span className="task-dot" /><button className="day-more" onClick={openTasks} aria-label={`Abrir ${task.title}`}><Ellipsis /></button></div>)}</div> : <div className="home-empty-state my-day-empty"><strong>Nenhuma tarefa para hoje.</strong><span>Adicione sua primeira tarefa quando quiser.</span></div>}
        <button className="add-day-task" onClick={addTask}><Plus /> Adicionar tarefa… <kbd>Ctrl</kbd><kbd>K</kbd></button>
      </section>

      <section className="work-panel">
        <div className="objectives-block">
          <header><Orbit /><strong>Objetivos</strong></header>
          {objectives.length > 0 ? objectives.slice(0, 2).map(objective => <div className="objective-row" key={objective.id}><span className="objective-icon green"><Orbit /></span><div><strong>{objective.title}</strong><small>{objective.description || "Sem descrição"}</small></div><b>{objective.progress}%</b><i><em style={{ width: `${objective.progress}%` }} /></i></div>) : <div className="home-empty-state compact-empty"><strong>Nenhum objetivo ativo.</strong><button onClick={createObjective}><Plus /> Criar objetivo</button></div>}
        </div>
        <div className="recent-block">
          <header><Activity /><strong>Atividade recente</strong></header>
          {activities.length > 0 ? activities.slice(0, 4).map(activity => <div className="recent-row" key={activity.id}><i className={activity.tone ?? 'pale'} /><span>•</span><p>{activity.title}{activity.description && <small>{activity.description}</small>}</p><time>{relativeTime(activity.createdAt)}</time></div>) : <div className="home-empty-state recent-empty"><strong>Nenhuma atividade ainda.</strong><span>O trabalho concluído aparecerá aqui.</span></div>}
        </div>
      </section>

      <section className="team-panel">
        <header><UsersRound /><strong>Equipe em foco</strong></header>
        <div className="team-row"><AssigneeAvatar person={currentUser} size="lg" /><div><p>Você ({firstName}) <b>● {connected===undefined?'Local':!connected ? "Desconectado" : focusSession.status === 'running' ? "Em foco" : focusSession.status === 'paused' ? "Pausado" : "Disponível"}</b></p><span>{currentUser.jobTitle&&<>{currentUser.jobTitle} · </>}{focusSession.status === 'idle' ? "Disponível" : `${elapsedMinutes} min nesta sessão`}</span></div>{focusSession.status !== 'idle' && <time>{elapsedMinutes}m</time>}</div>
        {teamMembers.filter(member => member.id !== currentUser.id).map(member => <div className="team-row" key={member.id}><AssigneeAvatar person={member} size="lg" /><div><p>{member.name} <b>● {member.presence === 'focusing' ? "Em foco" : member.presence === 'online' ? "Disponível" : "Desconectado"}</b></p><span>{member.jobTitle&&<>{member.jobTitle} · </>}{member.focusLabel ?? "Disponível"}</span></div>{member.focusStartedAt && <time>{Math.floor((Date.now() - member.focusStartedAt) / 60000)}m</time>}</div>)}
        {teamMembers.filter(member => member.id !== currentUser.id).length === 0 && <div className="team-empty">Ainda não há outras pessoas aqui.</div>}
        <button className="join-room" disabled={!onInvite} onClick={onInvite} title={onInvite?"Convidar alguém da equipe":'Abra colaboração para criar convites reais'}><UserRoundPlus /> {onInvite?"Convidar membro":"Convites disponíveis no espaço compartilhado"}</button>
      </section>
    </div>
  </main>
}
