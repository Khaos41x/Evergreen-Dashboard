// BFF integration with a LOCAL Supabase HTTP fixture. Not provider E2E.
import {createServer} from 'node:http'
import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {mkdirSync,writeFileSync} from 'node:fs'
import {createHandler} from '../server/app.mjs'
import {cookieOptions,settings,safeNext} from '../server/security.mjs'
const checks=[],user={id:'00000000-0000-4000-8000-000000000001',email:'identity@test.invalid',user_metadata:{display_name:'Alice',job_title:'Diretora'},aud:'authenticated',role:'authenticated',created_at:new Date().toISOString()}
let active=true,recent=true,recoveryProof=false,founder=false,requests=[],pkceChallenge='',lastVerifier=''
const jwt=()=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,session_id:randomUUID(),amr:[{method:'otp',timestamp:Math.floor(Date.now()/1000)}]})).toString('base64url')+'.fixture-signature'
const token=()=>({access_token:jwt(),refresh_token:'fixture-refresh-'+randomUUID(),expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})
const provider=createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;let body={};try{body=JSON.parse(raw||'{}')}catch{}const url=new URL(req.url,'http://fixture');requests.push({path:url.pathname,query:url.search,body,headers:req.headers});res.setHeader('content-type','application/json')
if(url.pathname==='/auth/v1/user')return res.end(JSON.stringify(user))
if(url.pathname==='/auth/v1/token'){if(url.searchParams.get('grant_type')==='pkce'){lastVerifier=body.code_verifier;if(createHash('sha256').update(lastVerifier).digest('base64url')!==pkceChallenge){res.statusCode=400;return res.end('{"error":"pkce_failed"}')}}return res.end(JSON.stringify(token()))}
if(url.pathname==='/auth/v1/verify'){if(body.token==='000000'){res.statusCode=400;return res.end(JSON.stringify({code:'otp_expired',message:'Code expired'}))}return res.end(JSON.stringify(token()))}
if(url.pathname==='/auth/v1/passkeys/registration/options')return res.end(JSON.stringify({challenge_id:'fixture-registration',options:{challenge:'fixture'}}))
if(url.pathname==='/auth/v1/passkeys/registration/verify')return res.end(JSON.stringify({id:'fixture-key'}))
if(url.pathname==='/auth/v1/passkeys/authentication/options')return res.end(JSON.stringify({challenge_id:'fixture-authentication',options:{challenge:'fixture'}}))
if(url.pathname==='/auth/v1/passkeys/authentication/verify')return res.end(JSON.stringify(token()))
if(url.pathname==='/auth/v1/passkeys')return res.end('[{"id":"fixture-key"}]')
if(url.pathname.startsWith('/auth/v1/passkeys/'))return res.end('{"id":"fixture-key","friendly_name":"Device"}')
if(url.pathname==='/auth/v1/signup')return res.end(JSON.stringify(user))
if(url.pathname==='/auth/v1/recover')return res.end('{}')
if(url.pathname==='/auth/v1/otp')return res.end('{}')
if(url.pathname==='/auth/v1/logout'){if(!url.search.includes('others'))active=false;return res.end('{}')}
if(url.pathname.endsWith('/eg_identity_context'))return res.end(JSON.stringify({active,recent_auth:recent,password_recovery:recoveryProof,session_id:'fixture-id',profile:{display_name:'Alice',job_title:'Diretora'},workspaces:[{id:'w-fixture',name:'Holding',role:'owner'}]}))
if(url.pathname.endsWith('/eg_create_workspace'))return res.end(JSON.stringify('workspace-created-fixture'))
if(url.pathname.endsWith('/eg_identity_bootstrap'))return res.end('null')
if(url.pathname.endsWith('/eg_identity_check_invite'))return res.end(JSON.stringify(body.p_invite==='11111111-1111-4111-8111-111111111111'))
if(url.pathname.endsWith('/eg_identity_sessions'))return res.end('[]')
if(url.pathname.endsWith('/eg_founders_access'))return res.end(JSON.stringify(founder))
if(url.pathname.startsWith('/rest/v1/eg_'))return res.end('[{"id":"scoped-fixture"}]')
res.statusCode=404;res.end('{"message":"Fixture unsupported endpoint"}')})
await new Promise(resolve=>provider.listen(0,'127.0.0.1',resolve));const providerOrigin='http://127.0.0.1:'+provider.address().port
const env={NODE_ENV:'development',APP_ORIGIN:'http://127.0.0.1:5198',SUPABASE_URL:providerOrigin,SUPABASE_PUBLISHABLE_KEY:'fixture-public-key',GOOGLE_AUTH_ENABLED:'true',PASSKEY_AUTH_ENABLED:'true'}
const app=createServer(createHandler(env,{indexHTML:async()=>'<html>PRIVATE_FIXTURE</html>'}))
await new Promise(resolve=>app.listen(5198,'127.0.0.1',resolve))
const base=env.APP_ORIGIN,jar=new Map()
async function call(path,body,options={}){const headers={...(body===undefined?{}:{'content-type':'application/json',origin:base}),cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...options.headers};const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});if(options.cookies!==false)for(const raw of response.headers.getSetCookie()){const first=raw.split(';')[0],i=first.indexOf('=');if(/max-age=0/i.test(raw))jar.delete(first.slice(0,i));else jar.set(first.slice(0,i),first.slice(i+1))}const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=text}return{response,data,text}}
try{
 let r=await call('/api/identity/session');assert.equal(r.response.status,401)
 r=await call('/api/page?view=economy');assert.equal(r.response.status,303);assert.equal(r.response.headers.get('location'),'/login?next=%2Feconomy')
 const count=requests.length;r=await call('/api/identity/password',{email:user.email,password:'fixture-only'},{headers:{origin:'https://evil.invalid'}});assert.equal(r.response.status,403);assert.equal(requests.length,count)
 checks.push('server private-page redirect and Origin/JSON CSRF rejection before provider call')
 r=await call('/api/identity/google',{next:'https://evil.invalid',invite:'11111111-1111-4111-8111-111111111111'})
 assert.equal(r.response.status,200);const oauth=new URL(r.data.url);pkceChallenge=oauth.searchParams.get('code_challenge');assert.ok(pkceChallenge);assert.equal(oauth.searchParams.get('code_challenge_method'),'s256')
 assert.ok(r.response.headers.getSetCookie().every(x=>/HttpOnly/i.test(x)&&/SameSite=Lax/i.test(x)));assert.ok([...jar.keys()].some(x=>x.includes('code-verifier')))
 r=await call('/api/identity/callback?code=fixture-single-code');assert.equal(r.response.status,303,JSON.stringify(r.data));assert.equal(r.response.headers.get('location'),'/');assert.ok(lastVerifier.length>20)
 checks.push('official SDK OAuth code + S256 PKCE with HttpOnly verifier; callback exchanges server-side')
 r=await call('/api/identity/session');assert.equal(r.response.status,200);assert.equal(r.data.session.user.user_metadata.job_title,'Diretora');assert.ok(!/access_token|refresh_token|fixture-refresh/.test(r.text))
 const sessionCookies=r.response.headers.getSetCookie();const authCookie=[...jar.keys()].find(x=>x==='eg-auth'||x==='eg-auth.0');assert.ok(authCookie)
 assert.deepEqual(cookieOptions(settings({...env,NODE_ENV:'production',APP_ORIGIN:'https://evergreen.example',SUPABASE_URL:'https://project.supabase.co'})).secure,true)
 assert.equal(safeNext('//evil.invalid'),'/');assert.equal(safeNext('/economy'),'/economy')
 checks.push('browser receives public identity only; production Secure, HttpOnly, Lax cookies and redirect allowlist')
 r=await call('/api/backend?path='+encodeURIComponent('/rest/v1/eg_records?select=id'))
 assert.equal(r.response.status,200);const backend=requests.at(-1);assert.ok(backend.headers.authorization.startsWith('Bearer '));assert.equal(backend.headers.apikey,'fixture-public-key')
 r=await call('/api/backend?path='+encodeURIComponent('https://evil.invalid/rest/v1/eg_records'));assert.equal(r.response.status,403)
 recent=false;r=await call('/api/backend?path='+encodeURIComponent('/rest/v1/rpc/eg_economy_action'),{p_action:'expense'});assert.equal(r.response.status,428);recent=true
 checks.push('fixed upstream BFF proxy adds user JWT server-side; external targets and stale financial actions denied')
 r=await call('/api/page?view=founders');assert.equal(r.response.status,403);founder=true;r=await call('/api/page?view=founders');assert.equal(r.response.status,200);assert.ok(r.text.includes('PRIVATE_FIXTURE'))

 r=await call('/api/identity/signup',{email:'normal@test.invalid',password:'normal-fixture-strong',name:'Pessoa nova',job_title:'Analista',timezone:'UTC'});assert.equal(r.response.status,200);assert.equal(r.data.pendingConfirmation,true);
 const signup=requests.findLast(x=>x.path==='/auth/v1/signup');assert.equal(signup.body.password,'normal-fixture-strong');assert.equal(signup.body.data.job_title,'Analista');assert.ok(!('evergreen_invite' in signup.body.data));assert.ok(!/access_token|refresh_token/.test(r.text));
 r=await call('/api/identity/signup',{email:'normal@test.invalid',password:'short',name:'Pessoa nova'});assert.equal(r.response.status,400);
 r=await call('/api/identity/create-workspace',{name:'Minha equipe'});assert.equal(r.response.status,200);assert.equal(requests.findLast(x=>x.path.endsWith('/eg_create_workspace')).body.p_name,'Minha equipe');
 checks.push('normal email/password signUp without invitation, bounded profile metadata, password policy and isolated workspace bootstrap');
 r=await call('/api/identity/recover',{email:user.email});assert.equal(r.response.status,200);
 const recover=requests.findLast(x=>x.path==='/auth/v1/recover');pkceChallenge=recover.body.code_challenge;assert.ok(pkceChallenge);assert.equal(recover.body.code_challenge_method,'s256');
 r=await call('/api/identity/callback?code=fixture-recovery-code');assert.equal(r.response.status,303);assert.equal(r.response.headers.get('location'),'/login?recovery=1');
 recent=false;r=await call('/api/identity/update-password',{password:'new-fixture-password'});assert.equal(r.response.status,428);
 recoveryProof=true;r=await call('/api/identity/update-password',{password:'new-fixture-password'});assert.equal(r.response.status,200);
 assert.ok(requests.some(x=>x.path==='/auth/v1/user'&&x.body.password==='new-fixture-password'));assert.ok(requests.some(x=>x.path==='/auth/v1/logout'&&x.query.includes('others')));
 recoveryProof=false;recent=true;
 checks.push('official recovery PKCE callback, fresh proof required for password update, other devices revoked, no credentials returned');
 r=await call('/api/identity/email',{email:user.email,reauth:true});assert.equal(r.response.status,200)
 r=await call('/api/identity/verify-email',{email:user.email,code:'123456',reauth:true});assert.equal(r.response.status,200)
 r=await call('/api/identity/verify-email',{email:user.email,code:'123456',reauth:true});assert.equal(r.response.status,403)
 checks.push('email step-up bound to current account and expiring one-time flow cookie')
 const retryBefore=requests.length
 r=await call('/api/identity/email',{email:user.email,reauth:true});assert.equal(r.response.status,200)
 const flowCookie=[...jar.keys()].find(k=>k==='eg-flow-user');assert.ok(flowCookie)
 // Provider rejection must not consume the app's invitation/step-up context.
 const saved=jar.get(flowCookie);r=await call('/api/identity/verify-email',{email:user.email,code:'000000',reauth:true})
 assert.equal(r.response.status,400);assert.equal(jar.get(flowCookie),saved)
 r=await call('/api/identity/verify-email',{email:user.email,code:'123456',reauth:true});assert.equal(r.response.status,200)
 checks.push('bad OTP preserves invitation and same-user step-up context for retry')
 // Native passkey payloads are passed to the provider, not verified by a fake BFF.
 r=await call('/api/identity/passkey/register/start',{});assert.equal(r.response.status,200)
 r=await call('/api/identity/passkey/register/verify',{challengeId:'fixture-registration',credential:{id:'fixture-key',type:'public-key',response:{attestationObject:'fixture'}}});assert.equal(r.response.status,200)
 r=await call('/api/identity/passkey/list',{});assert.equal(r.data.passkeys[0].id,'fixture-key')
 r=await call('/api/identity/passkey/update',{id:'fixture-key',name:'Device'});assert.equal(r.response.status,200)
 r=await call('/api/identity/passkey/auth/start',{});assert.equal(r.response.status,200)
 r=await call('/api/identity/passkey/auth/verify',{challengeId:'fixture-authentication',credential:{id:'fixture-key',type:'public-key',response:{signature:'fixture'}},reauth:true});assert.equal(r.response.status,200)
 r=await call('/api/identity/passkey/delete',{id:'fixture-key'});assert.equal(r.response.status,200)
 const native=requests.slice(retryBefore).filter(x=>x.path.includes('/passkeys/'));assert.ok(native.some(x=>x.path==='/auth/v1/passkeys/registration/verify'&&x.body.challenge_id==='fixture-registration'));assert.ok(native.some(x=>x.path==='/auth/v1/passkeys/authentication/verify'));assert.ok(native.filter(x=>!x.path.includes('/authentication/')).every(x=>x.headers.authorization?.startsWith('Bearer ')))
 checks.push('native Supabase passkey registration/authentication/list/update/delete transport; cryptographic provider proof remains NOT_VERIFIED')
 const beforeRaw=requests.length
 const rawResponse=await fetch(base+'/api/identity/email',{method:'POST',headers:{origin:base,'content-type':'text/plain'},body:'{}'});assert.equal(rawResponse.status,415);assert.equal(beforeRaw,requests.length)
 recent=false;r=await call('/api/identity/passkey/register/start',{});assert.equal(r.response.status,428);recent=true
 checks.push('non-JSON requests rejected and passkey management requires fresh provider authentication')
 const prodApp=createServer(createHandler({...env,NODE_ENV:'production',APP_ORIGIN:'https://evergreen.example',SUPABASE_URL:'https://project.supabase.co'}))
 await new Promise(resolve=>prodApp.listen(0,'127.0.0.1',resolve))
 try{const res=await fetch('http://127.0.0.1:'+prodApp.address().port+'/api/identity/email',{method:'POST',headers:{origin:'https://evergreen.example','content-type':'application/json','x-vercel-forwarded-for':'192.0.2.15'},body:JSON.stringify({email:user.email})});assert.equal(res.status,503)}finally{prodApp.closeAllConnections();await new Promise(r=>prodApp.close(r))}
 checks.push('production authentication fails closed without distributed limiter configuration')
 let limited=false;for(let i=0;i<9;i++){r=await call('/api/identity/email',{email:'rate@test.invalid'});if(r.response.status===429)limited=true}assert.ok(limited)
 checks.push('real local limiter rejects repeated requests; production distributed limiter configured separately')
 active=false;r=await call('/api/identity/session');assert.equal(r.response.status,401)
 r=await call('/api/backend?path='+encodeURIComponent('/rest/v1/eg_records'));assert.equal(r.response.status,401)
 checks.push('revoked provider-session context clears cookies and denies proxy')
 mkdirSync('output/platform',{recursive:true});writeFileSync('output/platform/identity-results.json',JSON.stringify({environment:'Local HTTP Auth/REST fixture, official Supabase SDK. Google/passkeys/email providers NOT_VERIFIED',checks},null,2));console.log(JSON.stringify({passed:checks.length,checks},null,2))
}finally{app.closeAllConnections();provider.closeAllConnections();await Promise.all([new Promise(r=>app.close(r)),new Promise(r=>provider.close(r))])}
