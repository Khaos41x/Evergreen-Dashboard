import {EvergreenBrand} from '../../components/EvergreenBrand'
import {useEffect,useState,type ReactNode,type FormEvent} from 'react'
import {identity,identityRequest,clearLegacyAuthStorage,type IdentitySession} from './client'

type Mode='password'|'signup'|'email'|'code'|'recover'|'reset'|'confirm'
export function Auth({children,onLocal}:{children:(session:IdentitySession)=>ReactNode;onLocal:()=>void}){
 const query=new URLSearchParams(location.search),recovery=query.get('recovery')==='1'
 const [session,setSession]=useState<IdentitySession|null>(null),[loading,setLoading]=useState(true)
 const [config,setConfig]=useState({google:false,passkeys:false}),[mode,setMode]=useState<Mode>(recovery?'reset':'password')
 const [email,setEmail]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[pending,setPending]=useState(false),[resetAfterCode,setResetAfterCode]=useState(false)
 const next=['/vision','/economy','/founders','/hub'].includes(query.get('next')||'')?query.get('next')!:'/hub'
 const refresh=async()=>{setError('');void identity.config().then(setConfig).catch(e=>setError(e.message));const result=await identity.getSession();setSession(result.data.session);if(result.error)setError(result.error.message);setLoading(false)}
 useEffect(()=>{clearLegacyAuthStorage(import.meta.env.VITE_SUPABASE_URL||'');void refresh();const {data}=identity.onAuthStateChange((event,value)=>{setSession(value);if(event==='SIGNED_OUT'){setMode('password');setError('');setNotice('Sua sessão foi encerrada. Entre novamente para continuar.')}});return()=>data.subscription.unsubscribe()},[])
 useEffect(()=>{if(!session)return;const check=()=>{if(!document.hidden)void identity.getSession().then(r=>{if(!r.error&&!r.data.session){setSession(null);setMode('password');setNotice('Sua sessão expirou. Entre novamente para continuar.')}})};const timer=setInterval(check,60000);document.addEventListener('visibilitychange',check);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',check)}},[session?.user.id])
 useEffect(()=>{if(session?.context?.workspaces?.length&&location.pathname==='/login'&&!['reset','code'].includes(mode)){history.replaceState(null,'',next);dispatchEvent(new PopStateEvent('popstate'))}},[session,next,mode])
 async function run(action:()=>Promise<unknown>){setPending(true);setError('');setNotice('');try{await action()}catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir.')}finally{setPending(false)}}
 const switchMode=(value:Mode)=>{setMode(value);setError('');setNotice('');setResetAfterCode(false)}
 const leaveRecovery=()=>{setMode('password');setResetAfterCode(false);if(location.pathname==='/login'){history.replaceState(null,'',next);dispatchEvent(new PopStateEvent('popstate'))}}
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);void run(async()=>{
  if(mode==='reset'){if(f.get('password')!==f.get('confirm'))throw new Error('As senhas precisam ser iguais.');await identity.updatePassword(String(f.get('password')));leaveRecovery();setNotice('Senha atualizada. As sessões dos outros dispositivos foram encerradas.');return}
  if(mode==='code'){await identity.verifyEmail({email:session?.user.email||email,code:String(f.get('code')),reauth:!!session});setMode(resetAfterCode?'reset':'password');return}
  if(mode==='recover'){await identity.recover(email);setNotice('Se a conta existir, enviaremos um link para redefinir a senha. Confira também o spam.');return}
  if(mode==='signup'){if(f.get('password')!==f.get('confirm'))throw new Error('As senhas precisam ser iguais.');const result=await identity.signup({email,password:String(f.get('password')),name:String(f.get('name')),job_title:String(f.get('job_title')||''),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,next,invite:query.get('invite')||undefined});if(!result.session){setMode('confirm');setNotice('Confira seu e-mail e abra o link de confirmação. Depois, entre com sua senha.')}return}
  if(mode==='password'){const result=await identity.signInWithPassword({email,password:String(f.get('password'))});if(result.error)throw result.error;return}
  await identity.sendEmail({email,next});setMode('code');setNotice('Se a conta existir, você receberá um código ou link por e-mail.')
 })}
 if(loading)return <main className="collab-auth" role="status">Verificando acesso seguro…</main>
 if(session?.context?.workspaces?.length&&!['reset','code'].includes(mode))return <>{children(session)}</>
 const onboarding=!!session&&!['reset','code'].includes(mode)
 const resetProof=!!session&&(session.context?.recent_auth||session.context?.password_recovery)
 return <main className="collab-auth identity-auth"><header><EvergreenBrand/><h1>Seu espaço.<br/>Sua equipe.</h1><p>Planeje, converse e trabalhe junto.</p></header>
 <section aria-labelledby="auth-title"><h2 id="auth-title">{onboarding?'Vamos começar':mode==='signup'?'Crie sua conta':mode==='recover'||mode==='reset'?'Redefinir senha':mode==='code'||mode==='confirm'?'Confirme seu e-mail':'Entrar na Evergreen'}</h2>
 <p>{onboarding?'Crie um espaço para sua equipe ou entre em um espaço que já foi compartilhado com você.':mode==='signup'?'Seu nome, e-mail e senha. Sem convite para se cadastrar.':'Tudo o que sua equipe precisa, em um só lugar.'}</p>
 {onboarding?<><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run(async()=>{await identityRequest('create-workspace',{name:String(f.get('workspace'))});setSession(await identity.refresh())})}}><label>Nome do espaço<input name="workspace" placeholder="Ex.: Evergreen" required minLength={2} maxLength={80}/></label><button className="primary" disabled={pending}>{pending?'Criando…':'Criar espaço de trabalho'}</button><small>O novo espaço começa vazio e separado das outras equipes.</small></form>
 <details><summary>Entrar em uma equipe existente</summary><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);let invite=String(f.get('invite')).trim();try{invite=new URL(invite).searchParams.get('invite')||invite}catch{}void run(async()=>{await identityRequest('accept-invite',{invite});setSession(await identity.refresh())})}}><label>Link de acesso da equipe<input name="invite" required defaultValue={query.get('invite')||''}/></label><button disabled={pending}>Entrar na equipe</button></form><small>Peça ao responsável para compartilhar o acesso. Sua conta já está criada.</small></details><button disabled={pending} onClick={()=>void identity.signOut()}>Sair da conta</button></>:<>
 {!session&&(mode==='password'||mode==='signup')&&(config.google||config.passkeys)&&<div className="identity-providers">{config.google&&<button disabled={pending} onClick={()=>void run(()=>identity.google({next}))}>Continuar com Google</button>}{config.passkeys&&<button disabled={pending} onClick={()=>void run(()=>identity.passkey())}>Usar chave de acesso</button>}</div>}
 {mode==='confirm'?<button onClick={()=>switchMode('password')}>Já confirmei · entrar</button>:mode==='reset'&&!resetProof?<div className="identity-options"><p>{session?'Confirme sua identidade por e-mail antes de trocar a senha.':'Abra o link de recuperação recebido por e-mail. Se ele expirou, solicite outro.'}</p>{session?<button disabled={pending} onClick={()=>void run(async()=>{await identity.sendEmail({email:session.user.email||email,reauth:true,next:'/login?recovery=1'});setEmail(session.user.email||email);setResetAfterCode(true);setMode('code');setNotice('Digite o código que enviamos ao seu e-mail.')})}>Receber código de confirmação</button>:<button onClick={()=>switchMode('recover')}>Solicitar novo link</button>}</div>:<form onSubmit={submit}>
 {!session&&mode!=='reset'&&<label>E-mail<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {mode==='signup'&&<><label>Seu nome<input name="name" autoComplete="name" required maxLength={80}/></label><label>Cargo <small>(opcional)</small><input name="job_title" autoComplete="organization-title" maxLength={100}/></label></>}
 {mode==='code'&&<label>Código do e-mail<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required/></label>}
 {(mode==='password'||mode==='signup'||mode==='reset')&&<label>{mode==='reset'?'Nova senha':'Senha'}<input aria-label={mode==='reset'?'Nova senha':'Senha'} name="password" type="password" autoComplete={mode==='password'?'current-password':'new-password'} required minLength={mode==='password'?1:8} maxLength={128}/>{mode!=='password'&&<small>Pelo menos 8 caracteres.</small>}</label>}
 {(mode==='signup'||mode==='reset')&&<label>Confirmar senha<input name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={128}/></label>}
 <button className="primary" disabled={pending}>{pending?'Aguarde…':mode==='signup'?'Criar conta':mode==='code'?'Confirmar acesso':mode==='recover'?'Enviar link de recuperação':mode==='reset'?'Salvar nova senha':mode==='password'?'Entrar':'Receber código ou link'}</button>
 </form>}
 <div className="identity-options">{mode==='password'?<><button onClick={()=>switchMode('signup')}>Criar uma conta</button><button onClick={()=>switchMode('recover')}>Esqueci minha senha</button><button onClick={()=>switchMode('email')}>Entrar com código de e-mail</button></>:<button disabled={pending} onClick={()=>{if(session)leaveRecovery();else switchMode('password')}}>{session?'Voltar ao espaço':'Já tenho conta · entrar'}</button>}</div>
 </>}
 {error&&<p role="alert" className="collab-error">{error} <button disabled={pending} onClick={()=>void refresh()}>Verificar conexão</button></p>}{notice&&<p role="status">{notice}</p>}
 <footer><button onClick={onLocal}>Usar apenas neste navegador</button><small>Modo pessoal, sem compartilhamento ou sincronização.</small></footer>
 </section></main>
}
