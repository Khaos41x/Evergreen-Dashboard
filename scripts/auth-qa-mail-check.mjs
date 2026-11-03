// One explicitly authorized QA identity. No admin key, sessions or password logs.
import {randomBytes} from 'node:crypto'
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs'
const email='grupocoller@gmail.com',origin='https://evergreen-holding.vercel.app',path='output/auth-p0/qa-provider-mail-grupocoller.json'
if(process.env.EG_ALLOW_QA_PRODUCTION_EMAILS!=='true')throw Error('Explicit QA production-email authorization required')
const action=process.argv[2]
if(!['signup','recover'].includes(action))throw Error('Only signup or recovery request is allowed')
const previous=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{scope:'Authorized QA account and email requests only; not login/reset E2E',email,origin,checks:[]}
if(previous.email!==email||previous.origin!==origin)throw Error('Evidence target mismatch')
if(previous.checks.some(c=>c.action===action&&c.httpStatus===200))throw Error('Request already accepted; inspect evidence before requesting another email')
const payload=action==='signup'?{email,password:randomBytes(32).toString('base64url'),name:'Evergreen QA',job_title:'Teste de autenticação',timezone:'America/Sao_Paulo',next:'/hub'}:{email}
let response
try{response=await fetch(origin+'/api/identity/'+action,{method:'POST',redirect:'error',headers:{origin,'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)})}finally{delete payload.password}
const body=await response.json()
const evidence={action,at:new Date().toISOString(),httpStatus:response.status,code:typeof body.error?.code==='string'?body.error.code:null,pendingConfirmation:body.pendingConfirmation===true,sessionReturned:!!body.session,emailDelivery:'NOT_VERIFIED'}
previous.checks.push(evidence);mkdirSync('output/auth-p0',{recursive:true});writeFileSync(path,JSON.stringify(previous,null,2));console.log(JSON.stringify(evidence,null,2))
if(!response.ok)process.exitCode=2
