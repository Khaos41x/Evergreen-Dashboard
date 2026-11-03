import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {stripTypeScriptTypes} from 'node:module'
import {createHash,createPublicKey,publicDecrypt,createDecipheriv,constants,sign,generateKeyPairSync} from 'node:crypto'
import {unzipSync} from 'fflate'
import {prepareLiveUpdate} from './mobile-ota.mjs'
const key=readFileSync('.mobile-update-signing.local.pem','utf8'),publicKey=createPublicKey(key),checks=[]
let source=readFileSync('src/mobile/live-updates.ts','utf8').replace("import verificationKey from './live-update-key.json'",'const verificationKey='+readFileSync('src/mobile/live-update-key.json','utf8'))
const mod=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'transform'})).toString('base64'))
const out=mkdtempSync(join(tmpdir(),'evergreen-live-update-'))
const prepared=prepareLiveUpdate({key,outputDirectory:out,sequence:1001}),envelope=JSON.parse(readFileSync(join(out,'latest.json'),'utf8'))
const payload=await mod.verifyLiveManifest(envelope)
assert.equal(payload.sequence,1001)
const signed=p=>{const serialized=JSON.stringify(p);return{payload:serialized,signature:sign('sha256',Buffer.from(serialized),{key,padding:constants.RSA_PKCS1_PSS_PADDING,saltLength:32}).toString('base64')}}
await assert.rejects(mod.verifyLiveManifest({...envelope,payload:envelope.payload.replace('1001','1002')}))
await assert.rejects(mod.verifyLiveManifest({...envelope,signature:'A'.repeat(342)+'=='}))
for(const patch of [{url:'https://evil.invalid/payload.bin'},{appId:'another.app'},{platform:'ios'},{minBuild:4},{maxBuild:0},{sequence:0},{bytes:30*1024*1024},{sha256:'invalid'},{checksum:'abc'},{sessionKey:'invalid'},{version:'forged'}])await assert.rejects(mod.verifyLiveManifest(signed({...payload,...patch})))
checks.push('real RSA-PSS manifest verification; modified signatures and signed invalid metadata denied')
const decrypt=b=>publicDecrypt({key:publicKey,padding:constants.RSA_PKCS1_PADDING},b)
const [iv,encryptedKey]=payload.sessionKey.split(':').map(v=>Buffer.from(v,'base64'))
const aes=decrypt(encryptedKey),cipher=createDecipheriv('aes-128-cbc',aes,iv),encrypted=readFileSync(join(out,'bundles',payload.sequence+'-'+payload.sha256+'.bin'))
assert.equal(aes.length,16);assert.equal(iv.length,16)
const zip=Buffer.concat([cipher.update(encrypted),cipher.final()]),checksum=decrypt(Buffer.from(payload.checksum,'hex')).toString('hex')
assert.equal(checksum,createHash('sha256').update(zip).digest('hex'))
assert.equal(payload.sha256,createHash('sha256').update(encrypted).digest('hex'));assert.equal(payload.bytes,encrypted.length)
const files=unzipSync(zip),html=Buffer.from(files['index.html']).toString()
assert.ok(html.includes('eg-native-csp'));assert.ok(html.includes('https://evergreen-holding.vercel.app'))
assert.ok(!Object.keys(files).some(p=>p.startsWith('mobile-updates/')||/\.pem|\.env|\.jks/.test(p)))
for(const file of Object.values(files))assert.ok(!Buffer.from(file).includes(Buffer.from('BEGIN PRIVATE KEY')))
checks.push('actual generated encrypted ZIP round-trip; native RSA/AES/checksum format; CSP, no nested updates or private key')
const wrong=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'})
assert.throws(()=>prepareLiveUpdate({key:wrong,outputDirectory:join(out,'wrong')}),/does not match/)
checks.push('publisher rejects a different signing key')
let request
assert.equal((await mod.fetchLiveManifest(async(url,init)=>{request={url,init};return new Response(JSON.stringify(envelope),{headers:{'content-type':'application/json'}})})).sequence,1001)
assert.equal(request.url,mod.liveUpdateManifest);assert.equal(request.init.credentials,'omit');assert.equal(request.init.redirect,'error');assert.equal(request.init.cache,'no-store')
await assert.rejects(mod.fetchLiveManifest(async()=>new Response('x'.repeat(17000),{headers:{'content-type':'application/json'}})))
await assert.rejects(mod.fetchLiveManifest(async()=>new Response('{}',{status:503})))
await assert.rejects(mod.fetchLiveManifest(async()=>{throw Error('offline')}))
checks.push('public credential-free manifest transport; oversized, unavailable and offline responses denied')
let calls=[],version='1.2.1',bundles=[]
const plugin={current:async()=>({bundle:{id:'builtin',version}}),list:async()=>({bundles}),download:async data=>{calls.push(['download',data]);return{id:'new',version:data.version}},next:async data=>calls.push(['next',data])}
assert.equal(await mod.checkLiveUpdate(plugin,{id:'com.evergreen.holdings',build:'5'},async()=>payload),'staged')
assert.equal(calls[0][1].checksum,payload.checksum);assert.equal(calls[0][1].sessionKey,payload.sessionKey);assert.equal(calls[1][0],'next')
assert.equal(calls.some(c=>['set','reload'].includes(c[0])),false)
calls=[];version='1.2.1+1001';assert.equal(await mod.checkLiveUpdate(plugin,{id:'com.evergreen.holdings',build:'5'},async()=>payload),'current');assert.deepEqual(calls,[])
version='1.2.1+1002';assert.equal(await mod.checkLiveUpdate(plugin,{id:'com.evergreen.holdings',build:'5'},async()=>payload),'current')
version='1.2.1';for(const build of [String(payload.minBuild-1),String(payload.maxBuild+1)])assert.equal(await mod.checkLiveUpdate(plugin,{id:'com.evergreen.holdings',build},async()=>payload),'incompatible')
bundles=[{id:'failed',version:payload.version,status:'error'}];assert.equal(await mod.checkLiveUpdate(plugin,{id:'com.evergreen.holdings',build:'5'},async()=>payload),'failed')
bundles=[{id:'saved',version:payload.version,status:'pending'}];assert.equal(await mod.checkLiveUpdate(plugin,{id:'com.evergreen.holdings',build:'5'},async()=>payload),'staged');assert.deepEqual(calls,[['next',{id:'saved'}]])
checks.push('new content staged without foreground reload; current, rollback, failed and incompatible builds blocked; downloaded bundle reused')
const native=readFileSync('node_modules/@capgo/capacitor-updater/android/src/main/java/ee/forgr/capacitor_updater/CapacitorUpdaterPlugin.java','utf8')
assert.ok(native.includes('this.installNext();'));assert.ok(native.includes('this.implementation.setError(current)'));assert.ok(native.includes('CryptoCipher.isValidSessionKey(sessionKey)'))
const config=readFileSync('capacitor.config.ts','utf8');assert.ok(config.includes('publicKey: liveUpdateKey.pkcs1'));assert.ok(config.includes("updateUrl: '', statsUrl: '', channelUrl: ''"))
checks.push('native plugin source declares deferred activation, signature requirements and rollback; cloud endpoints disabled (not runtime proof)')
const root=process.cwd(),sandbox=join(out,'compat');mkdirSync(join(sandbox,'src/mobile'),{recursive:true})
for(const name of ['live-update-policy.json','live-update-key.json','live-update-native.json'])writeFileSync(join(sandbox,'src/mobile',name),readFileSync(join(root,'src/mobile',name)))
const pkg=JSON.parse(readFileSync('package.json','utf8'));pkg.dependencies['@capacitor/core']='99.0.0';writeFileSync(join(sandbox,'package.json'),JSON.stringify(pkg))
try{process.chdir(sandbox);assert.throws(()=>prepareLiveUpdate({key,directory:join(root,'dist')}),/Native dependencies changed/)}finally{process.chdir(root)}
checks.push('publisher stops after native dependency changes until compatibility is reviewed')
mkdirSync('output/native',{recursive:true});const result={environment:'Actual local crypto and archive, controlled transport and plugin doubles; no device installation or native rollback execution',prepared,checks}
writeFileSync('output/native/live-update-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))
