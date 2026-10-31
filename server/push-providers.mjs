import {createSign} from 'node:crypto'
import {connect} from 'node:http2'
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url')
export function signedJWT(header,claims,key,ec=false){const raw=encode(header)+'.'+encode(claims),signer=createSign('SHA256');signer.update(raw);return raw+'.'+signer.sign(ec?{key,dsaEncoding:'ieee-p1363'}:key).toString('base64url')}
export function pushReady(env,platform){return env.NATIVE_PUSH_ENABLED==='true'&&!!env.NATIVE_PUSH_SERVICE_KEY&&!!env.INTEGRATIONS_ENCRYPTION_KEY&&!!env.CRON_SECRET&&(platform==='android'?!!env.FCM_SERVICE_ACCOUNT_JSON:!!env.APNS_KEY_ID&&!!env.APNS_TEAM_ID&&!!env.APNS_PRIVATE_KEY&&['production','sandbox'].includes(env.APNS_ENVIRONMENT))}
export async function sendAndroid(env,token,id,fetcher=fetch){
 const account=JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON),now=Math.floor(Date.now()/1000)
 const assertion=signedJWT({alg:'RS256',typ:'JWT'},{iss:account.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+300},account.private_key)
 const auth=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(10000)});const credentials=await auth.json();if(!auth.ok||!credentials.access_token)throw new Error('FCM_AUTH_UNAVAILABLE')
 if(!/^[a-z0-9-]+$/.test(account.project_id))throw new Error('FCM_PROJECT_INVALID')
 const r=await fetcher('https://fcm.googleapis.com/v1/projects/'+account.project_id+'/messages:send',{method:'POST',headers:{Authorization:'Bearer '+credentials.access_token,'content-type':'application/json'},body:JSON.stringify({message:{token,notification:{title:'Evergreen',body:'Você tem uma nova atualização no seu espaço de trabalho.'},data:{path:'/hub',notificationId:id},android:{collapse_key:id,notification:{tag:id}}}}),signal:AbortSignal.timeout(10000)})
 if(!r.ok)throw new Error(r.status===404?'PUSH_DEVICE_INVALID':'FCM_SEND_UNAVAILABLE')
}
export async function sendApple(env,token,id){
 if(!/^[a-f0-9]{32,512}$/i.test(token))throw new Error('PUSH_DEVICE_INVALID')
 const jwt=signedJWT({alg:'ES256',kid:env.APNS_KEY_ID},{iss:env.APNS_TEAM_ID,iat:Math.floor(Date.now()/1000)},env.APNS_PRIVATE_KEY.replaceAll('\\n','\n'),true)
 await new Promise((resolve,reject)=>{
  const client=connect(env.APNS_ENVIRONMENT==='production'?'https://api.push.apple.com':'https://api.sandbox.push.apple.com')
  const timer=setTimeout(()=>{client.destroy();reject(new Error('APNS_TIMEOUT'))},10000)
  const finish=error=>{clearTimeout(timer);client.close();error?reject(error):resolve()};client.on('error',()=>finish(new Error('APNS_NETWORK')))
  const request=client.request({':method':'POST',':path':'/3/device/'+token,authorization:'bearer '+jwt,'apns-topic':'com.evergreen.holdings','apns-push-type':'alert','apns-priority':'10','apns-collapse-id':id,'apns-expiration':String(Math.floor(Date.now()/1000)+3600)})
  request.on('response',headers=>{request.resume();request.on('end',()=>finish(headers[':status']===200?null:new Error([400,410].includes(headers[':status'])?'PUSH_DEVICE_INVALID':'APNS_SEND_UNAVAILABLE'))) });request.on('error',()=>finish(new Error('APNS_NETWORK')))
  request.end(JSON.stringify({aps:{alert:{title:'Evergreen',body:'Você tem uma nova atualização no seu espaço de trabalho.'},sound:'default'},path:'/hub',notificationId:id}))
 })
}
