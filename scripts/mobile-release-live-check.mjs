// Read-only verification of the public APK release. Does not access user/workspace APIs.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {stripTypeScriptTypes} from 'node:module'
const source=stripTypeScriptTypes(readFileSync('src/mobile/releases.ts','utf8'),{mode:'transform'})
const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
const remote=await m.fetchAndroidRelease()
const local=JSON.parse(readFileSync('output/native/download-site/.vercel/output/static/latest.json','utf8'))
assert.deepEqual(remote,local)
assert.equal(m.newerAndroidRelease({id:remote.appId,build:String(remote.versionCode-1),version:'previous'},remote),true)
assert.equal(m.newerAndroidRelease({id:remote.appId,build:String(remote.versionCode),version:remote.versionName},remote),false)
const head=await fetch(m.releaseManifestUrl,{credentials:'omit',cache:'no-store',redirect:'error',headers:{Origin:'https://localhost'}})
assert.equal(head.status,200);assert.equal(head.headers.get('access-control-allow-origin'),'*');assert.match(head.headers.get('cache-control'),/no-store/)
const downloads=[]
for(const url of [m.releaseOrigin+'/Evergreen.apk',remote.downloadUrl]){
 const response=await fetch(url,{credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)})
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/vnd.android.package-archive/);assert.match(response.headers.get('content-disposition'),/attachment/)
 const hash=createHash('sha256');let bytes=0
 for await(const chunk of response.body){bytes+=chunk.byteLength;assert.ok(bytes<=remote.bytes);hash.update(chunk)}
 const sha256=hash.digest('hex');assert.equal(bytes,remote.bytes);assert.equal(sha256,remote.sha256)
 downloads.push({url,status:response.status,bytes,sha256,cacheControl:response.headers.get('cache-control')})
}
mkdirSync('output/native',{recursive:true})
const report={verifiedAt:new Date().toISOString(),project:'evergreen-android-downloads',manifest:remote,anonymousDownloadsVerified:true,manifestCorsVerified:true,olderBuildUpdateDetected:true,currentBuildHasNoUpdate:true,downloads,nativeInstallationOrRuntimeVerified:false}
writeFileSync('output/native/update-publication.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
