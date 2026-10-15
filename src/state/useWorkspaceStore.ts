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

function loadWorkspace(): PersistedWorkspace {
  const fallback = { tasks: initialTasks, inbox: initialInbox, projects: initialProjects, objectives: initialObjectives, activities: initialActivities }
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? { ...fallback, ...JSON.parse(raw) as PersistedWorkspace } : fallback
  } catch {
    return fallback
  }
}

export function useWorkspaceStore() {
  const [workspace, setWorkspace] = useState<PersistedWorkspace>(loadWorkspace)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(workspace))
  }, [workspace])

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

  return { ...workspace, createTask, updateTask, deleteTask, completeTask, addChecklistItem, toggleChecklistItem, setInbox, createProject, createObjective, addActivity }
}
