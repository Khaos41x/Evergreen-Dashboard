import {codeLabel} from '../../i18n/pt-BR'
import {usePublicProfiles} from './Avatars'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { HomePage } from '../../pages/HomePage'
import { FocusDialog } from '../../components/FocusDialog'
import { SessionCompleteDialog } from '../../components/FocusSessionDialogs'
import type { FocusSession, FocusSessionDraft, Person, Task, TeamMember } from '../../types'
import type { Member, RecordItem } from '../../collaboration/models'
import type { useProductivity } from './useProductivity'
import type { CloudFocus } from './models'
import { productivityRepository as repo } from './repository'
import { failure } from '../../collaboration/client'
export function focusSession(f:CloudFocus):FocusSession{return {mode:f.mode,status:f.status,startedAt:Date.parse(f.started_at),pausedAt:f.paused_at?Date.parse(f.paused_at):null,accumulatedPausedMs:f.paused_ms,durationMs:f.duration_ms,title:f.title,description:f.description,taskId:f.task_id??undefined,objectiveId:f.objective_id??undefined}}
export function FocusHome({workspaceId,workspaceName,userId,name,members,records,domain,online,onTasks,onObjective,onInvite,refresh,focusRequest=0,initialTaskId,onConsumeFocusRequest}:{workspaceId:string;workspaceName?:string;userId:string;name:string;members:Member[];records:RecordItem[];domain:ReturnType<typeof useProductivity>;online:Record<string,'online'|'away'>;onTasks:()=>void;onObjective:()=>void;onInvite:()=>void;refresh:()=>Promise<void>;focusRequest?:number;initialTaskId?:string;onConsumeFocusRequest?:()=>void}){
 const [starting,setStarting]=useState(false),[ending,setEnding]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(false)
 const active=domain.focus.find(f=>f.user_id===userId&&f.status!=='completed')
 useEffect(()=>{if(focusRequest){setStarting(true);onConsumeFocusRequest?.()}},[focusRequest])
 const [autoComplete,setAutoComplete]=useState(false)
 const completionKey=active?`evergreen.focus-dismissed.${userId}.${workspaceId}.${active.id}.${active.duration_ms}`:''
 const complete=useCallback(()=>{try{if(completionKey&&sessionStorage.getItem(completionKey)==='yes')return}catch{/* Optional UI acknowledgement only. */}setAutoComplete(true)},[completionKey])
 const closeCompletion=()=>{if(completionKey)try{sessionStorage.setItem(completionKey,'yes')}catch{/* Dismissal still works for this mounted screen. */}setEnding(false);setAutoComplete(false)}
 const session=useMemo<FocusSession>(()=>active?focusSession(active):{mode:'timer',status:'idle',startedAt:null,pausedAt:null,accumulatedPausedMs:0,durationMs:null,title:'',description:''},[active])
 const zone=domain.profile?.timezone??Intl.DateTimeFormat().resolvedOptions().timeZone
 const dayKey=new Date().toLocaleDateString('en-CA',{timeZone:zone})
 const ownMs=domain.focus.filter(f=>f.user_id===userId&&new Date(f.started_at).toLocaleDateString('en-CA',{timeZone:zone})===dayKey).reduce((n,f)=>n+(f.status==='completed'?f.elapsed_ms:Math.min(f.mode==='timer'?f.duration_ms??Infinity:Infinity,Math.max(0,(f.paused_at?Date.parse(f.paused_at):Date.now())-Date.parse(f.started_at)-f.paused_ms))),0)
 const publicProfiles=usePublicProfiles()
 const currentUser:Person={id:userId,name:publicProfiles[userId]?.name||name,jobTitle:publicProfiles[userId]?.jobTitle,avatarUrl:publicProfiles[userId]?.url,initials:name.slice(0,2).toUpperCase(),tone:'#27664d'}
 const tasks:Task[]=records.filter(r=>r.kind==='task'&&!r.archived_at).map(r=>({id:r.id,title:r.title,description:r.description,status:r.status,priority:r.priority??'normal',assigneeId:r.assignee_id??undefined,projectId:r.project_id??undefined,objectiveId:r.objective_id??undefined,createdAt:r.created_at,dueDate:r.due_date??undefined,checklist:domain.checklist.filter(i=>i.record_id===r.id)}))
 const teamMembers:TeamMember[]=members.filter(m=>m.user_id!==userId).map(m=>{const focus=domain.focus.find(f=>f.user_id===m.user_id&&f.status==='running');return {id:m.user_id,name:publicProfiles[m.user_id]?.name||m.display_name,jobTitle:publicProfiles[m.user_id]?.jobTitle,avatarUrl:publicProfiles[m.user_id]?.url,initials:m.display_name.slice(0,2).toUpperCase(),tone:'#27664d',presence:online[m.user_id]==='online'?(focus?'focusing':'online'):'offline',focusStartedAt:focus?Date.parse(focus.started_at)+focus.paused_ms:undefined,focusLabel:focus?.title}})
 const activities=domain.activity.map(a=>({id:a.id,title:codeLabel(a.type),description:a.title,createdAt:Date.parse(a.created_at),tone:'green' as const,durationMs:a.type==='focus_completed'?domain.focus.find(f=>f.id===a.resource_id)?.elapsed_ms:undefined}))
 const run=async(action:string,data:Record<string,unknown>={})=>{setPending(true);setError('');try{await repo.focus(workspaceId,action,data);await refresh();return true}catch(e){setError(failure(e));return false}finally{setPending(false)}}
 async function start(draft:FocusSessionDraft){if(await run('start',{title:draft.title,description:draft.description,mode:draft.mode,duration_ms:draft.durationMs,task_id:draft.taskId,objective_id:draft.objectiveId})){setStarting(false);setAutoComplete(false)}}
 return <><div className="domain-home">{error&&<p role="alert" className="collab-error">{error}</p>}{domain.error&&<p role="alert" className="collab-error">{domain.error}</p>}
  <HomePage organizationName={workspaceName} onInvite={onInvite} dailyGoalMinutes={domain.profile?.preferences.daily_goal_minutes} focusedTodayMs={ownMs} timezone={domain.profile?.timezone} connected={!!online[userId]} tasks={tasks.filter(t=>t.assigneeId===userId)} objectives={records.filter(r=>r.kind==='objective'&&!r.archived_at).map(r=>({id:r.id,title:r.title,description:r.description,progress:r.progress}))} activities={activities} teamMembers={teamMembers.filter(m=>online[m.id])} currentUser={currentUser} focusSession={session} openTasks={onTasks} addTask={onTasks} createObjective={onObjective} openFocus={()=>setStarting(true)} pauseFocus={()=>{if(!pending)void run('pause')}} resumeFocus={()=>{if(!pending)void run('resume')}} requestEndFocus={()=>setEnding(true)} completeFocus={complete}/>
  {active&&<div className="domain-focus-extra"><button disabled={pending||active.mode!=='timer'} onClick={()=>void run('extend')}>Estender +5 min</button><label>Trocar tarefa<select value="" disabled={pending} onChange={e=>{if(e.target.value)void run('switch',{task_id:e.target.value})}}><option value="">Escolher tarefa</option>{tasks.filter(t=>t.id!==active.task_id&&t.status!=='done').map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label><small>Tempo calculado pelos horários registrados do servidor. Presença depende da conexão atual.</small></div>}
 </div>
 <FocusDialog pending={pending} error={error} initialTaskId={initialTaskId} defaultMinutes={domain.profile?.preferences.focus_minutes??25} open={starting} tasks={tasks} objectives={records.filter(r=>r.kind==='objective').map(r=>({id:r.id,title:r.title,progress:r.progress}))} onClose={()=>setStarting(false)} onStart={draft=>{if(!pending)void start(draft)}}/>
 <SessionCompleteDialog onClose={closeCompletion} pending={pending} error={error} open={!!active&&(ending||autoComplete)} session={session} task={tasks.find(t=>t.id===active?.task_id)} durationMs={active?Math.max(0,Math.min(active.mode==='timer'?active.duration_ms??Infinity:Infinity,(active.paused_at?Date.parse(active.paused_at):Date.now())-Date.parse(active.started_at)-active.paused_ms)):0} onSave={result=>{if(!pending)void run('finish',{depth:result.depth,note:result.note,complete_task:result.completeTask}).then(ok=>{if(ok){setEnding(false);setAutoComplete(false)}})}}/>
 </>
}
