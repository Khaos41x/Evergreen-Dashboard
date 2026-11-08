import {integrationActions} from '../server/integrations.mjs'
import {integrationReadiness,requireIntegrationReadiness} from '../server/integration-status.mjs'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdirSync,writeFileSync} from 'node:fs'
import {providerJSON,dateRange,discoverResources,syncProvider,previewProvider} from '../server/integration-providers.mjs'
import {encryptCredential,decryptCredential} from '../server/credentials.mjs'
import {asaasJSON,decimalCents,normalizePayment,validWebhookToken,reconcileAsaas} from '../server/asaas.mjs'
const checks=[],env={INTEGRATIONS_ENCRYPTION_KEY:randomBytes(32).toString('base64')},aad='integration:workspace:provider',credential='fixture-secret-never-persisted',encrypted=encryptCredential(credential,aad,env)
assert.equal(decryptCredential(encrypted,aad,env),credential);assert.throws(()=>decryptCredential(encrypted,'other-workspace',env));const bytes=Buffer.from(encrypted,'base64');bytes[13]^=1;assert.throws(()=>decryptCredential(bytes.toString('base64'),aad,env));assert.throws(()=>encryptCredential(credential,aad,{}));assert.ok(!encrypted.includes(credential));assert.equal(integrationReadiness({env:{}}).ready,false);assert.equal(integrationReadiness({env:{...env,INTEGRATIONS_STORAGE_SERVICE_KEY:'fixture-server-key'}}).ready,true);assert.throws(()=>requireIntegrationReadiness({env}));assert.ok(!JSON.stringify(integrationReadiness({env})).includes(env.INTEGRATIONS_ENCRYPTION_KEY));checks.push('AES-GCM authenticated encryption, wrong scope/key/tampering denied')
for(const pair of[['','2026-10-01'],['2026-02-30','2026-03-01'],['2026-10-02','2026-10-01'],['2025-01-01','2026-10-30'],['2026-99-99','2026-10-30']])assert.throws(()=>dateRange(...pair));assert.equal(dateRange('2026-10-01','2026-10-30').end,'2026-10-31T00:00:00.000Z')
let called=false;await assert.rejects(()=>providerJSON('https://attacker.invalid/key',credential,{},async()=>{called=true}));assert.equal(called,false);await assert.rejects(()=>providerJSON('https://api.vercel.com/test',credential,{},async()=>new Response('{}',{status:429})));checks.push('period boundaries, no arbitrary URLs, provider limits fail explicitly')
const fixture=(value)=>async()=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}})
for(const provider of ['cloudflare','vercel','supabase']){
 await assert.rejects(()=>discoverResources(provider,credential,{},fixture({wrong:'shape'})),e=>e.code==='PROVIDER_DATA_INVALID')
}
await assert.rejects(()=>discoverResources('cloudflare',credential,{},fixture({result:[null]})),e=>e.code==='PROVIDER_DATA_INVALID')
await assert.rejects(()=>discoverResources('vercel',credential,{},fixture({projects:[{id:'x'}]})),e=>e.code==='PROVIDER_DATA_INVALID')
await assert.rejects(()=>discoverResources('supabase',credential,null,fixture([])),e=>e.code==='PROVIDER_CONFIG_INVALID')
await assert.rejects(()=>providerJSON('https://api.vercel.com/test',credential,{},fixture(null)),e=>e.code==='PROVIDER_DATA_INVALID')
for(const status of[401,403])await assert.rejects(()=>providerJSON('https://api.vercel.com/test',credential,{},async()=>new Response('{}',{status})),e=>e.code==='PROVIDER_CREDENTIAL_DENIED'&&e.status===403)
let cancelled=false,pulls=0
const stream=new ReadableStream({pull(controller){pulls++;controller.enqueue(new Uint8Array(1048576));},cancel(){cancelled=true}})
await assert.rejects(()=>providerJSON('https://api.vercel.com/test',credential,{},async()=>new Response(stream)),e=>e.code==='PROVIDER_DATA_LIMIT')
assert.equal(cancelled,true);assert.ok(pulls<6,'stream must be cancelled before buffering the full response')
checks.push('malformed discovery lists and null payloads rejected; credential denial actionable; oversized streaming payload cancelled at the byte limit')

