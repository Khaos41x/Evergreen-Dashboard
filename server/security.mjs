import { createHash, randomUUID } from 'node:crypto'
import { parseCookie, stringifySetCookie } from 'cookie'

export class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code }
}
export function settings(env = process.env) {
  const production = env.VERCEL === '1' || env.NODE_ENV === 'production'
  const origin = env.APP_ORIGIN || (!production ? 'http://localhost:5173' : '')
  let parsed
  try { parsed = new URL(origin) } catch { throw new HttpError(503, 'IDENTITY_CONFIGURATION', 'Configure APP_ORIGIN no servidor.') }
  if (parsed.origin !== origin || production && parsed.protocol !== 'https:' || !production && parsed.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) throw new HttpError(503, 'IDENTITY_ORIGIN', 'A origem da aplicação não foi configurada com segurança.')
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL, key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key || /^sb_secret_/.test(key)) throw new HttpError(503, 'IDENTITY_CONFIGURATION', 'Configure a URL e a chave pública do Supabase no servidor.')
  const backend=new URL(url);if(backend.protocol!=='https:'&&(production||!['localhost','127.0.0.1','[::1]'].includes(backend.hostname)))throw new HttpError(503,'IDENTITY_CONFIGURATION','URL Supabase insegura.');
  return { origin, production, url, key, cookieName: production ? '__Host-eg-auth' : 'eg-auth', google: env.GOOGLE_AUTH_ENABLED === 'true', passkeys: env.PASSKEY_AUTH_ENABLED === 'true', env }
}
export function cookieOptions(config, maxAge = 604800) { return { httpOnly: true, secure: config.production || config.origin.startsWith('https:'), sameSite: 'lax', path: '/', maxAge } }
export function readCookies(req) { return parseCookie(req.headers.cookie || '') }
export function setCookie(res, config, name, value, maxAge = 600) {
  const previous = res.getHeader('Set-Cookie') || []
  res.setHeader('Set-Cookie', [...(Array.isArray(previous) ? previous : [previous]), stringifySetCookie({ name, value, ...cookieOptions(config, maxAge) })])
}
export function safeNext(value) {
  if (typeof value !== 'string' || !['/', '/vision', '/economy', '/founders', '/hub', '/login'].includes(value.split('?')[0]) || value.startsWith('//')) return '/'
  const parsed = new URL(value, 'https://evergreen.invalid')
  const invite = parsed.searchParams.get('invite')
  if(parsed.pathname==='/login')return parsed.searchParams.get('recovery')==='1'?'/login?recovery=1':'/login'
  return parsed.pathname + (invite && /^[0-9a-f-]{36}$/i.test(invite) ? '?invite=' + encodeURIComponent(invite) : '')
}
export function enforceOrigin(req, config) {
  if (req.headers.origin !== config.origin) throw new HttpError(403, 'ORIGIN_DENIED', 'Origem da solicitação não autorizada.')
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON_REQUIRED', 'Envie uma solicitação JSON.')
}
export async function bodyJSON(req, maxBytes = 262144) {
  if (req.body && typeof req.body === 'object') { if (Buffer.byteLength(JSON.stringify(req.body)) > maxBytes) throw new HttpError(413, 'BODY_LIMIT', 'Solicitação muito grande.'); return req.body }
  let input = ''
  for await (const chunk of req) { input += chunk; if (Buffer.byteLength(input) > maxBytes) throw new HttpError(413, 'BODY_LIMIT', 'Solicitação muito grande.') }
  try { const result = JSON.parse(input || '{}'); if (!result || Array.isArray(result) || typeof result !== 'object') throw new Error(); return result } catch { throw new HttpError(400, 'INVALID_JSON', 'Solicitação inválida.') }
}
const localBuckets = new Map()
export async function throttle(req, config, action, account = '', limits = {ip:25,account:8}) {
  const ip = config.production ? String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() : req.socket.remoteAddress || 'loopback'
  if (config.production && !ip) throw new HttpError(503, 'RATE_LIMIT_CONFIGURATION', 'Proteção de acesso indisponível.')
  const buckets = [{ value: ip, limit: limits.ip }, ...(account ? [{ value: account.trim().toLowerCase(), limit: limits.account }] : [])]
  for (const bucket of buckets) {
    const key = 'eg:identity:' + action + ':' + createHash('sha256').update(bucket.value).digest('hex'), window = 300
    let count
    if (config.env.REDIS_REST_URL && config.env.REDIS_REST_TOKEN) {
      if (!config.env.REDIS_REST_URL.startsWith('https://')) throw new HttpError(503, 'RATE_LIMIT_CONFIGURATION', 'Rate limiter indisponível.')
      const response = await fetch(config.env.REDIS_REST_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + config.env.REDIS_REST_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(['EVAL', "local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end;return n", '1', key, String(window)]), signal: AbortSignal.timeout(5000) })
      const result = await response.json(); count = Number(result.result)
      if (!response.ok || !Number.isFinite(count) || result.error) throw new HttpError(503, 'RATE_LIMIT_UNAVAILABLE', 'Proteção de acesso temporariamente indisponível.')
    } else if (config.env.RATE_LIMIT_PROOF) {
      if(!/^[A-Za-z0-9_-]{43}$/.test(config.env.RATE_LIMIT_PROOF))throw new HttpError(503,'RATE_LIMIT_CONFIGURATION','Proteção de acesso indisponível.')
      let response,result
      try{response=await fetch(config.url+'/rest/v1/rpc/eg_server_rate_limit',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({p_key:key,p_limit:bucket.limit,p_window:window,p_proof:config.env.RATE_LIMIT_PROOF}),signal:AbortSignal.timeout(5000)});result=await response.json()}catch{throw new HttpError(503,'RATE_LIMIT_UNAVAILABLE','Proteção de acesso temporariamente indisponível.')}
      count=Number(result)
      if(!response.ok||!Number.isSafeInteger(count)||count<1)throw new HttpError(503,'RATE_LIMIT_UNAVAILABLE','Proteção de acesso temporariamente indisponível.')
    } else if (!config.production) {
      const now = Date.now(), current = localBuckets.get(key)
      const next = current && current.until > now ? { ...current, count: current.count + 1 } : { count: 1, until: now + window * 1000 }
      if (localBuckets.size > 5000) { for (const [id, item] of localBuckets) if (item.until <= now) localBuckets.delete(id); if (localBuckets.size > 5000) throw new HttpError(429, 'RATE_LIMITED', 'Aguarde antes de tentar novamente.') }
      localBuckets.set(key, next); count = next.count
    } else throw new HttpError(503, 'RATE_LIMIT_CONFIGURATION', 'O rate limiting distribuído precisa ser configurado no servidor.')
    if (count > bucket.limit) throw new HttpError(429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.')
  }
}
export function json(res, status, data) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)) }
export function errorJSON(res, error, postgrest = false) {
  const status = Number.isInteger(error.status)&&error.status>=400&&error.status<=599 ? error.status : error.code === 'PGRST202'||error.code === '42883' ? 503 : error.code==='42501' ? 403 : /^(22|23|P0001)/.test(String(error.code||'')) ? 400 : 500
  if(status===429)res.setHeader('Retry-After','300')
  const authMessages={invalid_credentials:'E-mail ou senha incorretos.',email_not_confirmed:'Confirme seu e-mail antes de entrar.',user_already_exists:'Não foi possível criar a conta. Tente entrar ou recuperar o acesso.',weak_password:'Escolha uma senha mais forte, com pelo menos 8 caracteres.',otp_expired:'Código ou link expirado. Solicite outro.',over_email_send_rate_limit:'Aguarde alguns minutos antes de solicitar outro e-mail.',email_provider_disabled:'O acesso por e-mail precisa ser configurado no Supabase.',signup_disabled:'O cadastro precisa ser habilitado no Supabase.',same_password:'Escolha uma senha diferente da atual.',reauthentication_needed:'Confirme sua identidade novamente antes de trocar a senha.'}
  const detail={code:error.code||'IDENTITY_REQUEST_FAILED',message:status>=500?'Serviço indisponível ou configuração pendente. Tente novamente mais tarde.':authMessages[error.code]||error.message||'Não foi possível concluir a solicitação.'}
  json(res,status,postgrest?{...detail,details:null,hint:null}:{error:detail,requestId:randomUUID()})
}
