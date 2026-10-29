export type WorldPresence = 'online' | 'away' | 'focusing' | 'unknown' | 'local'
export interface WorldMember { id: string; name: string; presence: WorldPresence }
export interface WorldTask { id: string; title: string; status: string; projectId: string | null; assigneeId: string | null; progress: number; canComplete: boolean }
export interface WorldProject { id: string; name: string; description: string }
export interface WorldActivity { id: string; title: string; actorId: string | null; resourceId: string | null; at: string }
export interface WorldChannel { id: string; name: string }
export interface WorldData {
  scope: string; name: string; source: 'local' | 'workspace'; userId: string
  members: WorldMember[]; projects: WorldProject[]; tasks: WorldTask[]; activity: WorldActivity[]; channels: WorldChannel[]
  presenceError?: string; error?: string; loading?: boolean
}
export type WorldSelection = { kind: 'member' | 'project'; id: string } | null
export interface WorldActions {
  onOpenTask: (id: string) => void; onOpenProject: (id: string) => void
  onCompleteTask?: (id: string) => Promise<void>; onFocusTask?: (id: string) => void
  onOpenChannel?: (id: string) => void; onCreateTask?: () => void
}
export const presenceLabels: Record<WorldPresence, string> = { online: 'Disponível', away: 'Ausente', focusing: 'Em foco', unknown: 'Presença não verificada', local: 'Somente neste navegador' }
export function tasksFor(data: WorldData, selection: WorldSelection) {
  if (!selection) return []
  return data.tasks.filter(t => selection.kind === 'member' ? t.assigneeId === selection.id : t.projectId === selection.id)
}
export function completion(tasks: WorldTask[]) {
  return tasks.length ? Math.round(100 * tasks.filter(t => t.status === 'done').length / tasks.length) : null
}
export function layoutWorld(memberCount: number, projectCount: number) {
  const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(memberCount))))
  const rows = Math.ceil(memberCount / columns)
  const width = columns * 3.1 + (projectCount ? 8 : 5), depth = Math.max(10, rows * 3.3 + 4)
  const stations = Array.from({ length: memberCount }, (_, i) => [((i % columns) - (columns - 1) / 2) * 3.1, 0, (Math.floor(i / columns) - (rows - 1) / 2) * 3.3] as [number, number, number])
  const rooms = Array.from({ length: projectCount }, (_, i) => [(i < 3 ? -1 : 1) * (columns * 3.1 / 2 + 2), 0, ((i % 3) - 1) * 3.2] as [number, number, number])
  return { width, depth, stations, rooms }
}
