// Read-only production release checks. No login attempts, messages, or financial writes.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
const origin='https://evergreen-holding.vercel.app',checks=[]
const home=await fetch(origin);assert.equal(home.status,200);assert.ok((await home.text()).includes('id="root"'));checks.push('production HTML served')
const config=await fetch(origin+'/api/identity/config');assert.equal(config.status,200);assert.equal((await config.json()).cookieSessions,true);checks.push('production identity BFF configured')
const session=await fetch(origin+'/api/identity/session');assert.equal(session.status,401);assert.doesNotMatch(await session.text(),/access_token|refresh_token/);checks.push('anonymous session denied without credentials')
for(const route of ['hub','vision','economy','founders']){const r=await fetch(origin+'/'+route,{redirect:'manual'});assert.equal(r.status,303,route);assert.ok(r.headers.get('location')?.startsWith('/login?next='))}checks.push('four private routes require server-validated session')
for(const path of ['evergreen-symbol.png','fonts/LibreCaslonDisplay-Regular.ttf']){const r=await fetch(origin+'/'+path);assert.equal(r.status,200,path);const remote=Buffer.from(await r.arrayBuffer()),local=readFileSync('public/'+path),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(remote),hash(local),path);checks.push('production asset matches source SHA256: '+path)}
const result={environment:'REAL public HTTPS, read-only; no authenticated owner session',origin,checks,notVerified:['Authenticated company/chat/profile UI','Owner photo upload against hosted Storage','Owner-session resolution of the reported proxy error','Invite acceptance by Miguel/Gabriel']}
mkdirSync('output/activation',{recursive:true});writeFileSync('output/activation/workspace-production.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))
