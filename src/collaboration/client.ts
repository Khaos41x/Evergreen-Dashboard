import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
// Only a publishable client key belongs in this bundle. Authorization lives in RLS.
export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
}) : null

export function db() {
  if (!supabase) throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY e reinicie o Vite.')
  return supabase
}
export function failure(error: unknown) {
  return error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error)
}
export async function checked<R extends { data?: unknown; error: unknown }>(request: PromiseLike<R>): Promise<NonNullable<R['data']>> {
  const { data, error } = await request
  if (error) throw error
  return data as NonNullable<R['data']>
}
