import {createServer} from 'node:http'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {authFixture} from './auth-fixture.mjs'
import {createHandler} from '../server/app.mjs'
import {authOrigin,emailRedirect} from '../server/auth-config.mjs'
const checks=[],fixture=await authFixture()
const app=createServer(createHandler({NODE_ENV:'development',APP_ORIGIN:'http://127.0.0.1:5208',SUPABASE_URL:fixture.origin,SUPABASE_PUBLISHABLE_KEY:'local-fixture-only'},{indexHTML:async()=>'<h1>PRIVATE TEST WORKSPACE</h1>'}))
await new Promise(r=>app.listen(5208,'127.0.0.1',r))
const origin='http://127.0.0.1:5208'
function browser(){const jar=new Map();return {jar,call:async(action,body,options={})=>{
 const r=await fetch(origin+(action.startsWith('/')?action:'/api/identity/'+action),{method:body===undefined?'GET':'POST',redirect:'manual',headers:{cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(body===undefined?{}:{origin,'content-type':'application/json'}),...options.headers},body:body===undefined?undefined:JSON.stringify(body)})
 for(const cookie of r.headers.getSetCookie()){const first=cookie.split(';')[0],i=first.indexOf('=');if(/max-age=0/i.test(cookie))jar.delete(first.slice(0,i));else jar.set(first.slice(0,i),first.slice(i+1))}
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,headers:r.headers,data,text}
 }}}
