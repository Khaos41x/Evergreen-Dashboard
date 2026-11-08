import { useEffect, useId, useState, type FormEvent } from 'react'
import { ArrowUpRight, Hash, LockKeyhole, MessageCircle, Plus, Search, Users } from 'lucide-react'
import { checked, db, failure } from './client'
import type { Channel, Member } from './models'
import { AppSelect } from '../features/appearance/AppSelect'
import { Dialog } from '../features/productivity/Dialog'
import { MemberAvatar } from '../features/productivity/Avatars'

type Props = {
 workspaceId: string; name: string; userId: string; channels: Channel[]; members: Member[]
 unread: Record<string, number>; admin: boolean; refresh: () => Promise<void>
 onOpen: (id: string) => void; onPeople: () => void; requestCreate?:number; onConsumeCreate?:()=>void
}
export function ConversationDirectory({workspaceId,name,userId,channels,members,unread,admin,refresh,onOpen,onPeople,requestCreate=0,onConsumeCreate}:Props) {
 const panelId=useId()
 const [tab,setTab]=useState<'channels'|'direct'>('channels')
 const [query,setQuery]=useState(''),[creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [newConversation,setNewConversation]=useState(false)
 const peers=members.filter(member=>member.user_id!==userId)
 useEffect(()=>{if(requestCreate){setNewConversation(true);setError('');onConsumeCreate?.()}},[requestCreate,onConsumeCreate])
 async function direct(event:FormEvent<HTMLFormElement>){
  event.preventDefault()
  const peer=String(new FormData(event.currentTarget).get('person')||'')
  if(!peers.some(member=>member.user_id===peer)||busy)return
  setBusy(true);setError('')
  try{const id=await checked(db().rpc('eg_direct_channel',{p_workspace:workspaceId,p_user:peer})) as string;await refresh();setNewConversation(false);onOpen(id)}catch(e){setError(failure(e))}finally{setBusy(false)}
 }
 const directName=(channel:Channel)=>members.filter(member=>member.user_id!==userId&&channel.dm_key?.split(':').includes(member.user_id)).map(member=>member.display_name).join(', ')||'Conversa privada'
 const list=channels.filter(channel=>!channel.archived&&(tab==='channels'?!channel.dm_key:!!channel.dm_key))
 const visible=list.filter(channel=>(tab==='channels'?channel.name+' '+(channel.description||''):directName(channel)).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
 async function create(event:FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const fields=new FormData(event.currentTarget),channelName=String(fields.get('name')||'').trim()
  if(!channelName){setError('Informe o nome do canal.');return}
  if(busy)return
  setBusy(true);setError('')
  try {
   const id=await checked(db().rpc('eg_create_channel',{p_workspace:workspaceId,p_name:channelName,p_private:fields.get('private')==='on'})) as string
   await refresh();setCreating(false);onOpen(id)
  } catch(e){setError(failure(e))}finally{setBusy(false)}
 }
 return <section className="collab-content conversation-directory">
  <header className="directory-heading"><div><h1>Conversas</h1><p>{name} · Canais e mensagens da sua equipe.</p></div>
   <div><button className="primary" onClick={()=>{setError('');setNewConversation(true)}}><MessageCircle size={17}/>Nova conversa</button>{admin&&<button onClick={()=>{setError('');setCreating(true)}}><Plus size={17}/>Novo canal</button>}<button aria-label="Ver pessoas da empresa" title="Pessoas" onClick={onPeople}><Users size={17}/></button></div>
  </header>
  <div className="directory-controls"><div role="tablist" aria-label="Tipos de conversa" onKeyDown={event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
   event.preventDefault()
   const next=event.key==='Home'?'channels':event.key==='End'?'direct':tab==='channels'?'direct':'channels'
   setTab(next);event.currentTarget.querySelector<HTMLButtonElement>('[data-conversation-tab="'+next+'"]')?.focus()
  }}>
   <button role="tab" id={panelId+'-channels'} aria-controls={panelId} data-conversation-tab="channels" tabIndex={tab==='channels'?0:-1} aria-selected={tab==='channels'} onClick={()=>setTab('channels')}><Hash size={17}/>Canais</button>
   <button role="tab" id={panelId+'-direct'} aria-controls={panelId} data-conversation-tab="direct" tabIndex={tab==='direct'?0:-1} aria-selected={tab==='direct'} onClick={()=>setTab('direct')}><MessageCircle size={17}/>Mensagens diretas</button>
  </div><label className="directory-search"><Search size={17} aria-hidden="true"/><span className="sr-only">Buscar conversas</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Encontrar uma conversa"/></label></div>
  <section role="tabpanel" id={panelId} aria-labelledby={panelId+'-'+tab}>
   <div className="directory-list-heading"><h2>{tab==='channels'?'Canais':'Mensagens diretas'}</h2><span>{visible.length} {visible.length===1?'conversa':'conversas'}</span></div>
   {visible.length?<ul className="conversation-directory-list">{visible.map(channel=><li key={channel.id}><button onClick={()=>onOpen(channel.id)}>
    {tab==='channels'?<span className="directory-channel-icon">{channel.is_private?<LockKeyhole size={21}/>:<Hash size={23}/>}</span>:<MemberAvatar userId={members.find(member=>member.user_id!==userId&&channel.dm_key?.split(':').includes(member.user_id))?.user_id||''} name={directName(channel)} size={40}/>}
    <span className="directory-channel-copy"><strong>{tab==='channels'?'# '+channel.name:directName(channel)}</strong><small>{tab==='channels'?(channel.description||(channel.is_private?'Canal privado · acesso autorizado':'Canal da empresa')):'Mensagem privada'}</small></span>
    {unread[channel.id]>0&&<span className="directory-unread">{unread[channel.id]} não lidas</span>}<ArrowUpRight size={18} aria-hidden="true"/>
   </button></li>)}</ul>:<div className="directory-empty"><h3>{query?'Nenhuma conversa encontrada':tab==='channels'?'Ainda não há canais disponíveis':'Suas conversas diretas ficam aqui'}</h3><p>{query?'Tente outro nome ou limpe a busca.':tab==='channels'?'Os canais disponíveis para sua conta aparecerão nesta lista.':'Escolha alguém da empresa para começar uma conversa privada.'}</p>{query?<button onClick={()=>setQuery('')}>Limpar busca</button>:tab==='direct'?<button onClick={onPeople}>Encontrar uma pessoa</button>:admin&&<button onClick={()=>setCreating(true)}>Criar primeiro canal</button>}</div>}
  </section>
  {newConversation&&<Dialog title="Nova conversa" onClose={()=>{if(!busy)setNewConversation(false)}}>
   <p>Comece uma conversa em <strong>{name}</strong>.</p>
   {error&&<p role="alert" className="collab-error">{error}</p>}
   {peers.length?<form onSubmit={direct}><label>Pessoa da empresa<AppSelect name="person" required defaultValue=""><option value="" disabled>Selecionar pessoa</option>{peers.map(member=><option key={member.user_id} value={member.user_id}>{member.display_name}</option>)}</AppSelect></label><button className="primary" disabled={busy}>{busy?'Abrindo…':'Iniciar mensagem direta'}</button></form>:<p>Ainda não há outra pessoa disponível nesta empresa para uma mensagem direta.</p>}
   <div className="collab-actions">{admin&&<button disabled={busy} onClick={()=>{setNewConversation(false);setCreating(true);setError('')}}><Plus size={17}/>Criar canal</button>}<button disabled={busy} onClick={()=>{setNewConversation(false);onPeople()}}>Ver equipe e convites</button></div>
  </Dialog>}
  {creating&&<Dialog title="Novo canal" onClose={()=>{if(!busy)setCreating(false)}}>
   <p>O canal será criado em <strong>{name}</strong>.</p>{error&&<p role="alert" className="collab-error">{error}</p>}
   <form onSubmit={create}><label>Nome do canal<input name="name" required maxLength={80} autoComplete="off"/></label>
    <label className="collab-check"><input name="private" type="checkbox"/>Canal privado</label><p>Um canal privado só fica disponível para as pessoas autorizadas.</p>
    <div className="collab-actions"><button className="primary" disabled={busy}>{busy?'Criando…':'Criar canal'}</button><button type="button" disabled={busy} onClick={()=>setCreating(false)}>Cancelar</button></div>
   </form>
  </Dialog>}
 </section>
}
