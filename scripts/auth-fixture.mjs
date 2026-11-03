// LOCAL provider double: exercises the real SDK/BFF, not Supabase server internals.
import {createServer} from 'node:http'
import {randomUUID,randomBytes} from 'node:crypto'
export async function authFixture(){
 const users=new Map(),sessions=new Map(),outbox=[],requests=[],pendingApprovals=[],decisions=[],used=new Set()
 let failBootstrap=false,failMail=false
 const userView=u=>({id:u.id,email:u.email,email_confirmed_at:u.confirmed?new Date().toISOString():null,user_metadata:u.metadata,aud:'authenticated',role:'authenticated',created_at:new Date().toISOString()})
 const issue=u=>{
  const sid=randomUUID(),payload={sub:u.id,exp:Math.floor(Date.now()/1000)+3600,session_id:sid,amr:[{method:'otp',timestamp:Math.floor(Date.now()/1000)}]}
  const access_token=Buffer.from('{"alg":"HS256"}').toString('base64url')+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.local-fixture-signature'
  const refresh_token=randomUUID();sessions.set(access_token,{user:u,refresh_token,sid})
  return {access_token,refresh_token,expires_in:3600,expires_at:payload.exp,token_type:'bearer',user:userView(u)}
 }
 const mail=(u,type,redirect)=>{const item={email:u.email,type,code:String(100000+outbox.length),token_hash:randomBytes(32).toString('hex'),redirect,expired:false};outbox.push(item);return item}
 const server=createServer(async(req,res)=>{
  let raw='';for await(const c of req)raw+=c
  const body=JSON.parse(raw||'{}'),url=new URL(req.url,'http://fixture'),current=sessions.get((req.headers.authorization||'').replace('Bearer ',''))
  requests.push({path:url.pathname,method:req.method,redirect:url.searchParams.get('redirect_to')})
  res.setHeader('content-type','application/json');res.setHeader('x-supabase-api-version','2024-01-01')
  const ok=data=>res.end(JSON.stringify(data)),bad=(code,status=400)=>{res.statusCode=status;ok({code,message:'Provider detail must not leak '+code})}
  const email=String(body.email||'').toLowerCase(),u=users.get(email)
  if(url.pathname==='/auth/v1/signup'){
   if(u)return ok({...userView(u),identities:[]})
   const next={id:randomUUID(),email,password:body.password,confirmed:false,metadata:body.data,workspaces:[],profile:false};users.set(email,next);mail(next,'signup',url.searchParams.get('redirect_to'));return ok(userView(next))
  }
  if(['/auth/v1/resend','/auth/v1/recover','/auth/v1/otp'].includes(url.pathname)){
   if(failMail)return bad('over_email_send_rate_limit',429)
   if(u)mail(u,url.pathname.endsWith('resend')?'signup':url.pathname.endsWith('recover')?'recovery':'email',url.searchParams.get('redirect_to'))
   return ok({})
  }
  if(url.pathname==='/auth/v1/verify'){
   const item=outbox.findLast(m=>body.token_hash?m.token_hash===body.token_hash:m.email===email&&m.code===body.token)
   if(!item||item.expired||used.has(item.token_hash)||item.type!==body.type)return bad('otp_expired',403)
   used.add(item.token_hash);const target=users.get(item.email);target.confirmed=true;return ok(issue(target))
  }
  if(url.pathname==='/auth/v1/token'){
   if(url.searchParams.get('grant_type')==='refresh_token'){
    const old=[...sessions.values()].find(s=>s.refresh_token===body.refresh_token);return old?ok(issue(old.user)):bad('refresh_token_not_found')
   }
   if(!u||u.password!==body.password)return bad('invalid_credentials')
   if(!u.confirmed)return bad('email_not_confirmed')
   return ok(issue(u))
  }
  if(url.pathname==='/auth/v1/user'){
   if(!current)return bad('session_not_found',401)
   if(req.method==='PUT')current.user.password=body.password
   return ok(userView(current.user))
  }
  if(url.pathname==='/auth/v1/logout'){
   for(const [token,session]of sessions)if(session.user===current?.user&&(url.searchParams.get('scope')!=='others'||session!==current))sessions.delete(token)
   res.statusCode=204;return res.end()
  }
  if(!current)return bad('session_not_found',401)
  const person=current.user
  if(url.pathname.endsWith('/eg_identity_bootstrap')){
   if(failBootstrap)return bad('P0001')
   person.profile=true;return ok(null)
  }
  const onboarding=()=>({companies:[{id:'22222222-2222-4222-8222-222222222222',name:'Orkto'},{id:'33333333-3333-4333-8333-333333333333',name:'ThinkerChess'}].map(c=>({...c,relationship:null,selected_relationship:person.companyRequests?.find(r=>r.workspace_id===c.id)?.relationship||null,request_state:person.companyRequests?.some(r=>r.workspace_id===c.id)?'pending':null,member:false,suspended:false}))})
  if(url.pathname.endsWith('/eg_company_onboarding_pending'))return ok(pendingApprovals)
  if(url.pathname.endsWith('/eg_company_onboarding_review')){decisions.push(body);pendingApprovals.splice(0,pendingApprovals.length);return ok(body.p_accept?'approved':'declined')}
  if(url.pathname.endsWith('/eg_company_onboarding'))return ok(onboarding())
  if(url.pathname.endsWith('/eg_company_onboarding_submit')){person.companyRequests=body.p_companies;return ok(onboarding())}
  if(url.pathname.endsWith('/eg_identity_context'))return ok({active:true,recent_auth:true,password_recovery:true,session_id:current.sid,profile:{display_name:person.metadata.display_name,job_title:''},workspaces:person.workspaces})
  if(url.pathname.endsWith('/eg_create_workspace')){const id=randomUUID();person.workspaces.push({id,name:body.p_name,role:'owner'});return ok(id)}
  res.statusCode=404;return ok({})
 })
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 return {origin:'http://127.0.0.1:'+server.address().port,users,outbox,requests,used,pendingApprovals,decisions,setFailBootstrap:value=>failBootstrap=value,setFailMail:value=>failMail=value,close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r))}}
}
