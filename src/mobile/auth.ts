import { Browser } from '@capacitor/browser'
import { apiFetch, backendOrigin, native } from './transport'

let enabled=false
export function configureNativeAuth(value:boolean){enabled=value}
let pendingState:string|null=null,expires=0
export function nativeAuthBody(){
  if(!native||!enabled)return {}
  pendingState=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');expires=Date.now()+600000
  return {nativeState:pendingState}
}
export async function openOAuth(url:string){
  if(!native){location.assign(url);return}
  const parsed=new URL(url),supabase=import.meta.env.VITE_SUPABASE_URL
  if(!supabase||parsed.origin!==new URL(supabase).origin||parsed.pathname!=='/auth/v1/authorize')throw new Error('Provedor de acesso não autorizado.')
  await Browser.open({url})
}
export async function handleAuthLink(value:string){
  const url=new URL(value)
  if(url.protocol!=='evergreen:'||url.hostname!=='auth'||url.pathname!=='/callback')return false
  const state=url.searchParams.get('state'),code=url.searchParams.get('code')
  if(!pendingState||state!==pendingState||Date.now()>expires||!code||code.length>4096)throw new Error('Este link não corresponde ao acesso iniciado neste aplicativo. Inicie o acesso novamente.')
  pendingState=null
  const response=await apiFetch('/api/identity/native-exchange',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,nativeState:state})})
  const result=await response.json()
  if(!response.ok)throw new Error(result.error?.message||'Não foi possível confirmar o acesso.')
  await Browser.close().catch(()=>{})
  const next=new URL(result.next||'/hub',backendOrigin)
  history.replaceState(null,'',next.origin===backendOrigin&&['/hub','/vision','/economy','/founders','/login','/'].includes(next.pathname)?next.pathname+next.search:'/hub')
  window.dispatchEvent(new CustomEvent('evergreen:native-auth',{detail:result.session}))
  dispatchEvent(new PopStateEvent('popstate'))
  return true
}
