import {useSurface} from './features/navigation'
import {usePersonalProfile,PersonalProfile} from './state/usePersonalProfile'
const Economy=lazy(()=>import('./features/economy/Economy'))
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { CommandPalette } from './components/CommandPalette'
import { EntityDialog } from './components/EntityDialog'
import { FocusDialog } from './components/FocusDialog'
import { EndFocusDialog, SessionCompleteDialog } from './components/FocusSessionDialogs'
import { HomePage } from './pages/HomePage'
import { TasksPage } from './pages/TasksPage'
import { initialTeamMembers } from './data/initialData'
import { getFocusElapsedMs, useFocusSession } from './state/useFocusSession'
import { useWorkspaceStore } from './state/useWorkspaceStore'
import type { FocusSessionDraft, WorkspaceActivity } from './types'

import { localWorldData } from './features/world/adapters'
import { WorldEntry } from "./features/world/WorldEntry"

export function App() {
  const [surface,navigateSurface]=useSurface(true)
  const world=surface==='vision',setWorld=(value:boolean)=>navigateSurface(value?'vision':'hub')
  const [currentUser,saveProfile]=usePersonalProfile()
  const initialPeople=[currentUser]
  const [worldTask,setWorldTask]=useState<string|undefined>()
  const [worldProject,setWorldProject]=useState<string|undefined>()
  const [page, setPage] = useState<'home' | 'tasks'>('home')
  const [palette, setPalette] = useState(false)
  const [createSignal, setCreateSignal] = useState(0)
  const [inboxSignal, setInboxSignal] = useState(0)
  const [projectDialog, setProjectDialog] = useState(false)
  const [objectiveDialog, setObjectiveDialog] = useState(false)
  const [focusDialog, setFocusDialog] = useState(false)
  const [focusTaskId, setFocusTaskId] = useState<string | undefined>()
  const [endDialog, setEndDialog] = useState(false)
  const workspace = useWorkspaceStore()
  const focus = useFocusSession()

  const requestFocus = useCallback((taskId?: string) => {
    setWorld(false); setPage('home'); setPalette(false); setFocusTaskId(taskId); setFocusDialog(true)
  }, [])
  const createTask = useCallback(() => { setWorld(false); setPage('tasks'); setPalette(false); setCreateSignal(value => value + 1) }, [])
  const searchTasks = useCallback(() => {
    setPage('tasks'); setPalette(false)
    window.setTimeout(() => document.querySelector<HTMLInputElement>('#task-search')?.focus(), 0)
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const writing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (event.ctrlKey && event.key.toLowerCase() === 'k') { event.preventDefault(); setPalette(value => !value) }
      if (event.key === 'Escape') setPalette(false)
      if (!writing && event.key.toLowerCase() === 'f' && page === 'home' && focus.session.status === 'idle') requestFocus()
      if (!writing && event.key.toLowerCase() === 'c') createTask()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [page, focus.session.status, requestFocus, createTask])

  const openInbox = () => { setWorld(false); setPage('tasks'); setPalette(false); setInboxSignal(value => value + 1) }
  const startFocus = (draft: FocusSessionDraft) => { focus.start(draft); setFocusDialog(false); setPage('home') }
  const activityForFocus = (durationMs: number, note?: string, depth?: 'distracted' | 'normal' | 'deep'): WorkspaceActivity => ({ id: `activity-${crypto.randomUUID()}`, title: 'You finished a focus session', description: [focus.session.title, `${Math.max(1, Math.round(durationMs / 60000))}m focused`, depth, note].filter(Boolean).join(' · '), createdAt: Date.now(), tone: 'green', durationMs, taskId: focus.session.taskId, objectiveId: focus.session.objectiveId, focusDepth: depth })
  const confirmEnd = () => {
    const elapsed = getFocusElapsedMs(focus.session)
    if (elapsed > 0) workspace.addActivity(activityForFocus(elapsed))
    focus.reset(); setEndDialog(false)
  }
  const saveCompleted = (result: { depth: 'distracted' | 'normal' | 'deep'; note: string; completeTask: boolean }) => {
    const elapsed = focus.session.durationMs ?? getFocusElapsedMs(focus.session)
    workspace.addActivity(activityForFocus(elapsed, result.note, result.depth))
    if (result.completeTask && focus.session.taskId) workspace.completeTask(focus.session.taskId, true)
    focus.reset()
  }

  if(surface==='economy')return <Suspense fallback={<p role='status'>Abrindo Economy…</p>}><Economy workspaceId='' name='Espaço pessoal' email='' onBack={()=>navigateSurface('vision')}/></Suspense>
  return <AppShell world={world} onWorldChange={setWorld} page={page} setPage={next=>{setWorld(false);setPage(next)}} onOpenPalette={() => setPalette(true)} projects={workspace.projects} currentUser={currentUser} onNewProject={() => setProjectDialog(true)} onOpenFocus={() => requestFocus()}>
    <PersonalProfile person={currentUser} onSave={saveProfile}/>
    {workspace.storageError && <p role="alert" className="collab-error">{workspace.storageError}</p>}
    {focus.storageError && <p role="alert" className="collab-error">{focus.storageError}</p>}
    {world ? <WorldEntry onExit={()=>setWorld(false)} data={localWorldData({tasks:workspace.tasks,projects:workspace.projects,activities:workspace.activities,focus:focus.session,userId:currentUser.id})} actions={{onOpenEconomy:()=>navigateSurface('economy'),onOpenTask:id=>{setWorldTask(id);setWorld(false);setPage('tasks')},onOpenProject:id=>{setWorldProject(id);setWorldTask(undefined);setWorld(false);setPage('tasks')},onCompleteTask:async id=>{workspace.completeTask(id,true)},onFocusTask:requestFocus,onCreateTask:createTask}}/> : page === 'tasks' ? <TasksPage openTaskId={worldTask} initialProjectId={worldProject} requestCreate={createSignal} consumeCreate={() => setCreateSignal(0)} openInboxSignal={inboxSignal} tasks={workspace.tasks} inbox={workspace.inbox} setInbox={workspace.setInbox} people={initialPeople} projects={workspace.projects} objectives={workspace.objectives} currentUser={currentUser} onCreateTask={workspace.createTask} onUpdateTask={workspace.updateTask} onDeleteTask={workspace.deleteTask} onCompleteTask={workspace.completeTask} onCreateProject={() => setProjectDialog(true)} onCreateObjective={() => setObjectiveDialog(true)} onStartFocus={requestFocus} /> : <HomePage tasks={workspace.tasks} objectives={workspace.objectives} activities={workspace.activities} teamMembers={initialTeamMembers} currentUser={currentUser} focusSession={focus.session} openTasks={() => setPage('tasks')} addTask={createTask} createObjective={() => setObjectiveDialog(true)} openFocus={() => requestFocus()} pauseFocus={focus.pause} resumeFocus={focus.resume} requestEndFocus={() => setEndDialog(true)} completeFocus={focus.complete} />}
    <CommandPalette open={palette} onClose={() => setPalette(false)} onCreate={createTask} onSearchTasks={searchTasks} onInbox={openInbox} onStartFocus={() => requestFocus()} onCreateObjective={() => { setPalette(false); setObjectiveDialog(true) }} />
    <EntityDialog open={projectDialog} title="New project" placeholder="Project name" actionLabel="Create project" onClose={() => setProjectDialog(false)} onCreate={workspace.createProject} />
    <EntityDialog open={objectiveDialog} title="Create objective" placeholder="Objective title" actionLabel="Create objective" onClose={() => setObjectiveDialog(false)} onCreate={workspace.createObjective} />
    <FocusDialog open={focusDialog} tasks={workspace.tasks} objectives={workspace.objectives} initialTaskId={focusTaskId} onClose={() => setFocusDialog(false)} onStart={startFocus} />
    <EndFocusDialog open={endDialog} onCancel={() => setEndDialog(false)} onConfirm={confirmEnd} />
    <SessionCompleteDialog open={focus.session.status === 'completed'} session={focus.session} task={workspace.tasks.find(task => task.id === focus.session.taskId)} durationMs={focus.session.durationMs ?? getFocusElapsedMs(focus.session)} onSave={saveCompleted} />
  </AppShell>
}
