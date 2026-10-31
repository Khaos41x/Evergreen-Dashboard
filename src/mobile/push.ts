import {Capacitor} from '@capacitor/core'
import {PushNotifications} from '@capacitor/push-notifications'
import {apiFetch,native} from './transport'
let user:string|null=null,ready=false,initialized=false,generation=0
function notice(message:string){window.dispatchEvent(new CustomEvent('evergreen:push-status',{detail:message}))}
async function request(action:string,body?:unknown){const r=await apiFetch('/api/mobile/push/'+action,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const result=await r.json();if(!r.ok)throw new Error(result.error?.message||'Não foi possível configurar notificações.');return result}
export async function preparePush(userId:string|null){
 if(!native)return
 user=userId;const attempt=++generation;ready=false
 if(!initialized){
  initialized=true
  await PushNotifications.addListener('registration',token=>{
   if(!user||!ready)return
   void request('register',{platform:Capacitor.getPlatform(),token:token.value}).then(()=>notice('Notificações ativadas neste aparelho.')).catch(e=>notice(e.message))
  })
  await PushNotifications.addListener('registrationError',()=>notice('Não foi possível registrar este aparelho. Verifique a configuração de push.'))
  await PushNotifications.addListener('pushNotificationActionPerformed',()=>{
   // Generic portal; the backend resolves accessible workspaces after session validation.
   history.pushState(null,'','/hub');dispatchEvent(new PopStateEvent('popstate'));window.dispatchEvent(new Event('evergreen:resume'))
  })
 }
 if(!userId){await PushNotifications.unregister().catch(()=>{});return}
 try{const config=await request('config');if(attempt!==generation)return;ready=config[Capacitor.getPlatform()]===true;notice(ready?'Disponível para este aparelho.':'Push aguarda configuração do servidor e do aplicativo.');if(ready&&(await PushNotifications.checkPermissions()).receive==='granted')await PushNotifications.register()}catch{notice('Push aguarda configuração do servidor e do aplicativo.')}
}
export async function enablePush(){
 if(!user||!ready)throw new Error('Push aguarda Firebase/APNs, migração e configuração no servidor.')
 const permission=await PushNotifications.requestPermissions()
 if(permission.receive!=='granted')throw new Error('Permissão não concedida. Você pode alterá-la nas configurações do aparelho.')
 await PushNotifications.register()
}
export async function disablePush(){
 if(!user||!ready)return
 await request('disable',{platform:Capacitor.getPlatform()});await PushNotifications.unregister();notice('Notificações desativadas neste aparelho.')
}
