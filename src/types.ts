export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'done'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type TabKey = 'my-tasks' | 'team' | 'inbox' | 'completed'

export interface Person {
  id: string
  name: string
  initials: string
  tone: string
}

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface Comment {
  id: string
  author: string
  initials: string
  body: string
  time: string
}

export interface ActivityItem {
  id: string
  body: string
  time: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  assigneeId?: string
  projectId?: string
  objectiveId?: string
  dueDate?: string
  checklist: ChecklistItem[]
  createdAt: string
  completedAt?: string
  comments?: Comment[]
  activity?: ActivityItem[]
}

export interface InboxItem {
  id: string
  title: string
  created: string
}

export interface Project {
  id: string
  name: string
}

export interface Objective {
  id: string
  title: string
  description?: string
  progress: number
}

export interface WorkspaceActivity {
  id: string
  title: string
  description?: string
  createdAt: number
  tone?: 'green' | 'yellow' | 'pale'
  durationMs?: number
  taskId?: string
  objectiveId?: string
  focusDepth?: 'distracted' | 'normal' | 'deep'
}

export interface TeamMember extends Person {
  presence: 'online' | 'offline' | 'focusing'
  focusStartedAt?: number
  focusLabel?: string
}

export type FocusMode = 'timer' | 'stopwatch'
export type FocusStatus = 'idle' | 'running' | 'paused' | 'completed'

export interface FocusSession {
  mode: FocusMode
  status: FocusStatus
  startedAt: number | null
  pausedAt: number | null
  accumulatedPausedMs: number
  durationMs: number | null
  taskId?: string
  objectiveId?: string
  title: string
  description: string
}

export interface FocusSessionDraft {
  mode: FocusMode
  durationMs: number | null
  taskId?: string
  objectiveId?: string
  title: string
  description: string
}
