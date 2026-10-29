import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { checked, db, failure, supabase } from './client'

export function Auth({ children, onLocal }: { children: (session: Session) => ReactNode; onLocal: () => void }) {
  const [invite,setInvite] = useState(() => {
    const value = new URLSearchParams(window.location.search).get('invite') ?? ''
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : ''
  })
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!!supabase)
  const [mode, setMode] = useState<'login' | 'signup' | 'recover' | 'password'>('login')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [inviteEntry,setInviteEntry] = useState(false)
  const [inviteCode,setInviteCode] = useState('')
  function activateInvite(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setError('');setNotice('')
    let token=inviteCode.trim()
    try { if(!/^[0-9a-f-]{36}$/i.test(token))token=new URL(token,window.location.origin).searchParams.get('invite')??'' } catch { token='' }
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)){setError('Cole o link completo ou o código de convite enviado pelo responsável da sua equipe.');return}
    const url=new URL(window.location.href);url.searchParams.set('invite',token);window.history.replaceState(null,'',url)
    setInvite(token);setInviteEntry(false);setMode('signup')
  }
  useEffect(() => {
    if (!supabase) return
    let live = true
    supabase.auth.getSession().then(({ data, error }) => { if (live) { setSession(data.session); setLoading(false); if (error) setError(error.message) } }).catch(e => { if (live) { setLoading(false); setError(failure(e)) } })
    const { data } = supabase.auth.onAuthStateChange((event, next) => { setSession(next); if (event === 'PASSWORD_RECOVERY') setMode('password') })
    return () => { live = false; data.subscription.unsubscribe() }
  }, [])
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(''); setNotice('')
    const fields = new FormData(event.currentTarget)
    const email = String(fields.get('email') ?? '')
    const password = String(fields.get('password') ?? '')
    try {
      if (mode === 'login') await checked(db().auth.signInWithPassword({ email, password }))
      if (mode === 'signup') {
        if (!invite) throw new Error('A ativação de acesso exige um convite da holding.')
        const result = await checked(db().auth.signUp({ email:email.trim(), password, options: { data: { display_name: String(fields.get('name')).trim(), evergreen_invite:invite }, emailRedirectTo: `${window.location.origin}/?invite=${encodeURIComponent(invite)}` } }))
        if (!result.session) setNotice('Solicitação recebida. Se o convite for válido para este e-mail, confirme a mensagem recebida e volte para aceitar o convite.')
      }
      if (mode === 'recover') { await checked(db().auth.resetPasswordForEmail(email, { redirectTo: invite ? `${window.location.origin}/?invite=${encodeURIComponent(invite)}` : window.location.origin })); setNotice('Solicitação recebida. Se a conta existir, consulte seu e-mail.') }
      if (mode === 'password') { await checked(db().auth.updateUser({ password })); setMode('login'); setNotice('Senha atualizada.') }
    } catch (e) { const message=failure(e);setError(mode==='login'&&message==='Invalid login credentials'?'E-mail ou senha inválidos. No primeiro acesso, use o convite recebido para ativar sua conta.':message) } finally { setPending(false) }
  }
  if (loading) return <main className="collab-auth" role="status">Carregando sessão…</main>
  if (session && mode !== 'password') return children(session)
  return <main className="collab-auth"><section><h1>Evergreen</h1><p>O espaço de trabalho interno da holding.</p>
    {!supabase ? <div role="status"><h2>Conecte seu workspace</h2><p>O backend ainda não está configurado. Login e colaboração dependem de um projeto Supabase dedicado.</p><p>Configure as variáveis de ambiente conforme o README. Seus dados locais continuam neste navegador.</p></div> : <>
      <h2>{({ login: 'Entrar', signup: 'Ativar meu acesso', recover: 'Recuperar conta', password: 'Nova senha' })[mode]}</h2>
      <p>{invite?'Você recebeu um convite. Entre com sua conta ou ative seu acesso usando o mesmo e-mail do convite.':'Acesso exclusivo para pessoas autorizadas da holding. Para entrar pela primeira vez, solicite um convite ao responsável pela sua equipe.'}</p>
      <form onSubmit={submit}>
        {mode === 'signup' && <label>Seu nome<input name="name" required maxLength={80} autoComplete="name" /></label>}
        {mode !== 'password' && <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>}
        {mode !== 'recover' && <label>Senha<input name="password" type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>}
        <button className="primary" disabled={pending}>{pending ? 'Aguarde…' : ({ login: 'Entrar', signup: 'Ativar acesso', recover: 'Enviar recuperação', password: 'Salvar senha' })[mode]}</button>
      </form>
      <div className="collab-actions">{(['login', 'signup', 'recover'] as const).filter(m => m !== mode && (m !== 'signup' || !!invite)).map(m => <button disabled={pending} key={m} onClick={() => { setMode(m); setError(''); setNotice('') }}>{({ login: 'Entrar', signup: 'Ativar meu acesso', recover: 'Esqueci a senha' })[m]}</button>)}{!invite&&<button disabled={pending} onClick={()=>{setInviteEntry(v=>!v);setError('')}}>Tenho um convite</button>}</div>
      {inviteEntry&&!invite&&<form onSubmit={activateInvite}><label>Link ou código de convite<input value={inviteCode} onChange={e=>setInviteCode(e.target.value)} required autoComplete="off" spellCheck={false}/></label><button className="primary">Continuar com convite</button><small>Se ainda não recebeu um convite, peça acesso ao responsável pela holding.</small></form>}
    </>}
    {error && <p role="alert" className="collab-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    <button onClick={onLocal}>Abrir produtividade local</button><small>Modo local: sem conta, compartilhamento ou sincronização.</small>
  </section></main>
}
