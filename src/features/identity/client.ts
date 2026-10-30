export interface IdentitySession {
  user:{id:string;email?:string;user_metadata:Record<string,unknown>}
  expires_at?:number
  context?:{active:boolean;recent_auth:boolean;password_recovery?:boolean;session_id:string;workspaces:{id:string;name:string;role:string}[];profile?:{display_name:string;job_title:string}}
}
type Listener=(event:string,session:IdentitySession|null)=>void
const listeners=new Set<Listener>()
let session:IdentitySession|null=null
let inFlight:Promise<{data:{session:IdentitySession|null};error:Error|null}>|null=null
export class IdentityError extends Error {code:string;status:number;constructor(message:string,code:string,status:number){super(message);this.code=code;this.status=status}}
export async function identityRequest<T=Record<string,unknown>>(action:string,body?:unknown):Promise<T>{
 let response:Response
 try{response=await fetch('/api/identity/'+action,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'})}catch{throw new IdentityError('Não foi possível conectar. Seus dados foram preservados.','NETWORK_ERROR',0)}
 const result=await response.json().catch(()=>({error:{code:'SERVER_UNAVAILABLE',message:'Serviço de identidade indisponível.'}}))
 if(!response.ok||result?.error)throw new IdentityError(result?.error?.message||'Não foi possível concluir o acesso.',result?.error?.code||'REQUEST_FAILED',response.status)
 return result as T
}
function emit(event:string,next:IdentitySession|null){session=next;listeners.forEach(fn=>fn(event,next));window.dispatchEvent(new CustomEvent('evergreen:identity',{detail:event}))}
async function signed(action:string,body:unknown){const result=await identityRequest<{session:IdentitySession;next?:string}>(action,body);emit('SIGNED_IN',result.session);return result}

function credentialFailure(error:unknown){
 const name=error&&typeof error==='object'&&'name'in error?String(error.name):'';
 if(['NotAllowedError','AbortError','TimeoutError'].includes(name))return new Error('A solicitação foi cancelada ou o tempo esgotou. Tente novamente ou use o e-mail.');
 if(name==='InvalidStateError')return new Error('Esta chave de acesso já está cadastrada neste dispositivo. Use outra chave ou entre com seu e-mail.');
 if(name==='SecurityError')return new Error('A chave de acesso não pode ser usada neste domínio. Entre com seu e-mail e avise o responsável.');
 if(['NotSupportedError','TypeError'].includes(name))return new Error('Este navegador não oferece os recursos necessários para a chave de acesso. Entre com seu e-mail.');
 return new Error('Não foi possível concluir a solicitação de chave de acesso. Tente novamente ou use o e-mail.');
}

export const identity={
 getSession:()=>{
  if(!inFlight)inFlight=identityRequest<{session:IdentitySession}>('session').then(r=>{session=r.session;return{data:{session},error:null}}).catch(e=>{if(e.status===401)session=null;return{data:{session:e.status===401?null:session},error:e.status===401?null:e as Error}}).finally(()=>{inFlight=null})
  return inFlight
 },
 onAuthStateChange:(listener:Listener)=>{listeners.add(listener);return{data:{subscription:{unsubscribe:()=>{listeners.delete(listener)}}}}},
 signInWithPassword:async(body:{email:string;password:string})=>{try{const result=await signed('password',body);return{data:result,error:null}}catch(error){return{data:null,error}}},
 signOut:async(body?:{scope?:'local'|'others'|'global'})=>{try{await identityRequest('logout',body||{scope:'local'});if(body?.scope!=='others'){emit('SIGNED_OUT',null);try{localStorage.setItem('evergreen.logout',String(Date.now()))}catch{/* Session is already revoked. */}}return{error:null}}catch(error){if(error instanceof IdentityError&&error.status===401){emit('SIGNED_OUT',null);return{error:null}}return{error}}},
 config:()=>identityRequest<{google:boolean;passkeys:boolean;email:boolean;cookieSessions:boolean}>('config'),
 sendEmail:(body:{email:string;next?:string;invite?:string;reauth?:boolean})=>identityRequest('email',body),
 signup:async(body:{email:string;password:string;name:string;job_title:string;timezone:string;invite?:string;next?:string})=>{const result=await identityRequest<{session:IdentitySession|null;pendingConfirmation:boolean}>('signup',body);if(result.session)emit('SIGNED_IN',result.session);return result},
 recover:(email:string)=>identityRequest('recover',{email}),
 updatePassword:(password:string)=>signed('update-password',{password}),
 refresh:async()=>{const result=await identityRequest<{session:IdentitySession}>('session');emit('SIGNED_IN',result.session);return result.session},
 verifyEmail:(body:{email:string;code:string;reauth?:boolean})=>signed('verify-email',body),
 google:async(body:{next?:string;invite?:string;reauth?:boolean})=>{const result=await identityRequest<{url:string}>('google',body);window.location.assign(result.url)},
 async passkey(reauth=false){
  if(!window.PublicKeyCredential||!navigator.credentials)throw new Error("Este navegador não oferece suporte a chaves de acesso.")
  const start=await identityRequest<{challenge_id:string;options:PublicKeyCredentialRequestOptionsJSON}>('passkey/auth/start',{})
  let credential:PublicKeyCredential|null;
  let payload:ReturnType<PublicKeyCredential['toJSON']>;
  try{const options=PublicKeyCredential.parseRequestOptionsFromJSON(start.options);credential=await navigator.credentials.get({publicKey:options}) as PublicKeyCredential|null;if(!credential)throw new DOMException('','NotAllowedError');payload=credential.toJSON()}catch(error){throw credentialFailure(error)}
  return signed('passkey/auth/verify',{challengeId:start.challenge_id,credential:payload,reauth})
 },
 async registerPasskey(){
  const start=await identityRequest<{challenge_id:string;options:PublicKeyCredentialCreationOptionsJSON}>('passkey/register/start',{})
  let credential:PublicKeyCredential|null;
  let payload:ReturnType<PublicKeyCredential['toJSON']>;
  try{credential=await navigator.credentials.create({publicKey:PublicKeyCredential.parseCreationOptionsFromJSON(start.options)}) as PublicKeyCredential|null;if(!credential)throw new DOMException('','NotAllowedError');payload=credential.toJSON()}catch(error){throw credentialFailure(error)}
  return identityRequest('passkey/register/verify',{challengeId:start.challenge_id,credential:payload})
 },
}
export function clearLegacyAuthStorage(projectUrl:string){
 try{const project=new URL(projectUrl).hostname.split('.')[0];for(const suffix of['-auth-token','-auth-token-code-verifier'])localStorage.removeItem('sb-'+project+suffix)}catch{/* No session is recovered from legacy browser storage. */}
}


window.addEventListener('evergreen:session-expired',()=>emit('SIGNED_OUT',null))
window.addEventListener('storage',e=>{if(e.key==='evergreen.logout')emit('SIGNED_OUT',null)})