const cf=await syncProvider({provider:'cloudflare',resource_id:'zone_fixture'},credential,'2026-10-01','2026-10-30',fixture({data:{viewer:{zones:[{httpRequests1dGroups:[{dimensions:{date:'2026-10-10'},sum:{requests:120,bytes:2048,threats:1,countryMap:[{clientCountryName:'BR',requests:80}]},uniq:{uniques:10}}]}]}}}));assert.equal(cf.metrics.find(m=>m.key==='requests').value,120);assert.ok(!cf.metrics.some(m=>m.key==='visitors'));assert.equal(cf.series[0].unique_ips,10)
const vercel=await syncProvider({provider:'vercel',resource_id:'prj_fixture',config:{}},credential,'2026-10-01','2026-10-30',async url=>fixture({data:url.searchParams.get('by')==='day'?[{timestamp:'2026-10-10',pageviews:100,visitors:30}]:[{country:'BR',pageviews:60}]})());assert.equal(vercel.metrics[0].value,100);assert.ok(!vercel.metrics.some(m=>m.key==='visitors'))
const sb=await syncProvider({provider:'supabase',resource_id:'project_fixture'},credential,'2026-10-01','2026-10-30',async(_url,init)=>{const q=JSON.parse(init.body).query;assert.ok(q.includes('auth.users'));assert.ok(!/insert|update|delete/i.test(q));return fixture(q.includes('users_total')?[{users_total:'50',signups:'5',accounts_last_login:'9'}]:[{day:'2026-10-10',signups:'5'}])()});assert.equal(sb.metrics.find(m=>m.key==='signups').value,5);assert.ok(sb.metrics.some(m=>m.key==='accounts_last_login'&&m.aggregation==='snapshot'));checks.push('Cloudflare requests not visitors; Vercel uniques non-additive; Supabase read-only aggregate counts and distinct login semantics')
let reads=[]
const preview=await previewProvider({provider:'vercel',resource_id:'prj_fixture',config:{teamId:'team_fixture'}},credential,'2026-10-01','2026-10-30',async(url,init)=>{
 reads.push({path:url.pathname,method:init.method||'GET'})
 assert.equal(url.searchParams.get('teamId'),'team_fixture')
 return fixture(url.pathname==='/v10/projects'?{projects:[{id:'prj_fixture',name:'Site autorizado'}]}:{data:url.searchParams.get('by')==='day'?[{timestamp:'2026-10-10',pageviews:100,visitors:30}]:[]})()
})
assert.equal(preview.resource.name,'Site autorizado')
assert.equal(preview.payload.metrics[0].value,100)
assert.ok(Number.isFinite(Date.parse(preview.checked_at)))
assert.ok(reads.every(r=>r.method==='GET'),'preview cannot write to the provider')
reads=[]
await assert.rejects(()=>previewProvider({provider:'vercel',resource_id:'other',config:{}},credential,'2026-10-01','2026-10-30',async(url)=>{reads.push(url.pathname);return fixture({projects:[{id:'prj_fixture',name:'Authorized'}]})()}),e=>e.code==='RESOURCE_DENIED')
assert.deepEqual(reads,['/v10/projects'],'ungranted resources must not reach analytics')
await assert.rejects(()=>previewProvider({provider:'asaas',resource_id:'wallet',config:{environment:'sandbox',companyId:'00000000-0000-4000-8000-000000000001'}},credential,'2026-10-01','2026-10-30'),e=>e.code==='PREVIEW_UNSUPPORTED')
for(const row of [{timestamp:'2026-10-10',visitors:3},{timestamp:'2026-10-10',pageviews:null},{timestamp:'2026-11-10',pageviews:3},{timestamp:'broken',pageviews:3}]){
 await assert.rejects(()=>syncProvider({provider:'vercel',resource_id:'prj_fixture',config:{}},credential,'2026-10-01','2026-10-30',fixture({data:[row]})),e=>e.code==='PROVIDER_DATA_INVALID')
}
await assert.rejects(()=>syncProvider({provider:'cloudflare',resource_id:'zone_fixture'},credential,'2026-10-01','2026-10-30',fixture({data:{viewer:{zones:[{httpRequests1dGroups:[{dimensions:{date:'2026-10-10'},sum:{requests:null,bytes:0,threats:0}}]}]}}})),e=>e.code==='PROVIDER_DATA_INVALID')
await assert.rejects(()=>syncProvider({provider:'supabase',resource_id:'project_fixture'},credential,'2026-10-01','2026-10-30',fixture([{users_total:'50',accounts_last_login:'0'}])),e=>e.code==='PROVIDER_DATA_INVALID')
const empty=await syncProvider({provider:'vercel',resource_id:'prj_fixture',config:{}},credential,'2026-10-01','2026-10-30',fixture({data:[]}))
assert.equal(empty.metrics[0].value,0,'a valid empty series differs from missing fields')
checks.push('read-only preview binds token, team, resource and date; forbidden resource blocked before metrics; Asaas remains explicit; malformed or missing required metrics never become zero')
// Execute the actual preview handler against an isolated session/RPC/provider double.
const originalFetch=globalThis.fetch,network=[]
let writes=0
function fixtureContext({authenticated=true,recent=true,admin=true,id=randomBytes(8).toString('hex')}={}){
 const user={id,email:'fixture@example.invalid'}
 return{commit(){},clear(){},client:{auth:{getUser:async()=>({data:{user:authenticated?user:null},error:null}),getSession:async()=>({data:{session:{user}},error:null})},rpc:async(name)=>{
  if(name==='eg_identity_context')return{data:{active:true,recent_auth:recent},error:null}
  if(name==='eg_holding_context')return{data:{companies:[{id:'company-a',admin}]},error:null}
  writes++;throw Error('Preview must never call a write RPC')
 }}}
}
const routeConfig={origin:'http://localhost:5173',url:'https://fixture.supabase.invalid',key:'fixture-key',production:false,env:{...env,INTEGRATIONS_STORAGE_SERVICE_KEY:'fixture-server-key'}}
const previewBody={workspace_id:'company-a',provider:'vercel',resource_id:'prj_fixture',config:{},token:credential,from:'2026-10-01',to:'2026-10-30'}
async function invokePreview(context,options={}){
 let output
 const req={method:'POST',url:'/api/integrations/preview',headers:{origin:routeConfig.origin,'content-type':'application/json',...options.headers},body:{...previewBody,...options.body},socket:{remoteAddress:'route-preview-fixture'}}
 const res={setHeader(){},end(body){output=JSON.parse(body)}}
 await integrationActions(req,res,options.config||routeConfig,context,'preview')
 return output
}
try{
 globalThis.fetch=async(url,init)=>{network.push(String(url));assert.equal(new URL(url).hostname,'api.vercel.com');assert.equal(init.method||'GET','GET');return fixture(new URL(url).pathname==='/v10/projects'?{projects:[{id:'prj_fixture',name:'Autorizado'}]}:{data:[]})()}
 await assert.rejects(()=>invokePreview(fixtureContext({authenticated:false})),e=>e.code==='SESSION_REQUIRED')
 await assert.rejects(()=>invokePreview(fixtureContext(),{headers:{origin:'https://untrusted.invalid'}}),e=>e.code==='ORIGIN_DENIED')
 await assert.rejects(()=>invokePreview(fixtureContext({recent:false})),e=>e.code==='REAUTH_REQUIRED')
 await assert.rejects(()=>invokePreview(fixtureContext({admin:false})),e=>e.code==='INTEGRATION_DENIED')
 await assert.rejects(()=>invokePreview(fixtureContext(),{body:{workspace_id:'other-company'}}),e=>e.code==='INTEGRATION_DENIED')
 await assert.rejects(()=>invokePreview(fixtureContext(),{config:{...routeConfig,env:{}}}),e=>e.code==='INTEGRATION_CONFIGURATION')
 assert.equal(network.length,0,'denied requests must not reach the provider')
 const result=await invokePreview(fixtureContext());assert.equal(result.resource.id,'prj_fixture');assert.equal(result.payload.metrics[0].value,0);assert.equal(writes,0)
 const limitedContext=fixtureContext({id:'preview-throttle-fixture'})
 for(let i=0;i<12;i++)await invokePreview(limitedContext)
 const requestsBeforeLimit=network.length
 await assert.rejects(()=>invokePreview(limitedContext),e=>e.code==='RATE_LIMITED')
 assert.equal(network.length,requestsBeforeLimit)
 checks.push('actual preview route enforces session, origin, recent auth, company admin, readiness and rate limit before contacting provider; no write RPC used')
}finally{globalThis.fetch=originalFetch}
const hook=randomBytes(32).toString('base64url');assert.equal(validWebhookToken(hook,hook),true);assert.equal(validWebhookToken(hook+'x',hook),false);assert.equal(validWebhookToken('',hook),false);assert.equal(decimalCents('100.01'),'10001');assert.throws(()=>decimalCents('100.001'))
const exact=await asaasJSON('/payments/pay_fixture',credential,'sandbox',async(url,init)=>{assert.ok(url.startsWith('https://api-sandbox.asaas.com/'));assert.equal(init.headers.access_token,credential);assert.equal(init.redirect,'error');return new Response('{"id":"pay_fixture","status":"RECEIVED","value":89999999999999.99,"netValue":89999999999999.98}')});assert.equal(normalizePayment(exact).gross_cents,'8999999999999999')
const normalized=normalizePayment({id:'pay_fixture',status:'CONFIRMED',value:'100.01',netValue:'99.50',confirmedDate:'2026-10-20',refunds:[{status:'PENDING',value:'90.00'},{status:'DONE',value:'10.00',dateCreated:'2026-10-21 12:00:00'}]});assert.equal(normalized.refund_cents,'1000');assert.equal(normalized.status,'CONFIRMED');assert.equal(normalized.customer,undefined);await assert.rejects(()=>asaasJSON('/payments/../../webhooks',credential,'production',fixture({})));checks.push('Asaas fixed read-only endpoints, native webhook token check, exact decimal parsing before Number conversion, DONE-only refunds, no customer/card data')
const commits=[],service={rpc:async(name,args)=>{commits.push({name,args});return{data:null,error:null}}};const result=await reconcileAsaas({id:'fixture',config:{environment:'sandbox'}},JSON.stringify({apiToken:credential}),service,0,async(url)=>fixture(url.includes('?')?{data:[{id:'pay_fixture'}],hasMore:false}:{id:'pay_fixture',status:'RECEIVED',value:100,netValue:99,paymentDate:'2026-10-20'})());assert.equal(result.complete,true);assert.ok(commits.some(c=>c.name==='eg_asaas_store'));assert.ok(commits.some(c=>c.name==='eg_asaas_checkpoint'&&c.args.p_next===null));checks.push('paginated reconciliation rereads official current payment and persists canonical row/cursor; no external payment writes')
mkdirSync('output/holding',{recursive:true});const evidence={environment:'Local deterministic provider fixtures; NOT live API or hosted verification',checks};writeFileSync('output/holding/integrations.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2))
