import {codeLabel} from '../../i18n/pt-BR'
import {useEffect,useRef,useState} from 'react'
import type {Channel,Member,RecordItem} from '../../collaboration/models'
import type {Goal} from './ObjectivesModule'
import {checked,db,failure} from '../../collaboration/client'
import {Dialog} from './Dialog'

type SearchMessage={id:string;channel_id:string;body:string;eg_channels?:{workspace_id:string}|{workspace_id:string}[]|null}
type Props={workspaceId:string;workspaceName:string;companies:{id:string;name:string}[];channels:Channel[];records:RecordItem[];members:Member[];goals:Goal[];onRecord:(id:string)=>void;onChannel:(id:string,workspace?:string)=>void;onClose:()=>void;onAction:(action:string)=>void}
export function GlobalSearch({workspaceId,workspaceName,companies,channels,records,members,goals,onRecord,onChannel,onClose,onAction}:Props){
 const [query,setQuery]=useState(''),[messages,setMessages]=useState<SearchMessage[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const request=useRef(0)
 useEffect(()=>{
  const id=++request.current
  setMessages([]);setError('');setBusy(false)
  if(query.trim().length<2)return
  const timer=setTimeout(async()=>{
   setBusy(true)
   try{
    const rows=await checked(db().from('eg_messages').select('id,channel_id,body,eg_channels(workspace_id)').eq('deleted',false).ilike('body',`%${query.replaceAll('%','').replaceAll('_','')}%`).order('created_at',{ascending:false}).limit(20))
    if(id===request.current)setMessages(rows)
   }catch(error){if(id===request.current)setError(failure(error))}
   finally{if(id===request.current)setBusy(false)}
  },300)
  return()=>clearTimeout(timer)
 },[query])
 const matches=(text:string)=>text.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))
 const companyName=(id?:string)=>companies.find(row=>row.id===id)?.name||(id===workspaceId?workspaceName:'Empresa não informada')
 const source=(id?:string)=><small className="search-company">{companyName(id)}</small>
 return <Dialog title="Buscar na Evergreen" onClose={onClose}>
  <label>Buscar<input autoFocus value={query} maxLength={100} onChange={event=>setQuery(event.target.value)} placeholder="Tarefas, canais, objetivos, pessoas, mensagens…"/></label>
  {error&&<p role="alert">Não foi possível buscar mensagens: {error}</p>}{busy&&<p role="status">Buscando nas mensagens autorizadas…</p>}
  <div className="domain-search-results">
   {[['create','Criar tarefa'],['focus','Iniciar foco'],['objective','Criar objetivo'],['issue','Criar ocorrência'],['inbox','Abrir caixa de entrada'],['tasks','Ir para tarefas'],['work','Ir para histórico'],['chat','Ir para mensagens'],['settings','Abrir configurações'],['focus-room','Abrir sala de foco'],['help','Como usar a Evergreen']].filter(([,label])=>matches(label)).map(([id,label])=><button key={id} onClick={()=>{onAction(id);onClose()}}>{source(workspaceId)}{label}</button>)}
   {channels.filter(row=>!row.archived&&matches(row.name)).map(row=><button key={row.id} onClick={()=>{onChannel(row.id,row.workspace_id);onClose()}}>{source(row.workspace_id)}Canal · {row.name}</button>)}
   {records.filter(row=>!row.archived_at&&matches(row.title+' '+row.description)).slice(0,30).map(row=><button key={row.id} onClick={()=>{onRecord(row.id);onClose()}}>{source(row.workspace_id)}{codeLabel(row.kind)} · {row.title}</button>)}
   {goals.filter(row=>matches(row.title)).map(row=><button key={row.id} onClick={()=>{onAction('objectives');onClose()}}>{source(workspaceId)}Meta · {row.title}</button>)}
   {members.filter(row=>matches(row.display_name)).map(row=><button key={row.user_id} onClick={()=>{onAction('members');onClose()}}>{source(row.workspace_id)}Pessoa · {row.display_name}</button>)}
   {messages.map(row=>{const joined=Array.isArray(row.eg_channels)?row.eg_channels[0]:row.eg_channels;const company=joined?.workspace_id||channels.find(channel=>channel.id===row.channel_id)?.workspace_id;return <button key={row.id} onClick={()=>{onChannel(row.channel_id,company);onClose()}}>{source(company)}Mensagem · {row.body.slice(0,160)}</button>})}
  </div>
 </Dialog>
}
