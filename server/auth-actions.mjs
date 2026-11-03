import {nativeCallback,nativeRedirect,verifyNativeFlow} from './native-auth.mjs'
import {emailRedirect} from './auth-config.mjs'
import { HttpError, bodyJSON, enforceOrigin, json, throttle } from './security.mjs'
import { checked, clearFlow, flowState, publicIdentity, readFlow, requireRecent, validatedSession } from './identity.mjs'

const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
function requireFeature(enabled, code, message) { if (!enabled) throw new HttpError(503, code, message) }
export async function authActions(req, res, config, context, action, query) {
  const reply = (status, value) => { context.commit(); json(res, status, value) }
  if (action === 'config' && req.method === 'GET') return reply(200, { google: config.google, passkeys: config.passkeys, email: true, cookieSessions: true, nativeAuth:config.env.NATIVE_AUTH_ENABLED==='true' })
  if(action==='company-onboarding'&&req.method==='GET'){await validatedSession(context);return reply(200,checked(await context.client.rpc('eg_company_onboarding')))}
  if (action === 'session' && req.method === 'GET') return reply(200, { session: publicIdentity(await validatedSession(context)) })
  if(action==='native-callback'&&req.method==='GET'){await throttle(req,config,'native-callback');res.statusCode=303;res.setHeader('Location',nativeRedirect(config,query));res.end();return}
  if (action === 'callback' && req.method === 'GET') {
    await throttle(req,config,'callback')
    const flow = readFlow(req, res, config), checkpoint = context.checkpoint(), code = query.get('code')
    if (!code || code.length > 4096) throw new HttpError(400, 'AUTH_CODE_REQUIRED', 'Código de acesso ausente ou expirado.')
    const data = checked(await context.client.auth.exchangeCodeForSession(code))
    if (flow.user && data.user?.id !== flow.user) { context.restore(checkpoint); throw new HttpError(403, 'ACCOUNT_MISMATCH', 'Use a mesma conta para confirmar sua identidade.') }
    let identity
    try { identity = await validatedSession(context, { bootstrap: true, invite: flow.invite }) }
    catch (error) { context.restore(checkpoint); throw error }
    clearFlow(res,config);context.commit()
    res.statusCode = 303; res.setHeader('Location', identity.status.password_recovery ? '/login?recovery=1' : !identity.status.workspaces?.length && flow.invite ? '/?invite='+encodeURIComponent(flow.invite) : flow.next); res.end(); return
  }
  if (req.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.')
  enforceOrigin(req, config)
  const body = await bodyJSON(req)
  await throttle(req, config, action, body.email || '')
  if(action==='native-exchange'){
    verifyNativeFlow(req,res,config,body.nativeState)
    if(typeof body.code!=='string'||!body.code||body.code.length>4096)throw new HttpError(400,'AUTH_CODE_REQUIRED','Código inválido.')
    const flow=readFlow(req,res,config),checkpoint=context.checkpoint()
    const data=checked(await context.client.auth.exchangeCodeForSession(body.code))
    if(flow.user&&data.user?.id!==flow.user){context.restore(checkpoint);throw new HttpError(403,'ACCOUNT_MISMATCH','Use a mesma conta para confirmar sua identidade.')}
    const valid=await validatedSession(context,{bootstrap:true,invite:flow.invite});clearFlow(res,config)
    return reply(200,{session:publicIdentity(valid),next:flow.next})
  }
  const callback = action === 'google' ? nativeCallback(config,body,res) : emailRedirect(config)
  if (action === 'google') {
    requireFeature(config.google, 'GOOGLE_NOT_CONFIGURED', 'O acesso Google precisa ser configurado pelo administrador.')
    const current = body.reauth ? await validatedSession(context) : null
    flowState(req, res, config, body, current)
    const data = checked(await context.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback, skipBrowserRedirect: true, ...(body.reauth ? { queryParams: { prompt: 'select_account', max_age: '0' } } : {}) } }))
    return reply(200, { url: data.url })
  }

  if (action === 'signup') {
    if (!validEmail(body.email)) throw new HttpError(400,'INVALID_EMAIL','Informe um e-mail válido.');
    const metadata={display_name:String(body.name||'').trim(),job_title:String(body.job_title||'').trim(),timezone:String(body.timezone||'UTC')};
    if (!metadata.display_name || metadata.display_name.length>80 || metadata.job_title.length>100) throw new HttpError(400,'PROFILE_REQUIRED','Informe seu nome; o cargo é opcional.');
    if (typeof body.password!=='string'||body.password.length<8||body.password.length>128) throw new HttpError(400,'WEAK_PASSWORD','Use uma senha com pelo menos 8 caracteres.');
    flowState(req,res,config,body);
    const checkpoint=context.checkpoint();
    try {
      const data=checked(await context.client.auth.signUp({email:body.email.trim(),password:body.password,options:{data:metadata,emailRedirectTo:callback,captchaToken:body.captchaToken}}));
      return reply(200,{pendingConfirmation:!data.session,session:data.session?publicIdentity(await validatedSession(context,{bootstrap:true,invite:body.invite||null})):null});
    } catch(error) { context.restore(checkpoint);throw error }
  }
  if (action === 'recover') {
    if(!validEmail(body.email))throw new HttpError(400,'INVALID_EMAIL','Informe um e-mail válido.');
    flowState(req,res,config,{next:'/login?recovery=1'});
    const result=await context.client.auth.resetPasswordForEmail(body.email.trim(),{redirectTo:callback,captchaToken:body.captchaToken});
    if(result.error&&result.error.code!=='user_not_found')throw result.error;
    return reply(200,{pendingConfirmation:true});
  }
  if (action === 'resend-confirmation') {
    if (!validEmail(body.email)) throw new HttpError(400,'INVALID_EMAIL','Informe um e-mail válido.')
    const result = await context.client.auth.resend({type:'signup',email:body.email.trim(),options:{emailRedirectTo:callback,captchaToken:body.captchaToken}})
    if (result.error && !['user_not_found','user_already_exists','email_not_confirmed'].includes(result.error.code)) throw result.error
    return reply(200,{pendingConfirmation:true})
  }
  if (action === 'verify-link') {
    // The fragment is submitted explicitly, never verified by a scanner's GET.
    if (!['signup','email','recovery'].includes(body.type) || typeof body.token_hash!=='string' || !/^[a-f0-9]{32,128}$/i.test(body.token_hash)) throw new HttpError(400,'INVALID_OTP','Link inválido. Solicite outro e-mail.')
    const flow=readFlow(req,res,config),checkpoint=context.checkpoint()
    try {
      const data=checked(await context.client.auth.verifyOtp({token_hash:body.token_hash,type:body.type}))
      if (flow.user && data.user?.id!==flow.user) throw new HttpError(403,'ACCOUNT_MISMATCH','Use a mesma conta para confirmar sua identidade.')
      const valid=await validatedSession(context,{bootstrap:true,invite:flow.invite})
      clearFlow(res,config)
      return reply(200,{session:publicIdentity(valid),next:body.type==='recovery'?'/login?recovery=1':flow.next})
    } catch(error) { context.restore(checkpoint); throw error }
  }
  if (action === 'update-password') {
    const current=await validatedSession(context);
    if(!current.status.recent_auth&&!current.status.password_recovery)requireRecent(current);
    if(typeof body.password!=='string'||body.password.length<8||body.password.length>128)throw new HttpError(400,'WEAK_PASSWORD','Use uma senha com pelo menos 8 caracteres.');
    checked(await context.client.auth.updateUser({password:body.password}));
    // Revoke other devices after a password reset; keep this verified browser.
    checked(await context.client.auth.signOut({scope:'others'}));
    return reply(200,{session:publicIdentity(await validatedSession(context))});
  }
  if (action === 'email') {
    if (!validEmail(body.email)) throw new HttpError(400, 'INVALID_EMAIL', 'Informe um e-mail válido.');
    const current = body.reauth ? await validatedSession(context) : null;
    if (current && body.email.trim().toLowerCase() !== current.user.email?.toLowerCase()) throw new HttpError(403, 'ACCOUNT_MISMATCH', 'Confirme o e-mail da sua conta atual.');
    flowState(req, res, config, body, current);
    const result = await context.client.auth.signInWithOtp({ email: body.email.trim(), options: { shouldCreateUser: false, emailRedirectTo: callback, captchaToken: body.captchaToken } });
    if (result.error && !['user_not_found', 'signup_disabled'].includes(result.error.code)) throw result.error;
    return reply(200, { pendingConfirmation: true, message: 'Se a conta existir, você receberá um código ou link de acesso por e-mail.' });
  }
  if (action === 'verify-email') {
    if (!validEmail(body.email) || typeof body.code!=='string' || !/^\d{6,10}$/.test(body.code)) throw new HttpError(400, 'INVALID_OTP', 'Informe o e-mail e o código recebido.')
    const current = body.reauth ? await validatedSession(context) : null
    const flow = readFlow(req, res, config), checkpoint = context.checkpoint()
    if (current && flow.user !== current.user.id) throw new HttpError(403, 'REAUTH_EXPIRED', 'Solicite um novo código de confirmação.')
    if (body.type!==undefined && !['email','signup','recovery'].includes(body.type)) throw new HttpError(400,'INVALID_OTP','Tipo de confirmação inválido.')
    const result = checked(await context.client.auth.verifyOtp({ email: body.email.trim(), token: body.code, type: body.type||'email' }))
    if (flow.user && result.user?.id !== flow.user) { context.restore(checkpoint); throw new HttpError(403, 'ACCOUNT_MISMATCH', 'Use a mesma conta para confirmar sua identidade.') }
    let valid
    try { valid=await validatedSession(context, { bootstrap: true, invite: flow.invite }) } catch(error) { context.restore(checkpoint);throw error }
    clearFlow(res,config);return reply(200, { session: publicIdentity(valid), next: body.type==='recovery'?'/login?recovery=1':flow.next })
  }
  if (action === 'password') {
    if (!validEmail(body.email) || typeof body.password !== 'string' || body.password.length > 1024) throw new HttpError(400, 'INVALID_CREDENTIALS', 'Informe e-mail e senha.')
    const checkpoint=context.checkpoint()
    try {
      checked(await context.client.auth.signInWithPassword({ email: body.email.trim(), password: body.password }))
      return reply(200, { session: publicIdentity(await validatedSession(context, { bootstrap: true, invite: body.invite || null })) })
    } catch(error) { context.restore(checkpoint);throw error }
  }
  if(action==='company-onboarding'){await validatedSession(context);return reply(200,checked(await context.client.rpc('eg_company_onboarding_submit',{p_companies:body.companies})))}
  if(action==='create-workspace'){
    await validatedSession(context,{bootstrap:true});
    const id=checked(await context.client.rpc('eg_create_workspace',{p_name:String(body.name||'').trim()}));
    return reply(200,{workspaceId:id,session:publicIdentity(await validatedSession(context))});
  }
  if (action === 'accept-invite') {
    if (!/^[0-9a-f-]{36}$/i.test(body.invite || '')) throw new HttpError(400, 'INVITE_REQUIRED', 'Informe um convite válido.')
    return reply(200, { session: publicIdentity(await validatedSession(context, { bootstrap: true, invite: body.invite, metadata: { display_name: body.name, job_title: body.job_title } })) })
  }
  if (action === 'logout') {
    await validatedSession(context)
    if (!['local', 'others', 'global'].includes(body.scope || 'local')) throw new HttpError(400, 'INVALID_SCOPE', 'Escopo de sessão inválido.')
    checked(await context.client.auth.signOut({ scope: body.scope || 'local' })); if (body.scope !== 'others') context.clear()
    return reply(200, { signedOut: true })
  }
  if (action === 'sessions') { await validatedSession(context); return reply(200, { sessions: checked(await context.client.rpc('eg_identity_sessions')) }) }
  if (action.startsWith('passkey/')) {
    requireFeature(config.passkeys, 'PASSKEY_NOT_CONFIGURED', 'Passkeys precisam ser habilitadas e validadas para este domínio pelo administrador.')
    const api = context.client.auth.passkey
    if (action === 'passkey/auth/start') return reply(200, checked(await api.startAuthentication({ options: { captchaToken: body.captchaToken } })))
    if (action === 'passkey/auth/verify') {
      const current = body.reauth ? await validatedSession(context) : null, checkpoint = context.checkpoint()
      const result = checked(await api.verifyAuthentication({ challengeId: body.challengeId, credential: body.credential }))
      if (current && result.user?.id !== current.user.id) { context.restore(checkpoint); throw new HttpError(403, 'ACCOUNT_MISMATCH', 'Use uma passkey da conta atual.') }
      return reply(200, { session: publicIdentity(await validatedSession(context, { bootstrap: true, invite: body.invite || null })) })
    }
    const current = await validatedSession(context)
    if (action === 'passkey/list') return reply(200, { passkeys: checked(await api.list()) })
    requireRecent(current)
    if (action === 'passkey/register/start') return reply(200, checked(await api.startRegistration()))
    if (action === 'passkey/register/verify') return reply(200, checked(await api.verifyRegistration({ challengeId: body.challengeId, credential: body.credential })))
    if (action === 'passkey/update') return reply(200, checked(await api.update({ passkeyId: body.id, friendlyName: body.name })))
    if (action === 'passkey/delete') return reply(200, checked(await api.delete({ passkeyId: body.id })))
  }
  throw new HttpError(404, 'ACTION_NOT_FOUND', 'Operação indisponível.')
}
