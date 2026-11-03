// Read-only published live-update verification; never opens an account or sends email.
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash,createPublicKey,publicDecrypt,createDecipheriv,constants} from 'node:crypto'
import {stripTypeScriptTypes} from 'node:module'
import {unzipSync} from 'fflate'
import assert from 'node:assert/strict'
let source=readFileSync('src/mobile/live-updates.ts','utf8').replace("import verificationKey from './live-update-key.json'",'const verificationKey='+readFileSync('src/mobile/live-update-key.json','utf8'))
const m=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source,{mode:'transform'})).toString('base64'))
const update=await m.fetchLiveManifest()
const manifestResponse=await fetch(m.liveUpdateManifest,{headers:{Origin:'https://localhost'},credentials:'omit',redirect:'error',cache:'no-store'})
assert.equal(manifestResponse.status,200);assert.equal(manifestResponse.headers.get('access-control-allow-origin'),'*');assert.match(manifestResponse.headers.get('cache-control'),/no-store/)
const response=await fetch(update.url,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000)})
assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/octet-stream/);assert.equal(response.headers.get('access-control-allow-origin'),'*')
const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.length,update.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),update.sha256)
const publicKey=JSON.parse(readFileSync('src/mobile/live-update-key.json','utf8')).pkcs1
const decrypt=b=>publicDecrypt({key:publicKey,padding:constants.RSA_PKCS1_PADDING},b)
const [iv,key]=update.sessionKey.split(':').map(v=>Buffer.from(v,'base64'))
const cipher=createDecipheriv('aes-128-cbc',decrypt(key),iv),zip=Buffer.concat([cipher.update(bytes),cipher.final()])
assert.equal(createHash('sha256').update(zip).digest('hex'),decrypt(Buffer.from(update.checksum,'hex')).toString('hex'))
const files=unzipSync(zip);assert.ok(files['index.html']);assert.ok(Buffer.from(files['index.html']).toString().includes('eg-native-csp'))
let same=0,different=[]
for(const [name,content] of Object.entries(files)){
 assert.ok(!/\.pem|\.env|\.jks|keystore/.test(name))
 if(readFileSync('android/app/src/main/assets/public/'+name).equals(Buffer.from(content)))same++;else different.push(name)
}
assert.deepEqual(different,[])
const result={verifiedAt:new Date().toISOString(),environment:'Real production public signed manifest and encrypted bundle, decrypted/verified using public key. Not native application or rollback execution.',deployment:process.env.VERIFIED_OTA_DEPLOYMENT_ID||null,signatureVerified:true,checksumVerified:true,corsVerified:true,compatibleBuilds:[update.minBuild,update.maxBuild],version:update.version,bytes:bytes.length,sha256:update.sha256,filesIdenticalToPackagedApp:same,noSecretFiles:true}
writeFileSync('output/native/live-update-publication.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))
