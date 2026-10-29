import type { Member, RecordItem, Channel } from '../../collaboration/models'
import type { Activity, CloudFocus } from '../productivity/models'
import type { FocusSession, Project, Task, WorkspaceActivity } from '../../types'
import type { WorldData } from './model'

export function localWorldData(input: { tasks: Task[]; projects: Project[]; activities: WorkspaceActivity[]; focus: FocusSession; userId: string }): WorldData {
  return {
    scope: 'personal-local', name: 'Seu espaço pessoal', source: 'local', userId: input.userId,
    // A local profile is not a verified colleague. Never invent a connected team.
    members: [{ id: input.userId, name: 'Você · local', presence: input.focus.status === 'running' ? 'focusing' : 'local' }],
    tasks: input.tasks.map(t => ({ id: t.id, title: t.title, status: t.status, projectId: t.projectId ?? null, assigneeId: t.assigneeId ?? null, progress: t.status === 'done' ? 100 : t.checklist.length ? Math.round(100 * t.checklist.filter(c => c.completed).length / t.checklist.length) : 0, canComplete: t.status !== 'done' })),
    projects: input.projects.map(p => ({ id: p.id, name: p.name, description: '' })),
    activity: input.activities.map(a => ({ id: a.id, title: a.title, actorId: input.userId, resourceId: a.taskId ?? null, at: new Date(a.createdAt).toISOString() })), channels: [],
  }
}
export function cloudWorldData(input: { workspaceId: string; name: string; userId: string; members: Member[]; records: RecordItem[]; channels: Channel[]; focus: CloudFocus[]; activity: Activity[]; online: Record<string, 'online' | 'away'>; presenceError: string; error: string; loading: boolean; canMutate: boolean }): WorldData {
  const records = input.records.filter(r => r.workspace_id === input.workspaceId && !r.archived_at)
  return {
    scope: input.workspaceId, name: input.name, source: 'workspace', userId: input.userId,
    members: input.members.filter(m => m.workspace_id === input.workspaceId).map(m => {
      const state = input.online[m.user_id]
      return { id: m.user_id, name: m.display_name, presence: state === 'online' && input.focus.some(f => f.workspace_id === input.workspaceId && f.user_id === m.user_id && f.status === 'running') ? 'focusing' : state ?? 'unknown' }
    }),
    tasks: records.filter(r => r.kind === 'task').map(r => ({ id: r.id, title: r.title, status: r.status, projectId: r.project_id, assigneeId: r.assignee_id, progress: r.progress, canComplete: input.canMutate && r.status !== 'done' })),
    projects: records.filter(r => r.kind === 'project').map(r => ({ id: r.id, name: r.title, description: r.description })),
    activity: input.activity.filter(a => a.workspace_id === input.workspaceId).map(a => ({ id: a.id, title: a.title, actorId: a.actor_id, resourceId: a.resource_id, at: a.created_at })),
    channels: input.channels.filter(c => c.workspace_id === input.workspaceId && !c.archived).map(c => ({ id: c.id, name: c.name })),
    presenceError: input.presenceError, error: input.error, loading: input.loading,
  }
}
