import {nativePush,dispatchNativePush} from './native-push.mjs'
import {asaasWebhook,scheduledReconciliation} from './asaas.mjs'
import {integrationActions} from './integrations.mjs'
import { readFile } from 'node:fs/promises'
import { settings, errorJSON, HttpError } from './security.mjs'
import { serverSession, validatedSession, checked } from './identity.mjs'
import { authActions } from './auth-actions.mjs'
import { backendProxy } from './proxy.mjs'
import { realtimeStream } from './realtime.mjs'

export function createHandler(env = process.env, options = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0'); res.setHeader('Vary', 'Cookie'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer')
    let context
    try {
      const config = settings(env), url = new URL(req.url, config.origin)
      if(url.pathname==='/api/mobile/push/dispatch')return await dispatchNativePush(req,res,config)
      if(url.pathname==='/api/integrations/reconcile')return await scheduledReconciliation(req,res,config)
      if(url.pathname.startsWith('/api/webhooks/asaas/'))return await asaasWebhook(req,res,config,url.pathname.slice('/api/webhooks/asaas/'.length))
      context = serverSession(req, res, config)
      if(url.pathname.startsWith('/api/mobile/push/'))return await nativePush(req,res,config,context,url.pathname.slice('/api/mobile/push/'.length))
      if(url.pathname.startsWith('/api/integrations/'))return await integrationActions(req,res,config,context,url.pathname.slice('/api/integrations/'.length))
      if (url.pathname.startsWith('/api/identity/')) return await authActions(req, res, config, context, url.pathname.slice('/api/identity/'.length), url.searchParams)
      if (url.pathname === '/api/backend') return await backendProxy(req, res, config, context, url.searchParams)
      if (url.pathname === '/api/realtime') return await realtimeStream(req, res, config, context, url.searchParams)
      if (url.pathname === '/api/page') {
        const view = url.searchParams.get('view'), identity = await validatedSession(context)
        if (!['vision', 'economy', 'founders', 'hub'].includes(view)) throw new HttpError(404, 'PAGE_NOT_FOUND', 'Página indisponível.')
        if (view === 'founders' && !checked(await context.client.rpc('eg_founders_access'))) throw new HttpError(403, 'FOUNDERS_DENIED', 'Você não possui acesso ao Founders.')
        if (!identity.status.workspaces?.length) {context.commit();res.statusCode=303;res.setHeader('Location','/login');res.end();return}
        const html = options.indexHTML ? await options.indexHTML() : await readFile(new URL('../dist/index.html', import.meta.url), 'utf8'); context.commit(); res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return
      }
      throw new HttpError(404, 'NOT_FOUND', 'Recurso indisponível.')
    } catch (error) { if (res.headersSent) { res.end(); return } context?.commit(); if (req.url?.startsWith('/api/page') && error.status === 401) { res.statusCode=303; res.setHeader('Location','/login?next='+encodeURIComponent('/'+new URL(req.url,'http://local').searchParams.get('view'))); res.end(); return } errorJSON(res, error, req.url?.startsWith('/api/backend')) }
  }
}
