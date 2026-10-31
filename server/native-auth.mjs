import {HttpError,readCookies,setCookie} from './security.mjs'
const validState=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)
const name=config=>config.production?'__Host-eg-native-flow':'eg-native-flow'
export function nativeCallback(config,body,res){
 if(body.nativeState===undefined)return config.origin+'/api/identity/callback'
 if(config.env.NATIVE_AUTH_ENABLED!=='true')throw new HttpError(503,'NATIVE_AUTH_NOT_CONFIGURED','O retorno de autenticação mobile ainda não foi habilitado no servidor.')
 if(!validState(body.nativeState))throw new HttpError(400,'NATIVE_STATE_INVALID','Solicitação de acesso inválida.')
 setCookie(res,config,name(config),body.nativeState+'.'+Date.now())
 return config.origin+'/api/identity/native-callback?state='+body.nativeState
}
export function nativeRedirect(config,query){
 if(config.env.NATIVE_AUTH_ENABLED!=='true')throw new HttpError(503,'NATIVE_AUTH_NOT_CONFIGURED','Retorno mobile indisponível.')
 const code=query.get('code'),state=query.get('state')
 if(!validState(state)||!code||code.length>4096)throw new HttpError(400,'NATIVE_CALLBACK_INVALID','Link inválido ou expirado. Inicie o acesso novamente.')
 // Authorization code only. PKCE verifier and session cookies stay in the native vault.
 return 'evergreen://auth/callback?code='+encodeURIComponent(code)+'&state='+state
}
export function verifyNativeFlow(req,res,config,state){
 const saved=readCookies(req)[name(config)]||'',split=saved.lastIndexOf('.'),timestamp=Number(saved.slice(split+1))
 if(config.env.NATIVE_AUTH_ENABLED!=='true'||!validState(state)||saved.slice(0,split)!==state||!Number.isFinite(timestamp)||timestamp>Date.now()||Date.now()-timestamp>600000)throw new HttpError(403,'NATIVE_STATE_INVALID','Este acesso não foi iniciado neste aplicativo ou expirou.')
 setCookie(res,config,name(config),'',0)
}
