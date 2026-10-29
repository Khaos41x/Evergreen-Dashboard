import { useCallback, useEffect, useRef, useState } from 'react'
import { checked, db, failure } from './client'
import type { Channel, Message, Member } from './models'
import { RichText } from '../features/productivity/RichText'
import { MemberAvatar } from '../features/productivity/Avatars'
import { Dialog } from '../features/productivity/Dialog'
import { Attachments } from '../features/productivity/Attachments'

export function Chat({ channel, userId, joined, admin, onMembership, parentId=null, onOpenRecord,members=[],extended=true }: { channel: Channel; userId: string; joined: boolean; admin: boolean; onMembership: (join: boolean) => void;parentId?:string|null;onOpenRecord?:(id:string)=>void;members?:Member[];extended?:boolean }) {
  const [thread,setThread]=useState<string|null>(null),[showFiles,setShowFiles]=useState(false),[search,setSearch]=useState(''),[searchInput,setSearchInput]=useState('')
  const [reactions,setReactions]=useState<{message_id:string;user_id:string;emoji:string}[]>([])
  const closeThread=useCallback(()=>setThread(null),[])
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [connection, setConnection] = useState('Conectando…')
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasOlder, setHasOlder] = useState(false)
  const [editing, setEditing] = useState<Message | null>(null)
  const [remove, setRemove] = useState<string | null>(null)
  const [retryId, setRetryId] = useState<string | null>(null)
  const live = useRef(true)
  const scopeKey=JSON.stringify([channel.id,parentId,search,extended])
  const scope=useRef(scopeKey);scope.current=scopeKey
  const fetchSequence=useRef(0)
  const end = useRef<HTMLDivElement>(null)
  const merge = useCallback((rows: Message[]) => setMessages(previous => {
    const items = new Map(previous.map(m => [m.id, m])); rows.forEach(m => items.set(m.id, m))
    return [...items.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
  }), [])
  const fetchLatest = useCallback(async () => {
    const key=scopeKey,sequence=++fetchSequence.current
    const current=()=>live.current&&scope.current===key&&fetchSequence.current===sequence
    try {
      let request=db().from('eg_messages').select('*').eq('channel_id',channel.id)
      if(extended)request=parentId?request.eq('parent_id',parentId):request.is('parent_id',null)
      if(search)request=request.ilike('body',`%${search.replaceAll('%','').replaceAll('_','')}%`)
      const rows = await checked(request.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50))
      if (!current()) return
      merge(rows); setHasOlder(rows.length === 50); setError('')
      if(extended&&rows.length){const result=await checked(db().from('eg_reactions').select('*').in('message_id',rows.map(m=>m.id)));if(current())setReactions(result)}
    } catch (e) { if (current()) { setMessages([]); setError(failure(e)) } }
    finally { if (current()) setLoading(false) }
  }, [channel.id, merge, parentId, search,extended,scopeKey])
  useEffect(() => {
    live.current = true
    void fetchLatest()
    const subscription = db().channel(`messages-${channel.id}-${parentId??'root'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eg_messages', filter: `channel_id=eq.${channel.id}` }, event => { if(search){void fetchLatest();return}if (event.new && 'id' in event.new && ((event.new as Message).parent_id??null)===parentId) merge([event.new as Message]) })
    if(extended)subscription.on('postgres_changes',{event:'*',schema:'public',table:'eg_reactions'},()=>void fetchLatest())
    subscription.subscribe(status => { if (!live.current) return; setConnection(status === 'SUBSCRIBED' ? 'Tempo real conectado' : 'Reconectando; atualizações periódicas ativas'); if (status === 'SUBSCRIBED') void fetchLatest() })
    const timer = window.setInterval(() => void fetchLatest(), 12000)
    const online = () => void fetchLatest()
    window.addEventListener('online', online)
    return () => { live.current = false; clearInterval(timer); window.removeEventListener('online', online); void db().removeChannel(subscription) }
  }, [channel.id, fetchLatest, merge])
  useEffect(()=>{setMessages([]);setLoading(true)},[parentId,search])
  useEffect(()=>{
    if(!extended||!end.current||parentId||search)return
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&document.visibilityState==='visible'&&document.hasFocus())void db().rpc('eg_read_channel',{p_channel:channel.id})})
    observer.observe(end.current)
    const mark=()=>{const rect=end.current?.getBoundingClientRect();if(rect&&rect.top<innerHeight&&rect.bottom>0&&document.visibilityState==='visible'&&document.hasFocus())void db().rpc('eg_read_channel',{p_channel:channel.id})}
    window.addEventListener('focus',mark);document.addEventListener('visibilitychange',mark)
    return()=>{observer.disconnect();window.removeEventListener('focus',mark);document.removeEventListener('visibilitychange',mark)}
  },[channel.id,messages.at(-1)?.id,parentId,search,extended])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [messages.at(-1)?.id])
  async function older() {
    const first = messages[0]; if (!first) return
    const key=scopeKey
    setLoading(true)
    try {
      let request=db().from('eg_messages').select('*').eq('channel_id',channel.id)
      if(extended)request=parentId?request.eq('parent_id',parentId):request.is('parent_id',null)
      if(search)request=request.ilike('body',`%${search.replaceAll('%','').replaceAll('_','')}%`)
      const rows = await checked(request
        .or(`created_at.lt.${first.created_at},and(created_at.eq.${first.created_at},id.lt.${first.id})`)
        .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50))
      if(live.current&&scope.current===key){merge(rows); setHasOlder(rows.length === 50)}
    } catch (e) { if(live.current&&scope.current===key)setError(failure(e)) } finally { if(live.current&&scope.current===key)setLoading(false) }
  }
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (!body.trim() || pending) return
    setPending(true); setError('')
    const id = retryId ?? crypto.randomUUID()
    try {
      if (editing) {
        const row = await checked(db().from('eg_messages').update({ body: body.trim() }).eq('id', editing.id).select().single()); merge([row])
      } else {
        // Stable UUID makes a retry after a lost response idempotent.
        const result = await db().from('eg_messages').insert({ id, channel_id: channel.id, body: body.trim(),...(extended?{parent_id:parentId}:{}) }).select().single()
        if (result.error?.code === '23505') {
          const existing = await checked(db().from('eg_messages').select('*').eq('id', id).single()); merge([existing])
        } else { if (result.error) throw result.error; merge([result.data]) }
      }
      setBody(''); setEditing(null); setRetryId(null)
    } catch (e) { setRetryId(id); setError(`Não foi possível confirmar o envio: ${failure(e)}. O texto foi preservado.`) }
    finally { setPending(false) }
  }
  async function erase(id: string) {
    setPending(true)
    try { const row = await checked(db().from('eg_messages').update({ deleted: true }).eq('id', id).select().single()); merge([row]); setRemove(null) }
    catch (e) { setError(failure(e)) } finally { setPending(false) }
  }
  return <section className="collab-chat" aria-label={`Canal ${channel.name}`}>
    <header><div><h1>{parentId?'Thread':channel.dm_key?'Direct message':channel.is_private ? 'Canal privado' : '#'} {!parentId&&channel.name}</h1><small role="status">{connection}</small>{channel.description&&<p>{channel.description}</p>}</div>{!parentId&&!channel.dm_key&&<button onClick={() => onMembership(!joined)}>{joined ? 'Sair do canal' : 'Entrar no canal'}</button>}</header>
    {extended&&!parentId&&<form className="domain-chat-search" onSubmit={e=>{e.preventDefault();setSearch(searchInput)}}><label>Search messages<input value={searchInput} onChange={e=>setSearchInput(e.target.value)} maxLength={100}/></label><button>Search</button><button type="button" onClick={()=>{setSearch('');setSearchInput('')}}>Clear</button><button type="button" onClick={()=>setShowFiles(v=>!v)}>Files</button>{admin&&!channel.dm_key&&<button type="button" onClick={async()=>{const name=window.prompt('Channel name',channel.name);if(!name?.trim())return;const description=window.prompt('Description',channel.description??'');if(description===null)return;try{await checked(db().rpc('eg_channel_edit',{p_channel:channel.id,p_name:name.trim(),p_description:description,p_archived:channel.archived}));setError('Canal atualizado. Reabra para ver as informações atuais.')}catch(e){setError(failure(e))}}}>Edit channel</button>}</form>}
    {showFiles&&<div className="collab-content"><Attachments workspaceId={channel.workspace_id} resourceId={channel.id} userId={userId} kind="channel"/></div>}
    {error && <div role="alert" className="collab-error">{error}<button onClick={() => void fetchLatest()}>Tentar atualizar</button></div>}
    <div className="collab-history" role="log" aria-label="Mensagens">
      {hasOlder && <button disabled={loading} onClick={() => void older()}>Carregar mensagens anteriores</button>}
      {loading && <p role="status">Carregando histórico…</p>}
      {!loading && messages.length === 0 && <div className="collab-empty"><h2>A conversa começa aqui</h2><p>Compartilhe uma ideia com o workspace.</p></div>}
      {messages.map(m => <article key={m.id} className="collab-message"><header><MemberAvatar userId={m.author_id} name={m.author_name}/><strong>{m.author_name}</strong><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString()}</time>{m.edited_at && !m.deleted && <small>editada</small>}</header><p>{m.deleted ? 'Mensagem excluída' : <RichText text={m.body} members={members} onRecord={onOpenRecord}/>}</p>
        {extended&&!m.deleted&&<div className="collab-message-actions domain-message-actions">{!parentId&&<button onClick={()=>setThread(m.id)}>Reply in thread</button>}{['👍','❤️','🎉','👀','✅'].map(emoji=>{const mine=reactions.some(r=>r.message_id===m.id&&r.user_id===userId&&r.emoji===emoji),count=reactions.filter(r=>r.message_id===m.id&&r.emoji===emoji).length;return <button key={emoji} aria-label={`React ${emoji}`} aria-pressed={mine} onClick={async()=>{try{if(mine)await checked(db().from('eg_reactions').delete().eq('message_id',m.id).eq('user_id',userId).eq('emoji',emoji));else await checked(db().from('eg_reactions').insert({message_id:m.id,emoji}));await fetchLatest()}catch(e){setError(failure(e))}}}>{emoji}{count||''}</button>})}{m.linked_record_id?<button onClick={()=>onOpenRecord?.(m.linked_record_id!)}>Open linked task / issue</button>:<><button onClick={async()=>{if((channel.is_private||channel.dm_key)&&!window.confirm('This copies the message into a task or issue visible to the workspace. Continue?'))return;try{const id=await checked(db().rpc('eg_message_context',{p_message:m.id,p_kind:'task'}));onOpenRecord?.(id)}catch(e){setError(failure(e))}}}>Create task</button><button onClick={async()=>{if((channel.is_private||channel.dm_key)&&!window.confirm('This copies the message into a task or issue visible to the workspace. Continue?'))return;try{const id=await checked(db().rpc('eg_message_context',{p_message:m.id,p_kind:'issue'}));onOpenRecord?.(id)}catch(e){setError(failure(e))}}}>Create issue</button></>}{admin&&<button onClick={async()=>{try{await checked(db().rpc('eg_pin_message',{p_message:m.id,p_pinned:!m.pinned}));await fetchLatest()}catch(e){setError(failure(e))}}}>{m.pinned?'Unpin':'Pin'}</button>}</div>}
        {!m.deleted && m.author_id === userId && joined && <div className="collab-message-actions"><button disabled={pending} onClick={() => { setEditing(m); setBody(m.body); setRetryId(null) }}>Editar</button><button disabled={pending} onClick={() => setRemove(m.id)}>Excluir</button></div>}
        {remove === m.id && <div role="group" aria-label="Confirmar exclusão"><span>Excluir esta mensagem?</span><button disabled={pending} onClick={() => void erase(m.id)}>Confirmar exclusão</button><button onClick={() => setRemove(null)}>Cancelar</button></div>}
      </article>)}<div ref={end} style={{height:1}} />
    </div>
    <form className="collab-composer" onSubmit={send}>
      {editing && <div>Editando mensagem <button type="button" onClick={() => { setEditing(null); setBody(''); setRetryId(null) }}>Cancelar edição</button></div>}
      <label className="sr-only" htmlFor={`message-body-${parentId??channel.id}`}>Mensagem</label><textarea id={`message-body-${parentId??channel.id}`} value={body} maxLength={4000} onChange={e => { setBody(e.target.value); setRetryId(null) }} placeholder={joined ? `Mensagem em #${channel.name}` : 'Entre no canal para enviar mensagens'} disabled={!joined || pending||channel.archived} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void send(e) } }} />
      <div><small>{body.length}/4000 · Ctrl+Enter to send</small><label className="sr-only" htmlFor={`mention-${parentId??channel.id}`}>Mention member</label><select id={`mention-${parentId??channel.id}`} value="" onChange={e=>{if(e.target.value)setBody(v=>`${v} @${e.target.value} `)}}><option value="">@ Mention</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select><button className="primary" disabled={!joined || !body.trim() || pending||channel.archived}>{pending ? 'Confirmando…' : editing ? 'Salvar edição' : retryId ? 'Tentar enviar novamente' : 'Enviar'}</button></div>
    </form>{admin && channel.is_private && <small className="collab-footnote">Gerencie o acesso privado em Membros.</small>}
    {thread&&<Dialog title="Thread" onClose={closeThread}><p>{messages.find(m=>m.id===thread)?.body}</p><Chat channel={channel} userId={userId} joined={joined} admin={admin} onMembership={onMembership} parentId={thread} onOpenRecord={onOpenRecord} members={members}/></Dialog>}
  </section>
}
