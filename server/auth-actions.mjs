import { HttpError, bodyJSON, enforceOrigin, json, throttle } from './security.mjs'
import { checked, clearFlow, flowState, publicIdentity, readFlow, requireRecent, validatedSession } from './identity.mjs'

const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
function requireFeature(enabled, code, message) { if (!enabled) throw new HttpError(503, code, message) }
export async function authActions(req, res, config, context, action, query) {
  const reply = (status, value) => { context.commit(); json(res, status, value) }
  if (action === 'config' && req.method === 'GET') return reply(200, { google: config.google, passkeys: config.passkeys, email: true, cookieSessions: true })
  if (action === 'session' && req.method === 'GET') return reply(200, { session: publicIdentity(await validatedSession(context)) })
  if (action === 'callback' && req.method === 'GET') {
    await throttle(req,config,'callback')
    const flow = readFlow(req, res, config), checkpoint = context.checkpoint(), code = query.get('code')
    if (!code || code.length > 4096) throw new HttpError(400, 'AUTH_CODE_REQUIRED', 'Código de acesso ausente ou expirado.')
    const data = checked(await context.client.auth.exchangeCodeForSession(code))
    if (flow.user && data.user?.id !== flow.user) { context.restore(checkpoint); throw new HttpError(403, 'ACCOUNT_MISMATCH', 'Use a mesma conta para confirmar sua identidade.') }
    const identity = await validatedSession(context, { bootstrap: true, invite: flow.invite }); clearFlow(res,config);context.commit()
    res.statusCode = 303; res.setHeader('Location', !identity.status.workspaces?.length && flow.invite ? '/?invite='+encodeURIComponent(flow.invite) : flow.next); res.end(); return
  }
  if (req.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.')
  enforceOrigin(req, config)
  const body = await bodyJSON(req)
  await throttle(req, config, action, body.email || '')
  const callback = config.origin + '/api/identity/callback'
  if (action === 'google') {
    requireFeature(config.google, 'GOOGLE_NOT_CONFIGURED', 'O acesso Google precisa ser configurado pelo administrador.')
    const current = body.reauth ? await validatedSession(context) : null
    flowState(req, res, config, body, current)
    const data = checked(await context.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback, skipBrowserRedirect: true, ...(body.reauth ? { queryParams: { prompt: 'select_account', max_age: '0' } } : {}) } }))
    return reply(200, { url: data.url })
  }
  if (action === 'email' || action === 'signup') {
    if (!validEmail(body.email)) throw new HttpError(400, 'INVALID_EMAIL', 'Informe um e-mail válido.')
    const metadata = action === 'signup' ? { display_name: String(body.name || '').trim(), job_title: String(body.job_title || '').trim(), timezone: String(body.timezone || 'UTC'), evergreen_invite: body.invite } : null
    if (metadata && (!metadata.display_name || metadata.display_name.length > 80 || !metadata.job_title || metadata.job_title.length > 100 || !/^[0-9a-f-]{36}$/i.test(metadata.evergreen_invite || ''))) throw new HttpError(400, 'INVITE_PROFILE_REQUIRED', 'Informe nome, cargo e convite da empresa.')
    if (metadata && !checked(await context.client.rpc('eg_identity_check_invite', { p_email: body.email, p_invite: metadata.evergreen_invite }))) throw new HttpError(403, 'INVITE_REQUIRED', 'Convite inválido, expirado ou destinado a outro e-mail.')
    const current = body.reauth ? await validatedSession(context) : null
    if (current && body.email.trim().toLowerCase() !== current.user.email?.toLowerCase()) throw new HttpError(403, 'ACCOUNT_MISMATCH', 'Confirme o e-mail da sua conta atual.')
    flowState(req, res, config, body, current)
    const result = await context.client.auth.signInWithOtp({ email: body.email.trim(), options: { shouldCreateUser: action === 'signup', emailRedirectTo: callback, ...(metadata ? { data: metadata } : {}), captchaToken: body.captchaToken } })
    // Login requests do not reveal whether an account exists.
    if (result.error && action === 'signup') throw result.error
    if (result.error && !['user_not_found', 'signup_disabled'].includes(result.error.code)) throw result.error
    return reply(200, { pendingConfirmation: true, message: 'Se sua conta estiver autorizada, você receberá um código ou link de acesso por e-mail.' })
  }
  if (action === 'verify-email') {
    if (!validEmail(body.email) || !/^\d{6,10}$/.test(body.code || '')) throw new HttpError(400, 'INVALID_OTP', 'Informe o e-mail e o código recebido.')
    const current = body.reauth ? await validatedSession(context) : null
    const flow = readFlow(req, res, config), checkpoint = context.checkpoint()
    if (current && flow.user !== current.user.id) throw new HttpError(403, 'REAUTH_EXPIRED', 'Solicite um novo código de confirmação.')
    const result = checked(await context.client.auth.verifyOtp({ email: body.email.trim(), token: body.code, type: 'email' }))
    if (flow.user && result.user?.id !== flow.user) { context.restore(checkpoint); throw new HttpError(403, 'ACCOUNT_MISMATCH', 'Use a mesma conta para confirmar sua identidade.') }
    const valid = await validatedSession(context, { bootstrap: true, invite: flow.invite })
    clearFlow(res,config);return reply(200, { session: publicIdentity(valid), next: flow.next })
  }
  if (action === 'password') {
    if (!validEmail(body.email) || typeof body.password !== 'string' || body.password.length > 1024) throw new HttpError(400, 'INVALID_CREDENTIALS', 'Informe e-mail e senha.')
    checked(await context.client.auth.signInWithPassword({ email: body.email.trim(), password: body.password }))
    return reply(200, { session: publicIdentity(await validatedSession(context, { bootstrap: true, invite: body.invite || null })) })
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
