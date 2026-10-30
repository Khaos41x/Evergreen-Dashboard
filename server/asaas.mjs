import {createHash,timingSafeEqual} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {HttpError,bodyJSON,json,throttle} from './security.mjs'
import {checked} from './identity.mjs'
import {decryptCredential} from './credentials.mjs'
export function asaasEnvironment(environment){if(!['sandbox','production'].includes(environment))throw new HttpError(400,'ASAAS_ENVIRONMENT','Selecione explicitamente o ambiente Asaas.');return environment==='production'?'https://api.asaas.com/v3':'https://api-sandbox.asaas.com/v3'}
export async function asaasJSON(path,token,environment,fetcher=fetch){
 if(!/^\/(?:wallets\/?|payments(?:\/[A-Za-z0-9_-]+)?(?:\?[A-Za-z0-9_.%=&-]+)?)$/.test(path))throw new HttpError(403,'ASAAS_TARGET','Recurso Asaas não autorizado.')
 let response;try{response=await fetcher(asaasEnvironment(environment)+path,{headers:{access_token:token,'User-Agent':'Evergreen/1.0',accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)})}catch{throw new HttpError(502,'ASAAS_NETWORK','Não foi possível consultar o Asaas.')}
 if(!response.ok)throw new HttpError(response.status===429?429:502,'ASAAS_API','O Asaas não disponibilizou os dados. Verifique ambiente, permissões e limites.');const text=await response.text();if(text.length>2097152)throw new HttpError(413,'ASAAS_LIMIT','Reduza o tamanho da consulta.');try{return JSON.parse(text.replace(/(?<!\\)"(value|netValue)"\s*:\s*(\d+(?:\.\d+)?)(?=\s*[,}])/g,'"$1":"$2"'))}catch{throw new HttpError(502,'ASAAS_RESPONSE','Resposta Asaas inválida.')}
}
// No arithmetic is performed in floating point. JSON numbers are converted to their decimal representation first.
export function decimalCents(value){const raw=String(value??'');if(!/^\d{1,14}(?:\.\d{1,2})?$/.test(raw))throw new HttpError(502,'ASAAS_AMOUNT','A fonte retornou um valor monetário inválido.');const[w,p='']=raw.split('.');const n=BigInt(w)*100n+BigInt(p.padEnd(2,'0'));if(n>9000000000000000n)throw new HttpError(502,'ASAAS_AMOUNT','Valor da fonte fora do limite.');return n.toString()}
function date(value){const d=String(value||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))?d:null}
export function normalizePayment(p,observedAt=new Date().toISOString()){
 if(!/^pay_[A-Za-z0-9_-]{1,100}$/.test(p?.id||'')||!p.status)throw new HttpError(502,'ASAAS_PAYMENT','Cobrança Asaas inválida.')
 const gross=decimalCents(p.value),net=p.netValue===null||p.netValue===undefined?null:decimalCents(p.netValue)
 const refunds=(p.refunds||[]).filter(r=>r.status==='DONE').map(r=>({date:date(r.dateCreated),cents:decimalCents(r.value)}));const refunded=refunds.reduce((n,r)=>n+BigInt(r.cents),0n);if(refunded>BigInt(gross))throw new HttpError(502,'ASAAS_REFUND','Reembolsos da fonte excedem a cobrança.')
 return{id:p.id,observed_at:observedAt,status:String(p.status).slice(0,80),gross_cents:gross,net_cents:net,refund_cents:refunded.toString(),refunds,confirmed_on:date(p.confirmedDate)||date(p.paymentDate)||date(p.clientPaymentDate),received_on:date(p.paymentDate),created_on:date(p.dateCreated),due_on:date(p.dueDate),external_reference:p.externalReference?String(p.externalReference).slice(0,100):null,has_split:Array.isArray(p.split)&&p.split.length>0}
}
export function validWebhookToken(value,expected){if(typeof value!=='string'||typeof expected!=='string'||expected.length<32||value.length>1000)return false;return timingSafeEqual(createHash('sha256').update(value).digest(),createHash('sha256').update(expected).digest())}
export function integrationService(config){if(!config.env.INTEGRATIONS_STORAGE_SERVICE_KEY)throw new HttpError(503,'INTEGRATION_CONFIGURATION','Configure a persistência segura das integrações no servidor.');return createClient(config.url,config.env.INTEGRATIONS_STORAGE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})}
export async function reconcileAsaas(integration,credential,service,offset=0,fetcher=fetch){
 if(!Number.isInteger(offset)||offset<0||offset>1000000)throw new HttpError(400,'ASAAS_CURSOR','Página de conciliação inválida.')
 const environment=integration.config.environment,token=JSON.parse(credential).apiToken
 const batch=await asaasJSON('/payments?limit=20&offset='+offset,token,environment,fetcher)
 if(!Array.isArray(batch.data))throw new HttpError(502,'ASAAS_RESPONSE','A lista de cobranças não foi retornada.')
 // Fetch the current state for each item. Webhooks and reconciliation use the same row and idempotent upsert.
 for(let start=0;start<batch.data.length;start+=4)await Promise.all(batch.data.slice(start,start+4).map(async listed=>{const observedAt=new Date().toISOString(),current=normalizePayment(await asaasJSON('/payments/'+listed.id,token,environment,fetcher),observedAt);checked(await service.rpc('eg_asaas_store',{p_id:integration.id,p_payment:current,p_event:null}))}))
 checked(await service.rpc('eg_asaas_checkpoint',{p_id:integration.id,p_next:batch.hasMore?offset+batch.data.length:null}))
 return{processed:batch.data.length,next:batch.hasMore?offset+batch.data.length:null,complete:!batch.hasMore}
}
export async function asaasWebhook(req,res,config,id){
 if(req.method!=='POST')throw new HttpError(405,'METHOD_NOT_ALLOWED','Método não permitido.');if(!/^[0-9a-f-]{36}$/.test(id))throw new HttpError(404,'NOT_FOUND','Webhook indisponível.')
 await throttle(req,config,'asaas-webhook',id,{ip:300,account:600})
 const service=integrationService(config),integration=checked(await service.rpc('eg_asaas_credentials',{p_id:id}))
 const credential=JSON.parse(decryptCredential(integration.ciphertext,id+':'+integration.workspace_id+':asaas',config.env))
 if(!validWebhookToken(req.headers['asaas-access-token'],credential.webhookToken))throw new HttpError(401,'WEBHOOK_AUTH','Autenticação do webhook inválida.')
 const event=await bodyJSON(req,131072);if(!/^evt_[A-Za-z0-9_-]{1,150}$/.test(event.id||'')||!/^PAYMENT_[A-Z_]+$/.test(event.event||'')||!/^pay_[A-Za-z0-9_-]{1,100}$/.test(event.payment?.id||''))throw new HttpError(400,'WEBHOOK_EVENT','Evento de cobrança inválido.')
 // Asaas authenticates with a shared token, not an HMAC signature. Ignore financial values in the webhook and reread the official API.
 const observedAt=new Date().toISOString(),payment=normalizePayment(await asaasJSON('/payments/'+event.payment.id,credential.apiToken,integration.config.environment),observedAt)
 checked(await service.rpc('eg_asaas_store',{p_id:id,p_payment:payment,p_event:event.id}));return json(res,200,{received:true})
}
export async function scheduledReconciliation(req,res,config){
 if(req.method!=='GET')throw new HttpError(405,'METHOD_NOT_ALLOWED','Método não permitido.')
 if(!validWebhookToken(String(req.headers.authorization||'').replace(/^Bearer /,''),config.env.CRON_SECRET))throw new HttpError(401,'CRON_AUTH','Agendamento não autorizado.')
 const service=integrationService(config),due=checked(await service.rpc('eg_asaas_due')),results=await Promise.allSettled(due.map(async item=>{const i=checked(await service.rpc('eg_asaas_credentials',{p_id:item.id})),credential=decryptCredential(i.ciphertext,i.id+':'+i.workspace_id+':asaas',config.env);return reconcileAsaas(i,credential,service,item.offset)}))
 const failed=results.filter(r=>r.status==='rejected').length;return json(res,failed?503:200,{processed:results.length-failed,failed})
}
