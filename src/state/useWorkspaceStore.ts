import { useCallback, useEffect, useState } from 'react'
import { initialActivities, initialInbox, initialObjectives, initialProjects, initialTasks } from '../data/initialData'
import type { ChecklistItem, InboxItem, Objective, Project, Task, WorkspaceActivity } from '../types'

interface PersistedWorkspace {
  tasks: Task[]
  inbox: InboxItem[]
  projects: Project[]
  objectives: Objective[]
  activities: WorkspaceActivity[]
}

const storageKey = 'evergreen.workspace.v1'

function loadWorkspace(): { data: PersistedWorkspace; error: string } {
  const fallback = { tasks: initialTasks, inbox: initialInbox, projects: initialProjects, objectives: initialObjectives, activities: initialActivities }
  try {
    const raw = localStorage.getItem(storageKey)
    const data = raw ? { ...fallback, ...JSON.parse(raw) as PersistedWorkspace } : fallback
    if (!['tasks', 'inbox', 'projects', 'objectives', 'activities'].every(key => Array.isArray(data[key as keyof PersistedWorkspace])) || data.tasks.some(task => !task || typeof task.id !== 'string' || typeof task.title !== 'string' || !Array.isArray(task.checklist))) throw new Error('Invalid local data')
    return { data, error: '' }
  } catch {
    return { data: fallback, error: 'Não foi possível ler os dados locais. O original foi preservado e a gravação foi suspensa. Exporte o backup antes de recuperar os dados.' }
  }
}

export function useWorkspaceStore() {
  const [initial] = useState(loadWorkspace)
  const [workspace, setWorkspace] = useState<PersistedWorkspace>(initial.data)
  const [storageError, setStorageError] = useState(initial.error)

  useEffect(() => {
    if (initial.error) return
    try { localStorage.setItem(storageKey, JSON.stringify(workspace)); setStorageError('') }
    catch { setStorageError('O navegador não permitiu salvar os dados locais. Exporte um backup antes de fechar esta página.') }
  }, [workspace, initial.error])

  const createTask = useCallback((task: Task) => setWorkspace(state => ({ ...state, tasks: [task, ...state.tasks] })), [])
  const updateTask = useCallback((task: Task) => setWorkspace(state => ({ ...state, tasks: state.tasks.map(item => item.id === task.id ? task : item) })), [])
  const deleteTask = useCallback((taskId: string) => setWorkspace(state => ({ ...state, tasks: state.tasks.filter(task => task.id !== taskId) })), [])
  const completeTask = useCallback((taskId: string, completed = true) => setWorkspace(state => ({ ...state, tasks: state.tasks.map(task => task.id === taskId ? { ...task, status: completed ? 'done' : 'todo', completedAt: completed ? new Date().toISOString() : undefined } : task) })), [])
  const addChecklistItem = useCallback((taskId: string, item: ChecklistItem) => setWorkspace(state => ({ ...state, tasks: state.tasks.map(task => task.id === taskId ? { ...task, checklist: [...task.checklist, item] } : task) })), [])
  const toggleChecklistItem = useCallback((taskId: string, itemId: string) => setWorkspace(state => ({ ...state, tasks: state.tasks.map(task => task.id === taskId ? { ...task, checklist: task.checklist.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item) } : task) })), [])
  const setInbox = useCallback((updater: InboxItem[] | ((items: InboxItem[]) => InboxItem[])) => setWorkspace(state => ({ ...state, inbox: typeof updater === 'function' ? updater(state.inbox) : updater })), [])
  const createProject = useCallback((name: string) => setWorkspace(state => ({ ...state, projects: [...state.projects, { id: `project-${crypto.randomUUID()}`, name }] })), [])
  const createObjective = useCallback((title: string) => setWorkspace(state => ({ ...state, objectives: [...state.objectives, { id: `objective-${crypto.randomUUID()}`, title, progress: 0 }] })), [])
  const addActivity = useCallback((activity: WorkspaceActivity) => setWorkspace(state => ({ ...state, activities: [activity, ...state.activities] })), [])

  return { ...workspace, storageError, createTask, updateTask, deleteTask, completeTask, addChecklistItem, toggleChecklistItem, setInbox, createProject, createObjective, addActivity }
}
