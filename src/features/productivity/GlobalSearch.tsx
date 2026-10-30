import {codeLabel} from '../../i18n/pt-BR'
import { useEffect, useRef, useState } from 'react'
import type { Member,RecordItem } from '../../collaboration/models'
import type { Goal } from './ObjectivesModule'
import { checked,db,failure } from '../../collaboration/client'
import { Dialog } from './Dialog'
export function GlobalSearch({records,members,goals,onRecord,onChannel,onClose,onAction}:{records:RecordItem[];members:Member[];goals:Goal[];onRecord:(id:string)=>void;onChannel:(id:string)=>void;onClose:()=>void;onAction:(action:string)=>void}){
 const [query,setQuery]=useState(''),[messages,setMessages]=useState<{id:string;channel_id:string;body:string}[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const request=useRef(0)
 useEffect(()=>{const id=++request.current;if(query.trim().length<2){setMessages([]);return}const timer=setTimeout(async()=>{setBusy(true);try{const rows=await checked(db().from('eg_messages').select('id,channel_id,body').eq('deleted',false).ilike('body',`%${query.replaceAll('%','').replaceAll('_','')}%`).order('created_at',{ascending:false}).limit(20));if(id===request.current){setMessages(rows);setError('')}}catch(e){if(id===request.current)setError(failure(e))}finally{if(id===request.current)setBusy(false)}},300);return()=>clearTimeout(timer)},[query])
 const matches=(text:string)=>text.toLowerCase().includes(query.toLowerCase())
 return <Dialog title="Buscar na Evergreen" onClose={onClose}><label>Buscar<input autoFocus value={query} maxLength={100} onChange={e=>setQuery(e.target.value)} placeholder="Tarefas, objetivos, pessoas, mensagens…"/></label>{error&&<p role="alert">{error}</p>}{busy&&<p role="status">Buscando nas mensagens autorizadas…</p>}
  <div className="domain-search-results">{[['create',"Criar tarefa"],['focus',"Iniciar foco"],['objective',"Criar objetivo"],['issue',"Criar ocorrência"],['inbox',"Abrir caixa de entrada"],['tasks',"Ir para tarefas"],['work',"Ir para histórico"],['chat',"Ir para mensagens"],['settings',"Abrir configurações"],['focus-room','Abrir sala de foco'],['help','Como usar a Evergreen']].filter(([,label])=>matches(label)).map(([id,label])=><button key={id} onClick={()=>{onAction(id);onClose()}}>{label}</button>)}
  {records.filter(r=>!r.archived_at&&matches(r.title+' '+r.description)).slice(0,30).map(r=><button key={r.id} onClick={()=>{onRecord(r.id);onClose()}}><small>{codeLabel(r.kind)}</small> {r.title}</button>)}
  {goals.filter(g=>matches(g.title)).map(g=><button key={g.id} onClick={()=>{onAction('objectives');onClose()}}>Meta · {g.title}</button>)}
  {members.filter(m=>matches(m.display_name)).map(m=><button key={m.user_id} onClick={()=>{onAction('members');onClose()}}>Pessoa · {m.display_name}</button>)}
  {messages.map(m=><button key={m.id} onClick={()=>{onChannel(m.channel_id);onClose()}}>Message · {m.body.slice(0,160)}</button>)}
  </div></Dialog>
}