const a=browser(),b=browser(),email='miguel-qa@example.invalid',password='LOCAL-ONLY-Password-123'
try{
 for(const bad of['http://localhost:5173','https://localhost','https://127.0.0.1','https://[::1]','https://10.1.2.3','https://192.168.1.2','https://172.16.2.2','https://127.1','https://localhost.','https://[::ffff:7f00:1]','https://example.com/','https://example.com?x=1','https://user:pass@example.com'])assert.throws(()=>authOrigin(bad,true))
 for(const url of['https://evergreen-holding.vercel.app','https://evergreen-staging.example.com'])assert.equal(emailRedirect({origin:url,production:true}),url+'/login')
 assert.equal(authOrigin('http://localhost:5173',false),'http://localhost:5173')
 const build=spawnSync(process.execPath,['scripts/auth-config-check.mjs'],{env:{...process.env,VERCEL:'1',VERCEL_ENV:'production',APP_ORIGIN:'https://localhost'}});assert.notEqual(build.status,0)
 checks.push('production rejects local/private origins; staging exact HTTPS and local development supported; build rejects unsafe origin')
 let r=await a.call('signup',{email:'invalid',password,name:'Miguel QA'});assert.equal(r.status,400);assert.equal(fixture.users.size,0)
 r=await a.call('signup',{email,password:'short',name:'Miguel QA'});assert.equal(r.status,400)
 r=await a.call('signup',{email,password,name:'Miguel QA'});assert.equal(r.status,200);assert.equal(r.data.pendingConfirmation,true);assert.equal(r.data.session,null)
 assert.equal(fixture.outbox.at(-1).redirect,origin+'/login')
 r=await a.call('signup',{email,password,name:'Miguel QA'});assert.equal(r.status,200);assert.equal(fixture.users.size,1)
 r=await a.call('password',{email,password});assert.equal(r.data.error.code,'email_not_confirmed');assert.match(r.data.error.message,/Confirme/)
 checks.push('valid/invalid/duplicate signup; no duplicate account; unconfirmed login gives actionable Portuguese error')
 r=await a.call('resend-confirmation',{email});assert.equal(r.status,200)
 const confirmation=fixture.outbox.at(-1)
 r=await b.call('verify-email',{email,code:confirmation.code,type:'signup'});assert.equal(r.status,200);assert.ok(fixture.users.get(email).profile);assert.equal(r.data.session.context.workspaces.length,0)
 r=await b.call('create-workspace',{name:'Isolated QA'});assert.equal(r.status,200)
 r=await b.call('session');assert.equal(r.status,200);assert.equal(r.data.session.context.workspaces.length,1)
 assert.ok(!/access_token|refresh_token/.test(r.text));assert.ok([...b.jar.keys()].some(k=>k.startsWith('eg-auth')))
 r=await b.call('/api/page?view=hub');assert.equal(r.status,200)
 r=await b.call('logout',{});assert.equal(r.status,200)
 r=await b.call('session');assert.equal(r.status,401)
 r=await b.call('/api/page?view=hub');assert.equal(r.status,303)
 r=await b.call('password',{email,password:'wrong'});assert.equal(r.data.error.code,'invalid_credentials')
 r=await b.call('password',{email,password});assert.equal(r.status,200)
 checks.push('confirmation works in another cookie jar; profile provisioned; isolated workspace; cookie persistence; logout/private-route denial/relogin')
 r=await a.call('recover',{email});assert.equal(r.status,200);const recovery=fixture.outbox.at(-1)
 assert.equal(recovery.redirect,origin+'/login')
 assert.equal((await a.call('recover',{email:'unknown@example.invalid'})).status,200)
 r=await a.call('verify-email',{email,code:'000000',type:'recovery'});assert.equal(r.status,403);assert.match(r.data.error.message,/expirado/)
 r=await a.call('verify-link',{token_hash:'bad',type:'recovery'});assert.equal(r.status,400)
 const c=browser()
 r=await c.call('verify-link',{token_hash:recovery.token_hash,type:'recovery'});assert.equal(r.status,200);assert.equal(r.data.next,'/login?recovery=1')
 r=await c.call('update-password',{password:'LOCAL-NEW-Password-123'});assert.equal(r.status,200)
 r=await b.call('session');assert.equal(r.status,401,'other session revoked')
 r=await c.call('logout',{});assert.equal(r.status,200)
 r=await c.call('password',{email,password});assert.equal(r.status,400)
 r=await c.call('password',{email,password:'LOCAL-NEW-Password-123'});assert.equal(r.status,200)
 r=await a.call('verify-link',{token_hash:recovery.token_hash,type:'recovery'});assert.equal(r.status,403,'used token must fail')
 checks.push('cross-browser recovery link; generic unknown-account response; invalid/reused token rejected; reset revokes other sessions; new password works')
 await a.call('recover',{email});const expired=fixture.outbox.at(-1);expired.expired=true
 r=await a.call('verify-link',{token_hash:expired.token_hash,type:'recovery'});assert.equal(r.status,403)
 await a.call('recover',{email});const otp=fixture.outbox.at(-1)
 r=await a.call('verify-email',{email,code:otp.code,type:'recovery'});assert.equal(r.status,200)
 fixture.setFailMail(true);r=await a.call('recover',{email});assert.equal(r.status,429);assert.match(r.data.error.message,/Aguarde/);fixture.setFailMail(false)
 checks.push('expired recovery rejected; recovery OTP accepted independently of PKCE; send throttling reported without false success')
 fixture.setFailMail('smtp');const mailCount=fixture.outbox.length
 for(const [action,payload] of [['recover',{email}],['resend-confirmation',{email}],['email',{email}],['signup',{email:'smtp-failure@example.invalid',password,name:'SMTP QA'}]]){
  const failure=await a.call(action,payload);assert.equal(failure.status,503);assert.equal(failure.data.error.code,'EMAIL_DELIVERY_FAILED');assert.match(failure.data.error.message,/Não foi possível enviar/);assert.ok(!failure.data.pendingConfirmation);assert.doesNotMatch(failure.text,/Error sending|smtp.gmail|535/)
 }
 assert.equal(fixture.outbox.length,mailCount);fixture.setFailMail(false)
 checks.push('actual SDK handles provider SMTP 500 with safe actionable 503; signup, resend, recovery and OTP never report send success')

 const d=browser();fixture.setFailBootstrap(true)
 r=await d.call('password',{email,password:'LOCAL-NEW-Password-123'});assert.ok(r.status>=400);assert.equal([...d.jar.keys()].some(k=>k.startsWith('eg-auth')),false);fixture.setFailBootstrap(false)
 r=await d.call('recover',{email},{headers:{origin:'https://evil.invalid'}});assert.equal(r.status,403)
 r=await d.call('verify-link',{token_hash:otp.token_hash,type:'email_change'});assert.equal(r.status,400)
 r=await d.call('/api/identity/callback?error=access_denied&error_description=DO_NOT_LEAK');assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/login?auth_error=callback');assert.ok(!r.headers.get('location').includes('DO_NOT_LEAK'))
 checks.push('failed provisioning never commits a new auth cookie; CSRF rejection; callback error redirects safely; unsupported token type rejected')
 mkdirSync('output/auth-p0',{recursive:true});writeFileSync('output/auth-p0/bff.json',JSON.stringify({environment:'Local provider double + real Supabase SDK/BFF; not hosted Auth/SMTP E2E',passed:checks.length,checks},null,2));console.log(JSON.stringify({passed:checks.length,checks},null,2))
}finally{app.closeAllConnections();await new Promise(r=>app.close(r));await fixture.close()}
