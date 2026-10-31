import {apiFetch} from '../mobile/transport'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { identity } from '../features/identity/client'
import { ServerChannel } from '../features/identity/ServerChannel'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
// Data SDK only. User credentials/tokens stay in HttpOnly server cookies.
const dataClient=url&&key?createClient(url,key,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
 global:{fetch:async(input,init)=>{const upstream=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);if(upstream.origin!==new URL(url).origin)throw new Error('Destino de dados não autorizado.');const headers=new Headers(init?.headers);headers.delete('authorization');headers.delete('apikey');const response=await apiFetch('/api/backend?target='+encodeURIComponent(upstream.pathname+upstream.search),{...init,headers,credentials:'same-origin',cache:'no-store'});if(response.status===401)window.dispatchEvent(new Event('evergreen:session-expired'));return response}},
}):null
export const supabase=dataClient?{
 from:dataClient.from.bind(dataClient),rpc:dataClient.rpc.bind(dataClient),storage:dataClient.storage,
 auth:identity,channel:(name:string)=>new ServerChannel(name),removeChannel:(channel:ServerChannel)=>channel.unsubscribe(),
} as unknown as SupabaseClient:null

export function db() {
  if (!supabase) throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY e reinicie o Vite.')
  return supabase
}
export function failure(error: unknown) {
  const message=error instanceof Error?error.message:typeof error==='object'&&error&&'message' in error?String(error.message):String(error)
  if(/Failed to fetch|NetworkError|fetch failed|Load failed/i.test(message))return 'Não foi possível conectar. Verifique a conexão e tente novamente.'
  if(/JWT expired|Invalid JWT/i.test(message))return 'Sua sessão expirou. Entre novamente.'
  return message
}
export async function checked<R extends { data?: unknown; error: unknown }>(request: PromiseLike<R>): Promise<NonNullable<R['data']>> {
  const { data, error } = await request
  if (error) throw error
  return data as NonNullable<R['data']>
}
