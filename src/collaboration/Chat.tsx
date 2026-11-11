import { AppSelect } from '../features/appearance/AppSelect'
import { useCallback, useEffect, useRef, useState } from 'react'
import {ArrowLeft,Plus,Code,FileText,MessageSquare,Search,Send,Smile,Users} from 'lucide-react'
import './conversation.css'
import { checked, db, failure } from './client'
import type { Channel, Message, Member } from './models'
import { RichText } from '../features/productivity/RichText'
import { MemberAvatar } from '../features/productivity/Avatars'
import {decodeMentions,encodeMentions,rebaseMentions,mentionLabel,type DraftMention} from './mentions'
import { Dialog } from '../features/productivity/Dialog'
import { Attachments } from '../features/productivity/Attachments'

export function Chat({ channel, userId, joined, admin, onMembership, parentId=null, onOpenRecord,onProfile,onConversations,members=[],extended=true }: { channel: Channel; userId: string; joined: boolean; admin: boolean; onMembership: (join: boolean) => void;parentId?:string|null;onOpenRecord?:(id:string)=>void;onProfile?:(id:string)=>void;onConversations?:(create?:boolean)=>void;members?:Member[];extended?:boolean }) {
  const composer=useRef<HTMLTextAreaElement>(null)
  const [compactSearch,setCompactSearch]=useState(false)
  const [emojiMenu,setEmojiMenu]=useState(false)
  function changeDraft(next:string){setDraftMentions(items=>rebaseMentions(body,next,items));setBody(next);setRetryId(null)}
  function insertText(text:string){const area=composer.current,start=area?.selectionStart??body.length,end=area?.selectionEnd??body.length;changeDraft((body.slice(0,start)+text+body.slice(end)).slice(0,4000));area?.focus()}
  function insertMention(id:string){const member=members.find(m=>m.user_id===id);if(!member)return;const area=composer.current,start=area?.selectionStart??body.length,end=area?.selectionEnd??body.length,label=mentionLabel(member),prefix=start>0&&!/\s/.test(body[start-1])?' ':'';const inserted=prefix+label+' ',next=body.slice(0,start)+inserted+body.slice(end);if(next.length>4000){setError('Reduza o texto para adicionar a menção.');return}setDraftMentions(items=>[...rebaseMentions(body,next,items),{start:start+prefix.length,end:start+prefix.length+label.length,userId:id,label}]);setBody(next);setRetryId(null);requestAnimationFrame(()=>{area?.focus();area?.setSelectionRange(start+inserted.length,start+inserted.length)})}
  function editMessage(message:Message){const draft=decodeMentions(message.body,members);setEditing(message);setBody(draft.body);setDraftMentions(draft.mentions);setRetryId(null)}
  const [thread,setThread]=useState<string|null>(null),[showFiles,setShowFiles]=useState(false),[search,setSearch]=useState(''),[searchInput,setSearchInput]=useState('')
  const [reactions,setReactions]=useState<{message_id:string;user_id:string;emoji:string}[]>([])
  const closeThread=useCallback(()=>setThread(null),[])
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [draftMentions,setDraftMentions]=useState<DraftMention[]>([])
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
  async function send() {
    if (!body.trim() || pending) return
    const canonical=encodeMentions(body,draftMentions,members).trim();if(canonical.length>4000){setError('A mensagem com menções excede o limite. Reduza o texto.');return}
    setPending(true); setError('')
    const id = retryId ?? crypto.randomUUID()
    try {
      if (editing) {
        const row = await checked(db().from('eg_messages').update({ body: canonical }).eq('id', editing.id).select().single()); merge([row])
      } else {
        // Stable UUID makes a retry after a lost response idempotent.
        const result = await db().from('eg_messages').insert({ id, channel_id: channel.id, body: canonical,...(extended?{parent_id:parentId}:{}) }).select().single()
        if (result.error?.code === '23505') {
          const existing = await checked(db().from('eg_messages').select('*').eq('id', id).single()); merge([existing])
        } else { if (result.error) throw result.error; merge([result.data]) }
      }
      setBody('');setDraftMentions([]); setEditing(null); setRetryId(null)
    } catch (e) { setRetryId(id); setError(`Não foi possível confirmar o envio: ${failure(e)}. O texto foi preservado.`) }
    finally { setPending(false) }
  }
  async function erase(id: string) {
    setPending(true)
    try { const row = await checked(db().from('eg_messages').update({ deleted: true }).eq('id', id).select().single()); merge([row]); setRemove(null) }
    catch (e) { setError(failure(e)) } finally { setPending(false) }
  }
  return <section className="collab-chat" aria-label={`Canal ${channel.name}`}>
    {!parentId&&onConversations&&<nav className="conversation-navigation" aria-label="Navegação de conversas"><button onClick={()=>onConversations(false)}><ArrowLeft size={16}/>Todas as conversas</button><button onClick={()=>onConversations(true)}><Plus size={16}/>Nova conversa</button></nav>}
    <header><div className="conversation-title"><h1>{parentId?"Respostas":channel.dm_key?"Mensagem direta":channel.is_private ? 'Canal privado' : '#'} {!parentId&&channel.name}</h1><small role="status">{connection}</small>{channel.description&&<p>{channel.description}</p>}</div><div className="conversation-header-actions"><button className="conversation-search-toggle" aria-expanded={compactSearch} onClick={()=>setCompactSearch(value=>!value)}>Buscar mensagens</button><span className="conversation-member-count" title="Membros da empresa"><Users size={16}/>{members.length}</span>{!parentId&&!channel.dm_key&&<button onClick={() => onMembership(!joined)}>{joined ? 'Sair do canal' : 'Entrar no canal'}</button>}</div></header>
    {extended&&!parentId&&<form className="domain-chat-search" data-open={compactSearch} onSubmit={e=>{e.preventDefault();setSearch(searchInput)}}><label><Search size={16} aria-hidden="true"/><span className="sr-only">Buscar mensagens</span><input placeholder="Buscar nesta conversa" value={searchInput} onChange={e=>setSearchInput(e.target.value)} maxLength={100}/></label><button>Buscar</button><button type="button" onClick={()=>{setSearch('');setSearchInput('')}}>Limpar</button><button type="button" onClick={()=>setShowFiles(v=>!v)}><FileText size={16}/>Arquivos</button>{admin&&!channel.dm_key&&<button type="button" onClick={async()=>{const name=window.prompt("Nome do canal",channel.name);if(!name?.trim())return;const description=window.prompt("Descrição",channel.description??'');if(description===null)return;try{await checked(db().rpc('eg_channel_edit',{p_channel:channel.id,p_name:name.trim(),p_description:description,p_archived:channel.archived}));setError('Canal atualizado. Reabra para ver as informações atuais.')}catch(e){setError(failure(e))}}}>Editar canal</button>}</form>}
    {showFiles&&<div className="collab-content"><Attachments workspaceId={channel.workspace_id} resourceId={channel.id} userId={userId} kind="channel"/></div>}
    {error && <div role="alert" className="collab-error">{error}<button onClick={() => void fetchLatest()}>Tentar atualizar</button></div>}
    <div className="collab-history" tabIndex={0} role="log" aria-label="Mensagens">
      {hasOlder && <button disabled={loading} onClick={() => void older()}>Carregar mensagens anteriores</button>}
      {loading && <p role="status">Carregando histórico…</p>}
      {!loading && messages.length === 0 && <div className="collab-empty"><h2>A conversa começa aqui</h2><p>Compartilhe uma ideia com o espaço de trabalho.</p></div>}
      {messages.map((m,index) => <div key={m.id}>{(index===0||new Date(messages[index-1].created_at).toLocaleDateString('pt-BR')!==new Date(m.created_at).toLocaleDateString('pt-BR'))&&<div className="conversation-date"><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}</time></div>}<article className="collab-message"><header><MemberAvatar userId={m.author_id} name={m.author_name}/><button className="conversation-author" onClick={()=>onProfile?.(m.author_id)} disabled={!onProfile}>{m.author_name}</button><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time>{m.edited_at && !m.deleted && <small>editada</small>}</header><p>{m.deleted ? 'Mensagem excluída' : <RichText text={m.body} members={members} onRecord={onOpenRecord}/>}</p>
        {extended&&!m.deleted&&<details className="conversation-tools"><summary>Ações da mensagem</summary><div className="collab-message-actions domain-message-actions">{!parentId&&<button onClick={()=>setThread(m.id)}><MessageSquare size={14}/>Responder na conversa</button>}{['👍','❤️','🎉','👀','✅'].map(emoji=>{const mine=reactions.some(r=>r.message_id===m.id&&r.user_id===userId&&r.emoji===emoji),count=reactions.filter(r=>r.message_id===m.id&&r.emoji===emoji).length;return <button key={emoji} aria-label={`Reagir ${emoji}`} aria-pressed={mine} onClick={async()=>{try{if(mine)await checked(db().from('eg_reactions').delete().eq('message_id',m.id).eq('user_id',userId).eq('emoji',emoji));else await checked(db().from('eg_reactions').insert({message_id:m.id,emoji}));await fetchLatest()}catch(e){setError(failure(e))}}}>{emoji}{count||''}</button>})}{m.linked_record_id?<button onClick={()=>onOpenRecord?.(m.linked_record_id!)}>Abrir tarefa / ocorrência vinculada</button>:<><button onClick={async()=>{if((channel.is_private||channel.dm_key)&&!window.confirm("Isso copia a mensagem para uma tarefa ou ocorrência visível à equipe. Continuar?"))return;try{const id=await checked(db().rpc('eg_message_context',{p_message:m.id,p_kind:'task'}));onOpenRecord?.(id)}catch(e){setError(failure(e))}}}>Criar tarefa</button><button onClick={async()=>{if((channel.is_private||channel.dm_key)&&!window.confirm("Isso copia a mensagem para uma tarefa ou ocorrência visível à equipe. Continuar?"))return;try{const id=await checked(db().rpc('eg_message_context',{p_message:m.id,p_kind:'issue'}));onOpenRecord?.(id)}catch(e){setError(failure(e))}}}>Criar ocorrência</button></>}{admin&&<button onClick={async()=>{try{await checked(db().rpc('eg_pin_message',{p_message:m.id,p_pinned:!m.pinned}));await fetchLatest()}catch(e){setError(failure(e))}}}>{m.pinned?"Desafixar":"Fixar"}</button>}</div></details>}
        {!m.deleted && m.author_id === userId && joined && <div className="collab-message-actions"><button disabled={pending} onClick={() => { editMessage(m); setRetryId(null) }}>Editar</button><button disabled={pending} onClick={() => setRemove(m.id)}>Excluir</button></div>}
        {remove === m.id && <div role="group" aria-label="Confirmar exclusão"><span>Excluir esta mensagem?</span><button disabled={pending} onClick={() => void erase(m.id)}>Confirmar exclusão</button><button onClick={() => setRemove(null)}>Cancelar</button></div>}
      </article></div>)}<div ref={end} style={{height:1}} />
    </div>
    <form className="collab-composer" onSubmit={event=>{event.preventDefault();void send()}}>
      {editing && <div>Editando mensagem <button type="button" onClick={() => { setEditing(null); setBody('');setDraftMentions([]); setRetryId(null) }}>Cancelar edição</button></div>}
      <label className="sr-only" htmlFor={`message-body-${parentId??channel.id}`}>Mensagem</label><textarea ref={composer} id={`message-body-${parentId??channel.id}`} aria-describedby={`message-hint-${parentId??channel.id}`} enterKeyHint="send" value={body} maxLength={4000} onChange={e => changeDraft(e.target.value)} placeholder={joined ? `Mensagem em #${channel.name}` : 'Entre no canal para enviar mensagens'} disabled={!joined || pending||channel.archived} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode!==229) { e.preventDefault(); void send() } }} />
      <div className="conversation-composer-actions"><button type="button" aria-label="Inserir código" title="Inserir código" disabled={!joined||pending||channel.archived} onClick={()=>insertText('`código`')}><Code size={18}/></button><button type="button" aria-label="Inserir emoji" title="Inserir emoji" aria-expanded={emojiMenu} disabled={!joined||pending||channel.archived} onClick={()=>setEmojiMenu(v=>!v)}><Smile size={18}/></button><small>{body.length}/4000 · Enter envia · Shift+Enter quebra linha</small><span className="sr-only" id={`message-hint-${parentId??channel.id}`}>Pressione Enter para enviar. Pressione Shift mais Enter para inserir uma quebra de linha.</span><label className="sr-only" htmlFor={`mention-${parentId??channel.id}`}>Mencionar pessoa</label><AppSelect id={`mention-${parentId??channel.id}`} value="" disabled={!joined||pending||channel.archived} onChange={e=>{if(e.target.value)insertMention(e.target.value)}}><option value="">@ Mencionar</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</AppSelect><button className="primary" disabled={!joined || !body.trim() || pending||channel.archived}><Send size={16}/>{pending ? 'Confirmando…' : editing ? 'Salvar edição' : retryId ? 'Tentar enviar novamente' : 'Enviar'}</button></div>
      {emojiMenu&&<div className="conversation-emoji" role="group" aria-label="Escolher emoji">{['👍','❤️','🎉','👀','✅','🙂'].map(emoji=><button key={emoji} type="button" aria-label={`Inserir ${emoji}`} onClick={()=>{insertText(emoji);setEmojiMenu(false)}}>{emoji}</button>)}</div>}
    </form>{admin && channel.is_private && <small className="collab-footnote">Gerencie o acesso privado em Membros.</small>}
    {thread&&<Dialog title="Respostas" onClose={closeThread}><p><RichText text={messages.find(m=>m.id===thread)?.body||''} members={members}/></p><Chat channel={channel} userId={userId} joined={joined} admin={admin} onMembership={onMembership} parentId={thread} onProfile={onProfile} onOpenRecord={onOpenRecord} members={members}/></Dialog>}
  </section>
}
