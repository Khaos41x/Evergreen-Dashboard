import { createServerClient } from '@supabase/ssr'
import { stringifySetCookie } from 'cookie'
import { HttpError, cookieOptions, readCookies, safeNext, setCookie } from './security.mjs'

export function serverSession(req, res, config) {
  const cookies = readCookies(req), pending = new Map()
  const client = createServerClient(config.url, config.key, {
    cookieOptions: { name: config.cookieName, ...cookieOptions(config) },
    cookies: {
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
      setAll: values => { for (const item of values) pending.set(item.name, { ...item, options: { ...item.options, ...cookieOptions(config, item.options.maxAge === 0 ? 0 : 604800) } }) },
    },
    auth: { flowType: 'pkce', experimental: { passkey: true } },
    global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(15000) }) },
  })
  return {
    client,
    checkpoint: () => new Map(pending), restore: checkpoint => { pending.clear(); for (const [key, value] of checkpoint) pending.set(key, value) },
    commit: () => {
      const previous = res.getHeader('Set-Cookie') || []
      const values = [...pending.values()].map(({ name, value, options }) => stringifySetCookie({ name, value, ...options, domain: undefined }))
      if (values.length) res.setHeader('Set-Cookie', [...(Array.isArray(previous) ? previous : [previous]), ...values]); pending.clear()
    },
    clear: () => { const names=new Set([...Object.keys(cookies),...pending.keys()]);pending.clear();for(const name of names)if(name.startsWith(config.cookieName))setCookie(res,config,name,'',0) },
  }
}
export function checked(result) { if (result.error) throw result.error; return result.data }
export async function validatedSession(context, { bootstrap = false, invite = null, metadata = null } = {}) {
  const result = await context.client.auth.getUser()
  if (result.error || !result.data.user) {
    if (result.error?.name === 'AuthRetryableFetchError' || result.error?.status >= 500) throw new HttpError(503, 'IDENTITY_UNAVAILABLE', 'Não foi possível verificar sua sessão.')
    context.clear(); throw new HttpError(401, 'SESSION_REQUIRED', 'Entre novamente para continuar.')
  }
  const user = result.data.user
  if (bootstrap) checked(await context.client.rpc('eg_identity_bootstrap', { p_invite: invite, p_name: metadata?.display_name || null, p_job_title: metadata?.job_title || null, p_timezone: metadata?.timezone || null }))
  const status = checked(await context.client.rpc('eg_identity_context'))
  if (!status?.active) { context.clear(); throw new HttpError(401, 'SESSION_REVOKED', 'Esta sessão foi encerrada. Entre novamente.') }
  const { session } = checked(await context.client.auth.getSession())
  if (!session || session.user.id !== user.id) throw new HttpError(401, 'SESSION_REQUIRED', 'Sessão inválida.')
  return { user, session, status }
}
export function publicIdentity(validated) {
  const { user, session, status } = validated
  return { user: { id: user.id, email: user.email, user_metadata: { display_name: status.profile?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name || '', job_title: status.profile?.job_title || '' } }, expires_at: session.expires_at, context: status }
}
export function requireRecent(validated) { if (!validated.status.recent_auth) throw new HttpError(428, 'REAUTH_REQUIRED', 'Confirme sua identidade novamente para esta operação.') }
export function flowState(req, res, config, body, validated = null) {
  const prefix = config.production ? '__Host-eg-flow-' : 'eg-flow-'
  setCookie(res, config, prefix + 'next', safeNext(body.next))
  setCookie(res, config, prefix + 'invite', /^[0-9a-f-]{36}$/i.test(body.invite || '') ? body.invite : '')
  setCookie(res, config, prefix + 'user', validated?.user.id || '')
}
export function readFlow(req, res, config) {
  const prefix = config.production ? '__Host-eg-flow-' : 'eg-flow-', values = readCookies(req)
  const state = { next: safeNext(values[prefix + 'next']), invite: values[prefix + 'invite'] || null, user: values[prefix + 'user'] || null }
  return state
}


export function clearFlow(res,config){const prefix=config.production?'__Host-eg-flow-':'eg-flow-';for(const suffix of ['next','invite','user'])setCookie(res,config,prefix+suffix,'',0)}
