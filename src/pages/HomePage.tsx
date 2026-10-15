import { useEffect, useState } from 'react'
import { Activity, CalendarDays, ChevronRight, CircleCheck, CircleGauge, CirclePlay, Ellipsis, Headphones, ListTodo, Orbit, Pause, Play, Plus, Square, SquareCheckBig, Target, UserRoundPlus, UsersRound } from 'lucide-react'
import type { FocusSession, Objective, Person, Task, TeamMember, WorkspaceActivity } from '../types'
import { AssigneeAvatar } from '../components/ui'
import { FocusTimer } from '../components/FocusTimer'
import { getFocusElapsedMs } from '../state/useFocusSession'

export function getGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function relativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function HomePage({ tasks, objectives, activities, teamMembers, currentUser, focusSession, openTasks, addTask, createObjective, openFocus, pauseFocus, resumeFocus, requestEndFocus, completeFocus }: {
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
  const [inviteCopied, setInviteCopied] = useState(false)

  useEffect(() => {
    if (focusSession.status !== 'running') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [focusSession.status])

  const elapsedMs = getFocusElapsedMs(focusSession, now)
  const elapsedMinutes = Math.floor(elapsedMs / 60000)
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
  const completedFocusMs = activities.reduce((total, activity) => activity.createdAt >= dayStart.getTime() ? total + (activity.durationMs ?? 0) : total, 0)
  const focusedTodayMinutes = Math.floor((completedFocusMs + elapsedMs) / 60000)
  const progress = focusSession.mode === 'timer' && focusSession.durationMs ? Math.min(100, (elapsedMs / focusSession.durationMs) * 100) : 0
  const activeTasks = tasks.filter(task => task.status !== 'done')
  const currentPriority = activeTasks.find(task => task.priority === 'urgent' || task.priority === 'high') ?? activeTasks[0]
  const nextAction = activeTasks.find(task => task.status === 'in-progress') ?? activeTasks.find(task => task.status === 'todo')
  const firstName = currentUser.name.trim().split(/\s+/)[0] || 'João'
  const greeting = getGreeting(new Date().getHours())
  const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())

  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setInviteCopied(true) } catch { setInviteCopied(false) }
  }

  return <main className="reference-home">
    <div className="home-top-grid">
      <section className="reference-hero">
        <div className="hero-art" aria-hidden="true" />
        {focusSession.status !== 'idle' && <div className="hero-team" aria-label="People in this focus session"><AssigneeAvatar person={currentUser} size="lg" /></div>}
        <FocusTimer session={focusSession} onComplete={completeFocus} />
        <div className="hero-copy">
          <h1>{greeting}, {firstName}.</h1>
          <p>Here’s what matters today.</p>
          <div className="hero-buttons">
            {focusSession.status === 'idle' ? <button onClick={openFocus}><Play /> Start focus</button> : <>
              <button onClick={focusSession.status === 'paused' ? resumeFocus : pauseFocus}>{focusSession.status === 'paused' ? <Play /> : <Pause />}{focusSession.status === 'paused' ? 'Resume' : 'Pause'}</button>
              <button onClick={requestEndFocus}><Square /> End session</button>
            </>}
          </div>
          <div className="focus-note"><Headphones /><span><strong>{focusSession.status === 'idle' ? 'Ready when you are' : focusSession.status === 'paused' ? 'Focus paused' : 'Focus mode'}</strong>{focusSession.status !== 'idle' && <small>{focusSession.status === 'paused' ? 'Resume when you’re ready.' : `${elapsedMinutes}m focused in this session.`}</small>}</span></div>
        </div>
      </section>

      <section className="today-panel">
        <header><CalendarDays /><strong>Today</strong><time>{todayLabel}</time></header>
        <div className="today-list">
          <button onClick={openTasks}><Target className={currentPriority ? 'today-accent' : ''} /><span><small>Current priority</small><strong>{currentPriority?.title ?? 'No priority set'}</strong></span><ChevronRight /></button>
          <div className="today-progress"><CircleGauge className="progress-ring-small" /><div><small>Focus progress <b>{Math.round(progress)}%</b></small><i><em style={{ width: `${progress}%` }} /></i><p>{focusedTodayMinutes}m focused</p></div></div>
          <button onClick={openTasks}><SquareCheckBig /><span><strong>Tasks remaining</strong></span><b>{activeTasks.length}</b><ChevronRight /></button>
          <button onClick={openTasks}><CirclePlay /><span><small>Next action</small><strong>{nextAction?.title ?? 'No next action'}</strong></span><ChevronRight /></button>
          <div className="today-static-row"><CircleCheck className="check-accent" /><span><small>Blockers</small><strong>No blockers</strong></span></div>
        </div>
      </section>
    </div>

    <div className="home-bottom-grid">
      <section className="my-day-panel">
        <header><ListTodo /><strong>My Day</strong><span>{activeTasks.length} {activeTasks.length === 1 ? 'task' : 'tasks'} · {focusedTodayMinutes}m focus</span></header>
        {activeTasks.length > 0 ? <div className="my-day-list">{activeTasks.slice(0, 5).map(task => <div className="day-task no-project" key={task.id}><span className="day-check" /><button className="day-title" onClick={openTasks}>{task.title}</button><span className="day-flex" /><span className="task-dot" /><button className="day-more" onClick={openTasks} aria-label={`Open ${task.title}`}><Ellipsis /></button></div>)}</div> : <div className="home-empty-state my-day-empty"><strong>No tasks for today.</strong><span>Add your first task when you’re ready.</span></div>}
        <button className="add-day-task" onClick={addTask}><Plus /> Add a task… <kbd>Ctrl</kbd><kbd>K</kbd></button>
      </section>

      <section className="work-panel">
        <div className="objectives-block">
          <header><Orbit /><strong>Objectives</strong></header>
          {objectives.length > 0 ? objectives.slice(0, 2).map(objective => <div className="objective-row" key={objective.id}><span className="objective-icon green"><Orbit /></span><div><strong>{objective.title}</strong><small>{objective.description || 'No description'}</small></div><b>{objective.progress}%</b><i><em style={{ width: `${objective.progress}%` }} /></i></div>) : <div className="home-empty-state compact-empty"><strong>No active objectives.</strong><button onClick={createObjective}><Plus /> Create objective</button></div>}
        </div>
        <div className="recent-block">
          <header><Activity /><strong>Recent Work</strong></header>
          {activities.length > 0 ? activities.slice(0, 4).map(activity => <div className="recent-row" key={activity.id}><i className={activity.tone ?? 'pale'} /><span>•</span><p>{activity.title}{activity.description && <small>{activity.description}</small>}</p><time>{relativeTime(activity.createdAt)}</time></div>) : <div className="home-empty-state recent-empty"><strong>No activity yet.</strong><span>Your completed work will appear here.</span></div>}
        </div>
      </section>

      <section className="team-panel">
        <header><UsersRound /><strong>Team in Focus</strong></header>
        <div className="team-row"><AssigneeAvatar person={currentUser} size="lg" /><div><p>You ({firstName}) <b>● {focusSession.status === 'running' ? 'Focusing' : focusSession.status === 'paused' ? 'Paused' : 'Online'}</b></p><span>{focusSession.status === 'idle' ? 'Available' : `${elapsedMinutes}m in this session`}</span></div>{focusSession.status !== 'idle' && <time>{elapsedMinutes}m</time>}</div>
        {teamMembers.filter(member => member.id !== currentUser.id).map(member => <div className="team-row" key={member.id}><AssigneeAvatar person={member} size="lg" /><div><p>{member.name} <b>● {member.presence === 'focusing' ? 'Focusing' : member.presence === 'online' ? 'Online' : 'Offline'}</b></p><span>{member.focusLabel ?? 'Available'}</span></div>{member.focusStartedAt && <time>{Math.floor((Date.now() - member.focusStartedAt) / 60000)}m</time>}</div>)}
        {teamMembers.filter(member => member.id !== currentUser.id).length === 0 && <div className="team-empty">No one else is here yet.</div>}
        <button className="join-room" onClick={copyInvite}><UserRoundPlus /> {inviteCopied ? 'Invite link copied' : 'Invite member'}</button>
      </section>
    </div>
  </main>
}
