export type EmailLink = {token_hash:string;type:'signup'|'email'|'recovery'}

// A fragment is never sent to the host/CDN. Remove it before any async work.
const fragment = new URLSearchParams(location.hash.slice(1))
const hasAuth = ['token_hash','access_token','error','error_code'].some(key=>fragment.has(key))
let link:EmailLink|null=null
let error=''
if(hasAuth){
 const type=fragment.get('type'),token=fragment.get('token_hash')||''
 if((type==='signup'||type==='email'||type==='recovery')&&/^[a-f0-9]{32,128}$/i.test(token))link={type,token_hash:token}
 else error='Este link é inválido, expirou ou usa um formato antigo. Solicite outro e-mail e use o código recebido.'
 history.replaceState(null,'',location.pathname+location.search)
}
const callbackError=new URLSearchParams(location.search).get('auth_error')
if(callbackError)error=callbackError==='expired'?'Este link expirou. Solicite outro e-mail.':'Não foi possível confirmar o link. Use o código do e-mail ou abra o link no navegador em que iniciou o acesso.'
export const emailLinkState=()=>({link,error})
export const forgetEmailLink=()=>{link=null;error=''}

// Compatibility with provider templates that still issue a PKCE code.
const legacyCode=new URLSearchParams(location.search).get('code')
if(location.pathname==='/login'&&legacyCode&&legacyCode.length<=4096)location.replace('/api/identity/callback?code='+encodeURIComponent(legacyCode))
