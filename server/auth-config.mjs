import {isIP} from 'node:net'

// Origins are configured per environment, never inferred from request headers.
export function authOrigin(value, production) {
  let url
  try { url = new URL(value) } catch { throw new Error('Configure APP_ORIGIN no servidor.') }
  const host = url.hostname.toLowerCase().replace(/\.$/,'')
  const local = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
    isIP(host.replace(/^\[|\]$/g,'')) !== 0 || host === '[::1]' || host.startsWith('[fc') || host.startsWith('[fd') || host.startsWith('[fe80:') ||
    /^(127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
  if (url.origin !== value || url.username || url.password ||
      (production && (url.protocol !== 'https:' || local)) ||
      (!production && url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(host)))) {
    throw new Error('A origem da aplicação não foi configurada com segurança.')
  }
  return url.origin
}

export const emailRedirect = config => authOrigin(config.origin, config.production) + '/login'
