import {encryptionKey,encryptCredential,decryptCredential} from './credentials.mjs'
export {encryptCredential,decryptCredential} from './credentials.mjs'
import {integrationService,reconcileAsaas} from './asaas.mjs'
import {randomBytes,randomUUID} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {HttpError,bodyJSON,enforceOrigin,json,throttle} from './security.mjs'
import {checked,validatedSession,requireRecent} from './identity.mjs'
import {discoverResources,providerConfig,syncProvider,dateRange} from './integration-providers.mjs'
import {integrationReadiness,requireIntegrationReadiness} from './integration-status.mjs'
export async function integrationActions(req,res,config,context,action){
 const user=await validatedSession(context)
 if(action==='status'){
  if(req.method!=='GET')throw new HttpError(405,'METHOD_NOT_ALLOWED','Método não permitido.')
  const workspace=new URL(req.url,config.origin).searchParams.get('workspace_id')||''
  const scope=checked(await context.client.rpc('eg_holding_context'))
  if(!scope.companies?.some(c=>c.id===workspace&&c.admin))throw new HttpError(403,'INTEGRATION_DENIED','Administrador da empresa necessário.')
  context.commit();return json(res,200,integrationReadiness(config))
 }
 if(req.method!=='POST')throw new HttpError(405,'METHOD_NOT_ALLOWED','Método não permitido.')
 enforceOrigin(req,config);requireRecent(user);const body=await bodyJSON(req,40000);await throttle(req,config,'integration-'+action,user.user.id,{ip:40,account:12})
 const workspace=String(body.workspace_id||'')
 const scope=checked(await context.client.rpc('eg_holding_context'))
 if(!scope.companies?.some(c=>c.id===workspace&&c.admin))throw new HttpError(403,'INTEGRATION_DENIED','Administrador da empresa necessário.')
 if(['discover','connect','sync'].includes(action))requireIntegrationReadiness(config)
 if(action==='discover'){
 const provider=body.provider,cfg=providerConfig(provider,body.config);if(typeof body.token!=='string'||body.token.length<12||body.token.length>16000)throw new HttpError(400,'CREDENTIAL_REQUIRED','Informe uma credencial de leitura válida.')
 const data=await discoverResources(provider,body.token,cfg);context.commit();return json(res,200,data)
 }
 if(action==='connect'){
 const provider=body.provider,cfg=providerConfig(provider,body.config)
 const existing=checked(await context.client.from('eg_integrations').select('id,provider,resource_id,application_id,config').eq('workspace_id',workspace))
 const match=existing.find(i=>i.provider===provider&&i.resource_id===body.resource_id&&i.application_id===body.application_id&&(i.config?.environment||'')===(cfg.environment||''))
 const id=match?.id||randomUUID()
 if(typeof body.token!=='string'||body.token.length<12||body.token.length>16000)throw new HttpError(400,'CREDENTIAL_REQUIRED','Informe uma credencial válida.')
 encryptionKey(config.env)
 const resources=await discoverResources(provider,body.token,cfg)
 if(!resources.resources.some(r=>r.id===body.resource_id))throw new HttpError(403,'RESOURCE_DENIED','Selecione um recurso retornado pela credencial autorizada.')
 const aad=id+':'+workspace+':'+provider,webhookToken=provider==='asaas'?randomBytes(32).toString('base64url'):null
 const credential=provider==='asaas'?JSON.stringify({apiToken:body.token,webhookToken}):body.token
 checked(await context.client.rpc('eg_integration_manage',{p_workspace:workspace,p_action:'save',p_data:{id,provider,application_id:body.application_id,resource_id:body.resource_id,label:String(body.label||provider).slice(0,120),config:cfg,ciphertext:encryptCredential(credential,aad,config.env)}}))
 context.commit();return json(res,200,{id,state:'pending',...(webhookToken?{webhookToken,webhookUrl:config.origin+'/api/webhooks/asaas/'+id}:{})})
 }
 if(action==='sync'){
 const integration=checked(await context.client.rpc('eg_integration_manage',{p_workspace:workspace,p_action:'credential',p_data:{id:body.id}}))
 if(integration.provider==='asaas'){const service=integrationService(config),credential=decryptCredential(integration.ciphertext,integration.id+':'+workspace+':asaas',config.env);const result=await reconcileAsaas(integration,credential,service,Number(body.offset||0));context.commit();return json(res,200,result)}
 dateRange(body.from,body.to)
 const serviceKey=config.env.INTEGRATIONS_STORAGE_SERVICE_KEY
 if(!serviceKey)throw new HttpError(503,'INTEGRATION_CONFIGURATION','A persistência segura das métricas precisa ser configurada no servidor.')
 const service=createClient(config.url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
 const token=decryptCredential(integration.ciphertext,integration.id+':'+workspace+':'+integration.provider,config.env)
 try{const payload=await syncProvider(integration,token,body.from,body.to)
 checked(await service.rpc('eg_integration_commit',{p_id:integration.id,p_from:body.from,p_to:body.to,p_payload:payload,p_error:null}));context.commit();return json(res,200,{synced:true})
 }catch(error){await service.rpc('eg_integration_commit',{p_id:integration.id,p_from:body.from,p_to:body.to,p_payload:{},p_error:'Não foi possível sincronizar esta fonte. Confira permissões, instrumentação e período.'});throw error}
 }
 if(action==='disable'){checked(await context.client.rpc('eg_integration_manage',{p_workspace:workspace,p_action:'disable',p_data:{id:body.id}}));context.commit();return json(res,200,{disabled:true})}
 throw new HttpError(404,'INTEGRATION_ACTION','Ação de integração indisponível.')
}
