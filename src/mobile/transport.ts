import { Capacitor, registerPlugin } from '@capacitor/core'

// This origin must match the native allowlist. No token/cookie getter exists.
export const backendOrigin = 'https://evergreen-holding.vercel.app'
export const native = Capacitor.isNativePlatform()
interface NativeReply { status:number; headers:Record<string,string>; body:string }
export interface SessionBridge {
  request(options:{path:string;method:string;headers:Record<string,string>;body?:string}):Promise<NativeReply>
  startStream(options:{path:string;id:string}):Promise<void>
  stopStream(options:{id:string}):Promise<void>
  addListener(event:'stream',callback:(event:{id:string;line?:string;closed?:boolean;error?:boolean})=>void):Promise<{remove:()=>Promise<void>}>
}
export const sessionBridge=registerPlugin<SessionBridge>('EvergreenSession')
export function apiPath(value:string){
  const url=new URL(value,backendOrigin)
  if(url.origin!==backendOrigin||!url.pathname.startsWith('/api/')||url.username||url.password)throw new Error('Destino da aplicação não autorizado.')
  return url.pathname+url.search
}
export async function apiFetch(input:string,init:RequestInit={}):Promise<Response>{
  if(!native)return fetch(input,init)
  if(init.signal?.aborted)throw new DOMException('Cancelado','AbortError')
  const path=apiPath(input),headers=new Headers(init.headers)
  // The native code sets Origin and manages encrypted, HttpOnly session cookies.
  for(const key of ['authorization','apikey','cookie','origin','host'])headers.delete(key)
  let body:string|undefined
  if(init.body!==undefined&&init.body!==null){
    const blob=await new Response(init.body).blob()
    if(blob.size>8*1024*1024)throw new Error('O arquivo ultrapassa o limite mobile de 8 MB.')
    if(blob.type&&!headers.has('content-type'))headers.set('content-type',blob.type)
    const bytes=new Uint8Array(await blob.arrayBuffer());let binary=''
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192))
    body=btoa(binary)
  }
  const reply=await sessionBridge.request({path,method:init.method||'GET',headers:Object.fromEntries(headers.entries()),body})
  if(init.signal?.aborted)throw new DOMException('Cancelado','AbortError')
  const resultHeaders=new Headers(reply.headers);resultHeaders.delete('set-cookie');resultHeaders.delete('set-cookie2')
  const bytes=Uint8Array.from(atob(reply.body),c=>c.charCodeAt(0))
  return new Response([204,205,304].includes(reply.status)?null:bytes,{status:reply.status,headers:resultHeaders})
}

export class NativeEventStream {
  onmessage:((event:{data:string})=>void)|null=null
  onerror:(()=>void)|null=null
  private id=crypto.randomUUID();private closed=false;private subscription?:{remove:()=>Promise<void>}
  constructor(path:string){void this.connect(apiPath(path))}
  private async connect(path:string){
    try{
      const sub=await sessionBridge.addListener('stream',event=>{
        if(event.id!==this.id||this.closed)return
        if(event.line?.startsWith('data: '))this.onmessage?.({data:event.line.slice(6)})
        if(event.closed||event.error){this.onerror?.();this.close()}
      })
      if(this.closed){await sub.remove();return}this.subscription=sub
      await sessionBridge.startStream({path,id:this.id})
      if(this.closed)await sessionBridge.stopStream({id:this.id})
    }catch{if(!this.closed)this.onerror?.();this.close()}
  }
  close(){if(this.closed)return;this.closed=true;void this.subscription?.remove();void sessionBridge.stopStream({id:this.id}).catch(()=>{})}
}
