import verificationKey from './live-update-key.json'

export const liveUpdateOrigin='https://evergreen-holding.vercel.app'
export const liveUpdateManifest=liveUpdateOrigin+'/mobile-updates/latest.json'
export type LiveUpdate={schema:1;appId:string;platform:'android';minBuild:number;maxBuild:number;nativeVersion:string;sequence:number;version:string;url:string;bytes:number;sha256:string;checksum:string;sessionKey:string}
type Bundle={id:string;version:string;status?:string}
export type UpdatePlugin={notifyAppReady:()=>Promise<unknown>;current:()=>Promise<{bundle:Bundle}>;list:()=>Promise<{bundles:Bundle[]}>;download:(options:{url:string;version:string;checksum:string;sessionKey:string})=>Promise<Bundle>;next:(options:{id:string})=>Promise<unknown>}
const decode=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0))

export async function verifyLiveManifest(raw:unknown,spki=verificationKey.spki):Promise<LiveUpdate>{
 if(!raw||typeof raw!=='object')throw Error('Invalid update envelope')
 const {payload,signature}=raw as Record<string,unknown>
 if(typeof payload!=='string'||payload.length>12000||typeof signature!=='string'||!/^[A-Za-z0-9+/]{342}==$/.test(signature))throw Error('Invalid update signature')
 const key=await crypto.subtle.importKey('spki',decode(spki),{name:'RSA-PSS',hash:'SHA-256'},false,['verify'])
 if(!await crypto.subtle.verify({name:'RSA-PSS',saltLength:32},key,decode(signature),new TextEncoder().encode(payload)))throw Error('Untrusted live update')
 const p=JSON.parse(payload)
 if(p.schema!==1||p.appId!=='com.evergreen.holdings'||p.platform!=='android'||!Number.isSafeInteger(p.sequence)||p.sequence<1||!Number.isInteger(p.minBuild)||!Number.isInteger(p.maxBuild)||p.minBuild<5||p.maxBuild<p.minBuild||!/^\d+\.\d+\.\d+$/.test(p.nativeVersion)||p.version!==p.nativeVersion+'+'+p.sequence||!Number.isInteger(p.bytes)||p.bytes<100||p.bytes>20*1024*1024||!/^\d+$/.test(String(p.sequence))||! /^(?:[a-f0-9]{64})$/.test(p.sha256)||! /^(?:[a-f0-9]{512})$/.test(p.checksum)||typeof p.sessionKey!=='string'||! /^[A-Za-z0-9+/]{22}==:[A-Za-z0-9+/]{342}==$/.test(p.sessionKey))throw Error('Invalid live update')
 if(p.url!==`${liveUpdateOrigin}/mobile-updates/bundles/${p.sequence}-${p.sha256}.bin`)throw Error('Invalid update origin')
 return p
}
export async function fetchLiveManifest(fetcher:typeof fetch=fetch){
 const response=await fetcher(liveUpdateManifest,{credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)})
 if(!response.ok||!response.headers.get('content-type')?.includes('application/json')||!response.body)throw Error('Live update unavailable')
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let length=0
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>16384)throw Error('Oversized update manifest');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}
 const data=new Uint8Array(length);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length}
 return verifyLiveManifest(JSON.parse(new TextDecoder().decode(data)))
}

// Download in the background; native next() activates on a later background/restart.
// Never reloads an active editor, timer or conversation.
export async function checkLiveUpdate(plugin:UpdatePlugin,info:{id:string;build:string},fetcher=fetchLiveManifest){
 if(info.id!=='com.evergreen.holdings'||!/^\d+$/.test(info.build))return 'incompatible'
 const update=await fetcher(),build=Number(info.build)
 if(build<update.minBuild||build>update.maxBuild)return 'incompatible'
 const {bundle}=await plugin.current()
 const sequence=Number(bundle.version.match(/\+(\d+)$/)?.[1]||0)
 if(update.sequence<=sequence)return 'current'
 const {bundles}=await plugin.list()
 if(bundles.some(b=>b.version===update.version&&b.status==='error'))return 'failed'
 const existing=bundles.find(b=>b.version===update.version&&b.status!=='downloading'&&b.status!=='error')
 const downloaded=existing||await plugin.download({url:update.url,version:update.version,checksum:update.checksum,sessionKey:update.sessionKey})
 await plugin.next({id:downloaded.id})
 return 'staged'
}

let initialized=false
export async function initializeLiveUpdates(){
 if(initialized)return
 const {Capacitor}=await import('@capacitor/core')
 if(Capacitor.getPlatform()!=='android'||!Capacitor.isPluginAvailable('CapacitorUpdater'))return
 initialized=true
 const {CapacitorUpdater}=await import('@capgo/capacitor-updater')
 // Confirms JS startup before any API/network calls; failed startup rolls back natively.
 await CapacitorUpdater.notifyAppReady()
 const {App}=await import('@capacitor/app'),info=await App.getInfo()
 let running=false,last=0
 const check=async()=>{if(running||Date.now()-last<600000)return;running=true;try{await checkLiveUpdate(CapacitorUpdater,info);last=Date.now()}catch{last=Date.now()-540000}finally{running=false}}
 window.addEventListener('evergreen:resume',()=>void check())
 window.addEventListener('online',()=>void check())
 void check()
}
