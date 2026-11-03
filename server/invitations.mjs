import {timingSafeEqual} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {HttpError,json} from './security.mjs'
import {validatedSession,checked} from './identity.mjs'
export function invitationEmailReady(env){return env.INVITATION_EMAIL_ENABLED==='true'&&!!env.RESEND_API_KEY&&!!env.INVITATION_EMAIL_FROM}
export async function deliverInvitation(config,job,fetcher=fetch){
 if(!invitationEmailReady(config.env))throw new HttpError(503,'EMAIL_NOT_CONFIGURED','O envio de e-mail ainda não está configurado.')
 const link=new URL('/?invite='+encodeURIComponent(job.token),config.origin)
 const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+config.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'evergreen-invite/'+job.invitation_id+'/'+job.revision},body:JSON.stringify({from:config.env.INVITATION_EMAIL_FROM,to:[job.email],subject:'Convite para '+String(job.company).slice(0,80),text:`${job.inviter||'Uma pessoa da equipe'} convidou você para ${job.company} no Evergreen.\n\nAbra ${link.href}\n\nEntre ou crie sua conta com o endereço que recebeu este convite e confirme seu e-mail. A participação só será concedida após o aceite. Se não reconhece o convite, ignore este e-mail.`}),redirect:'error',signal:AbortSignal.timeout(15000)})
 if(!response.ok)throw new HttpError(502,'EMAIL_NOT_CONFIRMED','O serviço não confirmou o envio do convite.')
 const data=await response.json()
 if(typeof data.id!=='string'||!/^[a-f0-9-]{36}$/i.test(data.id))throw new HttpError(502,'EMAIL_NOT_CONFIRMED','O serviço não confirmou o envio do convite.')
 return data.id
}
export async function invitationConfig(req,res,config,context){
 await validatedSession(context)
 if(req.method!=='GET')throw new HttpError(405,'METHOD_NOT_ALLOWED','Método não permitido.')
 context.commit();return json(res,200,{email:invitationEmailReady(config.env),manualLink:true})
}
export async function dispatchInvitations(req,res,config,dependencies={}){
 if(req.method!=='POST')throw new HttpError(405,'METHOD_NOT_ALLOWED','Método não permitido.')
 const expected=String(config.env.CRON_SECRET||''),actual=String(req.headers.authorization||'').replace(/^Bearer /,'')
 if(expected.length<32||actual.length!==expected.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(actual)))throw new HttpError(401,'SCHEDULER_DENIED','Acesso não autorizado.')
 const key=config.env.INVITATION_SERVICE_KEY||config.env.NATIVE_PUSH_SERVICE_KEY
 if(!key&&!dependencies.client)throw new HttpError(503,'INVITATIONS_NOT_CONFIGURED','O processamento de convites aguarda configuração segura do servidor.')
 const client=dependencies.client||createClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const expired=checked(await client.rpc('eg_expire_company_invites'))
 if(!invitationEmailReady(config.env))return json(res,200,{expired,email:'not_configured',sent:0})
 const jobs=checked(await client.rpc('eg_claim_invitation_deliveries',{p_limit:2}));let sent=0,failed=0
 for(const job of jobs){
  // Failed provider calls and failed DB acknowledgements are distinct. Do not turn
  // a confirmed send into a failure when its acknowledgement must be retried.
  let id
  try{id=await deliverInvitation(config,job,dependencies.fetcher)}catch{
   checked(await client.rpc('eg_complete_invitation_delivery',{p_job:job.id,p_lease:job.lease_id,p_provider:null}));failed++;continue
  }
  checked(await client.rpc('eg_complete_invitation_delivery',{p_job:job.id,p_lease:job.lease_id,p_provider:id}));sent++
 }
 return json(res,200,{expired,sent,failed})
}
