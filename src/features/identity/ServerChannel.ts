type Filter={event?:string;schema?:string;table?:string;filter?:string}
const channels=new Set<ServerChannel>()
export class ServerChannel{
 private handlers:{type:string;filter:Filter;callback:(payload:any)=>void}[]=[]
 private source:EventSource|null=null
 private status:((status:string)=>void)|undefined
 private state:Record<string,any[]>={}
 private presence:unknown=null
 private tracked=false
 private pending:((result:string)=>void)[]=[]
 constructor(private name:string){channels.add(this)}
 on(type:string,filter:Filter,callback:(payload:any)=>void){this.handlers.push({type,filter,callback});return this}
 subscribe(callback?:(status:string)=>void){this.status=callback;this.connect();return this}
 private connect(){
  this.source?.close();const config={name:this.name,handlers:this.handlers.map(({type,filter})=>({type,filter})),presence:this.presence}
  const source=new EventSource('/api/realtime?channel='+encodeURIComponent(JSON.stringify(config)),{withCredentials:true});this.source=source
  source.onmessage=message=>{if(this.source!==source)return;try{const data=JSON.parse(message.data);if(data.type==='status')this.status?.(data.status);if(data.type==='tracked'){this.tracked=data.result==='ok';this.pending.splice(0).forEach(resolve=>resolve(data.result))}if(data.type==='presence'){this.state=data.payload;this.handlers.filter(h=>h.type==='presence').forEach(h=>h.callback({}))}if(data.type==='postgres_changes')this.handlers.filter(h=>h.type==='postgres_changes'&&h.filter.table===data.table).forEach(h=>h.callback(data.payload))}catch{this.status?.('CHANNEL_ERROR')}}
  source.onerror=()=>{if(this.source===source){this.status?.('CHANNEL_ERROR');this.pending.splice(0).forEach(resolve=>resolve('error'))}}
 }
 track(payload:unknown):Promise<string>{
  if(this.tracked&&JSON.stringify(payload)===JSON.stringify(this.presence))return Promise.resolve('ok')
  this.tracked=false;this.presence=payload
  return new Promise(resolve=>{this.pending.push(resolve);this.connect();setTimeout(()=>{const index=this.pending.indexOf(resolve);if(index>=0){this.pending.splice(index,1);resolve('timed out')}},15000)})
 }
 untrack(){return this.unsubscribe()}
 presenceState<T=any>():Record<string,T[]>{return this.state as Record<string,T[]>}
 async unsubscribe(){this.source?.close();this.source=null;this.state={};channels.delete(this);this.pending.splice(0).forEach(resolve=>resolve('error'));this.status?.('CLOSED');return'ok' as const}
}
window.addEventListener('evergreen:identity',event=>{if((event as CustomEvent).detail==='SIGNED_OUT')for(const channel of channels)void channel.unsubscribe()})
