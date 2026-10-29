import { randomUUID } from 'node:crypto'
import { HttpError, throttle } from './security.mjs'
import { checked, validatedSession } from './identity.mjs'
export async function realtimeStream(req, res, config, context, query) {
  if (req.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.')
  const identity = await validatedSession(context)
  await throttle(req,config,'realtime',identity.user.id,{ip:600,account:120})
  if(String(query.get('channel')||'').length>24000)throw new HttpError(413,'CHANNEL_LIMIT','Canal muito grande.')
  let input
  try { input = JSON.parse(query.get('channel') || '{}') } catch { throw new HttpError(400, 'INVALID_CHANNEL', 'Canal inválido.') }
  const handlers = input.handlers || []
  if (!Array.isArray(handlers) || handlers.length > 16) throw new HttpError(400, 'INVALID_CHANNEL', 'Número de assinaturas inválido.')
  const presence = String(input.name || '').startsWith('eg-presence:')
  if (presence) {
    const workspace = String(input.name).slice('eg-presence:'.length)
    if (!/^[0-9a-f-]{36}$/i.test(workspace)) throw new HttpError(400, 'INVALID_CHANNEL', 'Workspace inválido.')
    const member = checked(await context.client.from('eg_members').select('user_id').eq('workspace_id', workspace).eq('user_id', identity.user.id).maybeSingle())
    if (!member) throw new HttpError(403, 'CHANNEL_DENIED', 'Você não participa deste workspace.')
  }
  for (const item of handlers) if (item.type !== 'presence' && (item.type !== 'postgres_changes' || item.filter?.schema !== 'public' || !/^eg_[a-z_]+$/.test(item.filter?.table || '') || String(item.filter?.filter || '').length > 200)) throw new HttpError(403, 'CHANNEL_DENIED', 'Assinatura não autorizada.')
  await context.client.realtime.setAuth(identity.session.access_token)
  const channel = context.client.channel(presence ? input.name : 'bff-' + randomUUID(), presence ? { config: { private: true, presence: { key: identity.user.id } } } : {})
  context.commit(); res.statusCode = 200; res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('X-Accel-Buffering', 'no'); res.flushHeaders?.()
  let closed = false, interval, timer
  const send = data => { if (!closed) res.write('data: ' + JSON.stringify(data) + '\n\n') }
  const cleanup = () => { if (closed) return; closed = true; clearInterval(interval); clearTimeout(timer); void context.client.removeChannel(channel); res.end() }
  for (const item of handlers) if (item.type === 'postgres_changes') channel.on('postgres_changes', item.filter, event => send({ type: 'postgres_changes', table: item.filter.table, payload: event }))
  if (presence) channel.on('presence', { event: 'sync' }, () => send({ type: 'presence', payload: channel.presenceState() }))
  channel.subscribe(async status => {
    if (closed) return
    if (status === 'SUBSCRIBED' && presence) {
      const result = await channel.track({ user_id: identity.user.id, state: input.presence?.state === 'away' ? 'away' : 'online', focusing: input.presence?.focusing === true })
      send({ type: 'tracked', result })
    }
    send({ type: 'status', status })
  })
  interval = setInterval(async () => {
    try { const status = checked(await context.client.rpc('eg_identity_context')); if (!status?.active || presence && !status.workspaces?.some(w=>w.id===String(input.name).slice('eg-presence:'.length))) { send({ type: 'status', status: 'CLOSED' }); cleanup(); return } send({ type: 'heartbeat' }) } catch { send({ type: 'status', status: 'CHANNEL_ERROR' }); cleanup() }
  }, 10000)
  timer = setTimeout(cleanup, 45000); req.on('aborted', cleanup); res.on('close', cleanup)
}
