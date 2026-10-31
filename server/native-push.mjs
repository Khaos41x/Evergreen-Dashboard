import {createHash,timingSafeEqual} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {HttpError,enforceOrigin,bodyJSON,json,throttle} from './security.mjs'
import {validatedSession,checked} from './identity.mjs'
import {encryptCredential,decryptCredential} from './credentials.mjs'
import {pushReady,sendAndroid,sendApple} from './push-providers.mjs'

function service(config){return createClient(config.url,config.env.NATIVE_PUSH_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})}
export async function nativePush(req,res,config,context,action){
 const current=await validatedSession(context)
 const ready={android:pushReady(config.env,'android'),ios:pushReady(config.env,'ios')}
 if(action==='config'&&req.method==='GET'){context.commit();return json(res,200,ready)}
 if(req.method!=='POST')throw new HttpError(405,'METHOD_NOT_ALLOWED','Método não permitido.')
 enforceOrigin(req,config);await throttle(req,config,'push-device',current.user.id,{ip:60,account:30});const body=await bodyJSON(req,4096)
 if(!['android','ios'].includes(body.platform)||!ready[body.platform])throw new HttpError(503,'PUSH_NOT_CONFIGURED','Notificações nativas ainda não estão configuradas para este aparelho.')
 const client=service(config)
 if(action==='disable'){checked(await client.from('eg_mobile_devices').update({enabled:false}).eq('user_id',current.user.id).eq('session_id',current.status.session_id));context.commit();return json(res,200,{disabled:true})}
 if(action!=='register'||typeof body.token!=='string'||!/^[-_A-Za-z0-9:.]{16,2048}$/.test(body.token))throw new HttpError(400,'PUSH_TOKEN_INVALID','Registro do aparelho inválido.')
 const hash=createHash('sha256').update(body.token).digest('hex'),cipher=encryptCredential(body.token,'eg-push:'+hash,config.env)
 checked(await client.from('eg_mobile_devices').upsert({user_id:current.user.id,token_hash:hash,token_cipher:cipher,platform:body.platform,session_id:current.status.session_id,enabled:true,updated_at:new Date().toISOString()},{onConflict:'token_hash'}));context.commit();return json(res,200,{registered:true})
}
export async function dispatchNativePush(req,res,config){
 const secret=config.env.CRON_SECRET||'',provided=String(req.headers.authorization||'').replace(/^Bearer /,'')
 if(secret.length<32||provided.length!==secret.length||!timingSafeEqual(Buffer.from(secret),Buffer.from(provided)))throw new HttpError(401,'SCHEDULER_DENIED','Acesso não autorizado.')
 if(req.method!=='POST')throw new HttpError(405,'METHOD_NOT_ALLOWED','Método não permitido.')
 if(!pushReady(config.env,'android')&&!pushReady(config.env,'ios'))throw new HttpError(503,'PUSH_NOT_CONFIGURED','Push não configurado.')
 const client=service(config),queue=checked(await client.rpc('eg_claim_mobile_push',{p_limit:2}));let sent=0,skipped=0,failed=0
 for(const job of queue){
  const device=checked(await client.from('eg_mobile_devices').select('*').eq('id',job.device_id).maybeSingle()),notification=checked(await client.from('eg_notifications').select('*').eq('id',job.notification_id).maybeSingle())
  const member=device&&notification?checked(await client.from('eg_members').select('user_id').eq('workspace_id',notification.workspace_id).eq('user_id',device.user_id).maybeSingle()):null
  const profile=device?checked(await client.from('eg_profiles').select('preferences').eq('id',device.user_id).maybeSingle()):null
  const session=device?checked(await client.rpc('eg_push_session_active',{p_session:device.session_id,p_user:device.user_id})):false
  const denied=!device?.enabled||!notification||notification.recipient_id!==device?.user_id||notification.read_at||!member||!session||profile?.preferences?.notify_mentions===false&&/mention|reply/.test(notification.type)||profile?.preferences?.notify_assignments===false&&/assign|handoff/.test(notification.type)
  if(denied){checked(await client.from('eg_push_deliveries').update({sent_at:new Date().toISOString(),last_error:'SKIPPED_ACCESS_OR_PREFERENCE'}).eq('id',job.id));skipped++;continue}
  try{
   if(!pushReady(config.env,device.platform))throw new Error('PUSH_PLATFORM_NOT_CONFIGURED')
   const token=decryptCredential(device.token_cipher,'eg-push:'+device.token_hash,config.env)
   await (device.platform==='android'?sendAndroid(config.env,token,job.notification_id):sendApple(config.env,token,job.notification_id))
   checked(await client.from('eg_push_deliveries').update({sent_at:new Date().toISOString(),last_error:null}).eq('id',job.id));sent++
  }catch(error){
   const code=/^(PUSH_DEVICE_INVALID|FCM_[A-Z_]+|APNS_[A-Z_]+|PUSH_PLATFORM_NOT_CONFIGURED)$/.test(error.message)?error.message:'PUSH_DELIVERY_FAILED'
   if(code==='PUSH_DEVICE_INVALID')checked(await client.from('eg_mobile_devices').update({enabled:false}).eq('id',device.id))
   checked(await client.from('eg_push_deliveries').update({claimed_at:null,available_at:new Date(Date.now()+60000*2**job.attempts).toISOString(),last_error:code}).eq('id',job.id));failed++
  }
 }
 return json(res,200,{sent,skipped,failed})
}
