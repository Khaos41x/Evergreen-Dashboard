import {colorWarm005} from '../features/appearance/visual-colors'
import type { InboxItem, Objective, Person, Project, Task, TeamMember, WorkspaceActivity } from '../types'

// Temporary local state until the corresponding Supabase queries are connected.
// The authenticated profile may replace this fallback without changing consumers.
export const currentUser: Person = {
  id: 'joao',
  name: 'Você',
  initials: 'VC',
  tone: colorWarm005,
}

export const initialPeople: Person[] = [currentUser]
export const initialTeamMembers: TeamMember[] = []
export const initialTasks: Task[] = []
export const initialInbox: InboxItem[] = []
export const initialObjectives: Objective[] = []
export const initialActivities: WorkspaceActivity[] = []
export const initialProjects: Project[] = []
