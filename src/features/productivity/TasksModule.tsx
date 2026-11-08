import { AppSelect } from '../appearance/AppSelect'
import {codeLabel} from '../../i18n/pt-BR'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { TaskToolbar } from '../../components/TaskToolbar'
import { TaskRow } from '../../components/TaskRow'
import type { Member, RecordItem } from '../../collaboration/models'
import type { Person, Priority, Task, TaskStatus } from '../../types'
import { checked, db, failure } from '../../collaboration/client'
import { TaskEditor } from './TaskEditor'
import { productivityRepository as repo } from './repository'
import type { useProductivity } from './useProductivity'

export function TasksModule({workspaceId,userId,members,records,domain,refresh,onStartFocus,kind='task',requestCreate=0,onConsumeCreate}:{workspaceId:string;userId:string;members:Member[];records:RecordItem[];domain:ReturnType<typeof useProductivity>;refresh:()=>Promise<void>;onStartFocus:(id?:string)=>void;kind?:'task'|'issue';requestCreate?:number;onConsumeCreate?:()=>void}){
 const [tab,setTab]=useState('mine'),[query,setQuery]=useState(''),[project,setProject]=useState('all'),[sort,setSort]=useState("Prioridade"),[view,setView]=useState('list')
 const [filters,setFilters]=useState<{assignee:string;priority:Priority|'all';due:'all'|'today'|'week'|'overdue'|'none';status:TaskStatus|'all'}>({assignee:'all',priority:'all',due:'all',status:'all'})
 const [editing,setEditing]=useState<string|null|undefined>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[optimistic,setOptimistic]=useState<Record<string,TaskStatus>>({})
 const close=useCallback(()=>setEditing(undefined),[])
 useEffect(()=>{if(requestCreate){setEditing(null);onConsumeCreate?.()}},[requestCreate,onConsumeCreate])
 const people:Person[]=members.map(m=>({id:m.user_id,name:m.display_name,initials:m.display_name.slice(0,2).toUpperCase(),tone:'#27664d'}))
 const projects=records.filter(r=>r.kind==='project'&&!r.archived_at).map(r=>({id:r.id,name:r.title}))
 const objectives=records.filter(r=>r.kind==='objective'&&!r.archived_at).map(r=>({id:r.id,title:r.title,progress:r.progress}))
 const run=async(job:()=>Promise<void>)=>{setBusy(true);setError('');try{await job();await refresh()}catch(e){setError(failure(e))}finally{setBusy(false)}}
 const visible=useMemo(()=>{
  const today=new Date().toLocaleDateString('en-CA'),week=new Date(Date.now()+7*86400000).toLocaleDateString('en-CA')
  const rank={urgent:0,high:1,normal:2,low:3}
  return records.filter(r=>r.kind===kind&&(tab==='archived'?!!r.archived_at:!r.archived_at)&&(tab==='done'?r.status==='done':tab==='archived'||r.status!=='done')&&(tab!=='mine'||r.assignee_id===userId))
   .filter(r=>(r.title+' '+r.description).toLowerCase().includes(query.toLowerCase())&&(project==='all'||r.project_id===project)&&(filters.assignee==='all'||(filters.assignee==='unassigned'?!r.assignee_id:r.assignee_id===filters.assignee))&&(filters.priority==='all'||r.priority===filters.priority)&&(filters.status==='all'||r.status===filters.status))
   .filter(r=>filters.due==='all'||(filters.due==='none'?!r.due_date:filters.due==='today'?r.due_date===today:filters.due==='overdue'?!!r.due_date&&r.due_date<today:!!r.due_date&&r.due_date>=today&&r.due_date<=week))
   .sort((a,b)=>sort==="Prioridade"?rank[a.priority??'normal']-rank[b.priority??'normal']:sort==="Prazo"?(a.due_date??'9999').localeCompare(b.due_date??'9999'):b.updated_at.localeCompare(a.updated_at))
 },[records,kind,tab,userId,query,project,filters,sort])
 const changeStatus=async(r:RecordItem,status:TaskStatus)=>{
  setOptimistic(v=>({...v,[r.id]:status}));await run(async()=>{await repo.saveRecord(workspaceId,r,{status})});setOptimistic(v=>{const next={...v};delete next[r.id];return next})
 }
 const asTask=(r:RecordItem):Task=>({id:r.id,title:r.title,description:r.description,status:optimistic[r.id]??r.status,priority:r.priority??'normal',assigneeId:r.assignee_id??undefined,projectId:r.project_id??undefined,objectiveId:r.objective_id??undefined,dueDate:r.due_date??undefined,createdAt:r.created_at,completedAt:r.completed_at??undefined,checklist:domain.checklist.filter(i=>i.record_id===r.id)})
 return <section className="tasks-page domain-tasks"><div className="tasks-header"><div><h1>{kind==='task'?"Tarefas":"Ocorrências"}</h1><p>{kind==='task'?"Planeje, distribua e conclua o que importa.":"Problemas, sugestões e dúvidas."}</p></div><button className="new-task-button" onClick={()=>setEditing(null)} disabled={!workspaceId}><Plus/>{kind==='task'?"Nova tarefa":"Nova ocorrência"}</button></div>
  {error&&<p role="alert" className="collab-error">{error}</p>}{domain.error&&<p role="alert" className="collab-error">{domain.error}<button onClick={()=>void domain.refresh()}>Tentar novamente</button></p>}
  <div className="tasks-tabs" role="tablist">{[['mine',"Minhas tarefas"],['team',"Equipe"],['inbox',"Caixa de entrada"],['done',"Concluídas"],['archived',"Arquivadas"]].map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</div>
  {tab==='inbox'?<section className="domain-inbox"><h2>Caixa de entrada privada</h2><p>Só você pode ler estes itens. Sugestões dependem da sua aceitação.</p><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget),form=e.currentTarget;void run(async()=>{await checked(db().from('eg_inbox').insert({workspace_id:workspaceId,title:String(f.get('title')).trim()}));form.reset()})}}><label>Registre uma ideia<input name="title" required maxLength={200}/></label><button disabled={busy}>Adicionar à caixa de entrada</button></form>
   {domain.inbox.map(i=><article className="collab-message" key={i.id}><strong>{i.title}</strong><div className="collab-actions"><button disabled={busy} onClick={()=>void run(async()=>{await checked(db().rpc('eg_convert_inbox',{p_id:i.id}))})}>Transformar em tarefa</button><button disabled={busy} onClick={()=>{if(window.confirm("Excluir este item privado?"))void run(async()=>{await checked(db().from('eg_inbox').delete().eq('id',i.id).select().single())})}}>Excluir</button></div></article>)}
   <h3>Sugestões de tarefas</h3>{domain.suggestions.filter(s=>s.recipient_id===userId).map(s=><article className="collab-message" key={s.id}><strong>{s.title}</strong><p>{s.context}</p><small>{codeLabel(s.status)} · {members.find(m=>m.user_id===s.sender_id)?.display_name}</small>{s.status==='pending'&&<div className="collab-actions"><button disabled={busy} onClick={()=>{const title=window.prompt("Aceite ou edite o título da tarefa",s.title);if(title?.trim())void run(async()=>{await checked(db().rpc('eg_resolve_suggestion',{p_id:s.id,p_accept:true,p_title:title.trim()}))})}}>Aceitar / editar</button><button disabled={busy} onClick={()=>void run(async()=>{await checked(db().rpc('eg_resolve_suggestion',{p_id:s.id,p_accept:false,p_title:s.title}))})}>Recusar</button></div>}</article>)}
   {!domain.inbox.length&&!domain.suggestions.some(s=>s.recipient_id===userId)&&<p>Nenhum item ainda.</p>}
  </section>:<><TaskToolbar discloseFilters query={query} setQuery={setQuery} project={project} setProject={setProject} sort={sort} setSort={setSort} projects={projects} people={people} filters={filters} setFilters={setFilters}/>
   <div className="collab-actions domain-view"><button aria-pressed={view==='list'} onClick={()=>setView('list')}>Lista</button><button aria-pressed={view==='board'} onClick={()=>setView('board')}>Quadro</button><small>{visible.length} itens</small></div>
   {view==='list'?<div>{visible.map(r=><TaskRow key={r.id} task={asTask(r)} person={people.find(p=>p.id===r.assignee_id)} projectName={projects.find(p=>p.id===r.project_id)?.name} objectiveTitle={objectives.find(o=>o.id===r.objective_id)?.title} selected={editing===r.id} onSelect={()=>setEditing(r.id)} onToggle={()=>{if(!busy)void changeStatus(r,r.status==='done'?'todo':'done')}}/>)}</div>:<div className="domain-board">{(['backlog','todo','in-progress','done'] as const).map(status=><section key={status} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const r=records.find(r=>r.id===e.dataTransfer.getData('text/plain'));if(r&&!busy)void changeStatus(r,status)}}><h3>{codeLabel(status)}</h3>{visible.filter(r=>(optimistic[r.id]??r.status)===status).map(r=><article key={r.id} draggable={!busy} onDragStart={e=>e.dataTransfer.setData('text/plain',r.id)}><button onClick={()=>setEditing(r.id)}>{r.title}</button><label className="sr-only" htmlFor={`status-${r.id}`}>Mover {r.title}</label><AppSelect id={`status-${r.id}`} disabled={busy} value={optimistic[r.id]??r.status} onChange={e=>void changeStatus(r,e.target.value as TaskStatus)}>{['backlog','todo','in-progress','done'].map(s=><option key={s} value={s}>{codeLabel(s)}</option>)}</AppSelect></article>)}</section>)}</div>}
   {!visible.length&&<div className="empty-tasks"><strong>Nenhuma tarefa aqui.</strong><span>Experimente outro filtro ou crie uma tarefa.</span></div>}
  </>}
  {editing!==undefined&&<TaskEditor key={editing??'new'} record={records.find(r=>r.id===editing)??null} kind={kind} workspaceId={workspaceId} userId={userId} members={members} records={records} checklist={domain.checklist} comments={domain.comments} handoffs={domain.handoffs} onClose={close} onFocus={onStartFocus} refresh={refresh}/>}

 </section>
}
