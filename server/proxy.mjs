import { HttpError } from './security.mjs'
import { requireRecent, validatedSession } from './identity.mjs'
export async function backendProxy(req, res, config, context, query) {
  const identity = await validatedSession(context), path = query.get('target') || query.get('path') || ''
  const upstream = new URL(path, config.url)
  if (!path.startsWith('/') || path.includes('\\') || upstream.origin !== new URL(config.url).origin || !(/^\/rest\/v1\/(?:eg_[a-z_]+|rpc\/eg_[a-z_]+)$/.test(upstream.pathname) || /^\/storage\/v1\/(?:object|render)\//.test(upstream.pathname))) throw new HttpError(403, 'PROXY_TARGET_DENIED', 'Recurso não autorizado.')
  if (!['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.')
  if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== config.origin) throw new HttpError(403, 'ORIGIN_DENIED', 'Origem não autorizada.')
  if (/\/rpc\/eg_(?:company_onboarding_review|economy_action|founders_action|financial_action|holding_action|integration_manage|profile_original_founder|founder_nominee)$/.test(upstream.pathname) || /\/rpc\/eg_os_(?:company_update|assign_level|level_name|level_permissions|seat|propose|vote|execute|link|equity|commitment|intercompany|seat_consent|finance_policy|group_level|shared_channel)$/.test(upstream.pathname)) requireRecent(identity)
  const headers = new Headers({ apikey: config.key, Authorization: 'Bearer ' + identity.session.access_token })
  for (const name of ['accept', 'content-type', 'prefer', 'range', 'range-unit', 'if-match', 'if-none-match', 'x-upsert']) if (req.headers[name]) headers.set(name, req.headers[name])
  let body
  if (!['GET', 'HEAD'].includes(req.method)) {
    if(Buffer.isBuffer(req.body)) body=req.body
    else if(typeof req.body==='string') body=Buffer.from(req.body)
    else if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) body = Buffer.from(JSON.stringify(req.body))
    else { const chunks = []; let bytes = 0; for await (const chunk of req) { bytes += chunk.length; if (bytes > 4194304) throw new HttpError(413, 'BODY_LIMIT', 'O arquivo excede 4 MB.'); chunks.push(Buffer.from(chunk)) } body = Buffer.concat(chunks) }
    if (body.length > 4194304) throw new HttpError(413, 'BODY_LIMIT', 'Solicitação muito grande.')
  }
  const response = await fetch(upstream, { method: req.method, headers, body, redirect: 'error', signal: AbortSignal.timeout(25000) })
  context.commit(); res.statusCode = response.status
  for (const name of ['content-type', 'content-range', 'range-unit', 'etag', 'preference-applied']) if (response.headers.has(name)) res.setHeader(name, response.headers.get(name))
  res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()))
}
