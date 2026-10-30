import {useEffect,useState} from 'react'
import {Headphones,Play} from 'lucide-react'
import type {Member} from '../../collaboration/models'
import type {CloudFocus} from './models'
import {MemberAvatar,usePublicProfiles} from './Avatars'
import {codeLabel} from '../../i18n/pt-BR'

export function FocusRoom({members,sessions,online,presenceError,onStart}:{members:Member[];sessions:CloudFocus[];online:Record<string,'online'|'away'>;presenceError:string;onStart:()=>void}){
 const [now,setNow]=useState(Date.now()),profiles=usePublicProfiles()
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[])
 const active=sessions.filter(f=>f.status==='running')
 return <section className="collab-content focus-room"><header className="focus-room-header"><div><h1>Sala de foco</h1><p>Trabalhe junto, cada pessoa no seu ritmo. Sem áudio ou vídeo.</p></div><button className="primary" onClick={onStart}><Play size={16}/> Iniciar minha sessão</button></header>
 {presenceError&&<p role="alert" className="collab-error">{presenceError} Os tempos abaixo refletem as últimas sessões recebidas.</p>}
 <p className="focus-room-summary"><Headphones size={18}/>{active.length} {active.length===1?'sessão em andamento':'sessões em andamento'} · {Object.keys(online).length} {Object.keys(online).length===1?'pessoa conectada':'pessoas conectadas'}</p>
 <div className="focus-room-members">{members.map(member=>{const focus=sessions.find(f=>f.user_id===member.user_id&&f.status!=='completed'),state=online[member.user_id];const elapsed=focus?Math.max(0,(focus.paused_at?Date.parse(focus.paused_at):now)-Date.parse(focus.started_at)-focus.paused_ms):0;const seconds=Math.floor(Math.min(focus?.mode==='timer'?focus.duration_ms??Infinity:Infinity,elapsed)/1000);return <article key={member.user_id} className="focus-room-person"><MemberAvatar size={48} userId={member.user_id} name={member.display_name}/><div><h2>{profiles[member.user_id]?.name||member.display_name}</h2><p>{profiles[member.user_id]?.jobTitle||codeLabel(member.role)}</p><span className={'focus-presence '+(state||'offline')}><i aria-hidden="true"/>{presenceError?'Presença indisponível':codeLabel(state||'offline')}</span></div>{focus?<div className="focus-room-session"><strong>{focus.title}</strong><span>{codeLabel(focus.status)} · {codeLabel(focus.mode)}</span><time aria-label="Tempo registrado nesta sessão">{Math.floor(seconds/3600).toString().padStart(2,'0')}:{Math.floor(seconds/60%60).toString().padStart(2,'0')}:{(seconds%60).toString().padStart(2,'0')}</time></div>:<p className="focus-room-idle">Sem sessão ativa</p>}</article>})}</div>
 {!members.length&&<p>Nenhum membro carregado. Selecione um espaço de trabalho.</p>}<small>Os estados são sincronizados pela presença da equipe. O contador usa os horários da sessão; períodos de pausa não contam como foco.</small>
 </section>
}
