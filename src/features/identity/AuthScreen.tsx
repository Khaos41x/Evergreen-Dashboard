import {EvergreenBrand} from '../../components/EvergreenBrand'
import { useEffect, useState, type ReactNode, type FormEvent } from 'react'
import { identity, identityRequest, clearLegacyAuthStorage, type IdentitySession } from './client'

export function Auth({children,onLocal}:{children:(session:IdentitySession)=>ReactNode;onLocal:()=>void}){
 const query=new URLSearchParams(location.search)
 const [session,setSession]=useState<IdentitySession|null>(null),[loading,setLoading]=useState(true)
 const [config,setConfig]=useState({google:false,passkeys:false}),[mode,setMode]=useState<'email'|'signup'|'code'|'password'>(query.has('invite')?'signup':'email')
 const [email,setEmail]=useState(''),[invite,setInvite]=useState(query.get('invite')||''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[pending,setPending]=useState(false)
 const next=['/vision','/economy','/founders','/hub'].includes(query.get('next')||'')?query.get('next')!:'/'
 const refresh=async()=>{setError('');void identity.config().then(setConfig).catch(e=>setError(e.message));const result=await identity.getSession();setSession(result.data.session);if(result.error)setError(result.error.message);setLoading(false)}
 useEffect(()=>{clearLegacyAuthStorage(import.meta.env.VITE_SUPABASE_URL || '');void refresh();const {data}=identity.onAuthStateChange((event,value)=>{setSession(value);if(event==='SIGNED_OUT'){setMode('email');setError('');setNotice('Sua sessão foi encerrada. Entre novamente para continuar.')}});return()=>data.subscription.unsubscribe()},[])
 useEffect(()=>{if(!session)return;const check=()=>{if(!document.hidden)void identity.getSession().then(r=>{if(!r.error&&!r.data.session){setSession(null);setMode('email');setNotice('Sua sessão expirou. Entre novamente para continuar.')}})};const timer=setInterval(check,60000);document.addEventListener('visibilitychange',check);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',check)}},[session?.user.id])
 useEffect(()=>{if(session?.context?.workspaces?.length&&location.pathname==='/login'){history.replaceState(null,'',next);dispatchEvent(new PopStateEvent('popstate'))}},[session,next])
 async function run(action:()=>Promise<unknown>){setPending(true);setError('');setNotice('');try{await action()}catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir.')}finally{setPending(false)}}
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget);void run(async()=>{
  if(session){const result=await identityRequest<{session:IdentitySession}>('accept-invite',{invite,name:data.get('name'),job_title:data.get('job_title')});setSession(result.session);return}
  if(mode==='code'){const result=await identity.verifyEmail({email,code:String(data.get('code'))});setSession(result.session);if(location.pathname==='/login'){history.replaceState(null,'',next);dispatchEvent(new PopStateEvent('popstate'))}return}
  if(mode==='password'){const result=await identity.signInWithPassword({email,password:String(data.get('password'))});if(result.error)throw result.error;return}
  if(mode==='signup')await identity.signup({email,name:String(data.get('name')),job_title:String(data.get('job_title')),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,invite,next})
  else await identity.sendEmail({email,next,invite})
  setNotice('Se o acesso estiver autorizado, você receberá um código ou link por e-mail.');setMode('code')
 })}
 if(loading)return <main className="collab-auth" role="status">Verificando acesso seguro…</main>
 if(session&&session.context?.workspaces?.length)return <>{children(session)}</>
 return <main className="collab-auth identity-auth"><header><EvergreenBrand/><h1>Seu espaço.<br/>Sua equipe.</h1><p>O sistema de trabalho interno do grupo.</p></header>
  <section aria-labelledby="auth-title"><h2 id="auth-title">{session?'Complete seu acesso':mode==='signup'?'Criar conta com convite':mode==='code'?'Confirme seu e-mail':'Entrar na Evergreen'}</h2>
  <p>{session?'Sua conta está autenticada. Aceite um convite para acessar a empresa.':'Acesso exclusivo para pessoas convidadas pela empresa.'}</p>
  {!session&&<div className="identity-providers"><button disabled={pending||!config.google} onClick={()=>void run(()=>identity.google({next,invite}))}>Continuar com Google</button><button disabled={pending||!config.passkeys} onClick={()=>void run(()=>identity.passkey())}>Entrar com passkey</button>{(!config.google||!config.passkeys)&&<small>Os métodos desativados aguardam configuração do administrador.</small>}</div>}
  <form onSubmit={submit}>
   {!session&&<label>E-mail da empresa<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>}
   {(mode==='signup'||session)&&<><label>Seu nome<input name="name" autoComplete="name" required maxLength={80} defaultValue={String(session?.user.user_metadata.display_name||'')}/></label><label>Cargo<input name="job_title" autoComplete="organization-title" required maxLength={100} defaultValue={String(session?.user.user_metadata.job_title||'')}/></label><label>Código do convite<input aria-label="Código do convite" aria-describedby="invite-help" value={invite} required pattern="[0-9a-fA-F-]{36}" onChange={e=>{const raw=e.target.value;try{setInvite(new URL(raw).searchParams.get('invite')||raw)}catch{setInvite(raw)}}}/><small id="invite-help">Recebido do responsável pela empresa. O cargo não concede permissões.</small></label></>}
   {mode==='code'&&!session&&<label>Código do e-mail<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required/></label>}
   {mode==='password'&&!session&&<label>Senha da conta existente<input name="password" type="password" autoComplete="current-password" required/></label>}
   <button className="primary" disabled={pending}>{pending?'Aguarde…':session?'Aceitar convite':mode==='code'?'Confirmar acesso':mode==='signup'?'Criar conta e confirmar e-mail':mode==='password'?'Entrar':'Receber código ou link'}</button>
  </form>
  {error&&<p role="alert" className="collab-error">{error} <button disabled={pending} onClick={()=>void refresh()}>Verificar conexão</button></p>}{notice&&<p role="status">{notice}</p>}
  {!session?<div className="identity-options"><button disabled={pending} onClick={()=>{setMode(mode==='signup'?'email':'signup');setError('')}}>{mode==='signup'?'Já tenho conta':'Criar conta · tenho um convite'}</button><button disabled={pending} onClick={()=>{setMode('email');setNotice('Receba um código para recuperar seu acesso.')}}>Recuperar acesso por e-mail</button><details><summary>Conta existente com senha</summary><button onClick={()=>setMode('password')}>Usar senha</button></details></div>:<button onClick={()=>void run(async()=>{const r=await identity.signOut();if(r.error)throw r.error;setSession(null)})}>Sair da conta</button>}
  <footer><button onClick={onLocal}>Abrir produtividade pessoal</button><small>Somente neste navegador, sem compartilhamento ou sincronização.</small></footer></section>
 </main>
}
