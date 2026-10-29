import { checked, db } from '../../collaboration/client'
import type { RecordItem } from '../../collaboration/models'
import type { Activity, ChecklistEntry, CloudFocus, Handoff, Notification, PrivateInbox, RecordComment, Suggestion } from './models'
import type { Area,Goal,GoalLink } from './ObjectivesModule'
export interface OwnProfile {display_name:string;timezone:string;preferences:{focus_minutes?:number;daily_goal_minutes?:number};avatar_path:string|null}

export const domainTables = ['eg_checklist','eg_comments','eg_inbox','eg_suggestions','eg_handoffs','eg_notifications','eg_activity','eg_focus','eg_areas','eg_goals','eg_goal_tasks'] as const
export async function loadProductivity(workspaceId: string, recordIds: string[]) {
  await checked(db().rpc('eg_due_notifications',{p_workspace:workspaceId}))
  const [checklist,comments,inbox,suggestions,handoffs,notifications,activity,focus] = await Promise.all([
    recordIds.length ? checked(db().from('eg_checklist').select('*').in('record_id',recordIds).order('position')).then(rows=>rows as ChecklistEntry[]) : [],
    recordIds.length ? checked(db().from('eg_comments').select('*').in('record_id',recordIds).order('created_at')).then(rows=>rows as RecordComment[]) : [],
    checked(db().from('eg_inbox').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false})).then(rows=>rows as PrivateInbox[]),
    checked(db().from('eg_suggestions').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false})).then(rows=>rows as Suggestion[]),
    checked(db().from('eg_handoffs').select('*').eq('workspace_id',workspaceId)).then(rows=>rows as Handoff[]),
    checked(db().from('eg_notifications').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false})).then(rows=>rows as Notification[]),
    checked(db().from('eg_activity').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false}).limit(500)).then(rows=>rows as Activity[]),
    checked(db().from('eg_focus').select('*').eq('workspace_id',workspaceId).order('started_at',{ascending:false})).then(rows=>rows as CloudFocus[]),
  ])
  const areas=recordIds.length?await checked(db().from('eg_areas').select('*').in('objective_id',recordIds)) as Area[]:[]
  const goals=areas.length?await checked(db().from('eg_goals').select('*').in('area_id',areas.map(a=>a.id))) as Goal[]:[]
  const links=goals.length?await checked(db().from('eg_goal_tasks').select('*').in('goal_id',goals.map(g=>g.id))) as GoalLink[]:[]
  const profile=await checked(db().from('eg_profiles').select('display_name,timezone,preferences,avatar_path').maybeSingle()) as OwnProfile|null
  return {checklist,comments,inbox,suggestions,handoffs,notifications,activity,focus,areas,goals,links,profile}
}
export const productivityRepository = {
  saveRecord: async (workspaceId: string, record: RecordItem | null, fields: Partial<RecordItem>) => {
    if (record) {
      const row=await checked(db().from('eg_records').update(fields).eq('id',record.id).eq('version',record.version).select().maybeSingle())
      if(!row) throw new Error('Este item mudou em outra sessão. Reabra a versão atual antes de salvar.')
      return row as RecordItem
    }
    return await checked(db().from('eg_records').insert({...fields,workspace_id:workspaceId}).select().single()) as RecordItem
  },
  saveChecklist: async (record: RecordItem, entries: Pick<ChecklistEntry,'text'|'completed'>[]) => {await checked(db().rpc('eg_save_checklist',{p_record:record.id,p_version:record.version,p_items:entries}))},
  comment: async (recordId: string, body: string) => {await checked(db().from('eg_comments').insert({record_id:recordId,body}))},
  editComment: async (id:string,body:string,deleted=false) => {await checked(db().from('eg_comments').update({body,deleted}).eq('id',id).select().single())},
  focus: async (workspaceId:string,action:string,data:Record<string,unknown>) => {await checked(db().rpc('eg_focus_action',{p_workspace:workspaceId,p_action:action,p_data:data}))},
}
