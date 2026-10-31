import assert from 'node:assert/strict'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
const source=stripTypeScriptTypes(readFileSync('src/mobile/releases.ts','utf8'),{mode:'transform'})
const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
const release={schema:1,appId:'com.evergreen.holdings',platform:'android',versionCode:2,versionName:'1.0.1',downloadUrl:m.releaseOrigin+'/releases/2/Evergreen.apk',sha256:'a'.repeat(64),bytes:11000000}
assert.deepEqual(m.parseAndroidRelease(release),release)
for(const patch of [{appId:'com.other.app'},{platform:'ios'},{schema:2},{versionCode:0},{versionCode:1.1},{versionCode:2100000001},{versionName:'<b>3</b>'},{sha256:'bad'},{bytes:0},{bytes:600*1024*1024},{downloadUrl:'https://evil.invalid/release.apk'},{downloadUrl:m.releaseOrigin+'/releases/1/Evergreen.apk'},{downloadUrl:m.releaseOrigin+'/releases/2/Evergreen.apk?token=secret'},{downloadUrl:m.releaseOrigin+'/releases/2/Evergreen.apk#fragment'},{downloadUrl:'https://user:password@evergreen-android-downloads.vercel.app/releases/2/Evergreen.apk'},{downloadUrl:'http://evergreen-android-downloads.vercel.app/releases/2/Evergreen.apk'},{downloadUrl:'javascript:alert(1)'}])assert.throws(()=>m.parseAndroidRelease({...release,...patch}))
for(const build of ['2','3','bad','0','-1','1.5',''])assert.equal(m.newerAndroidRelease({id:release.appId,build,version:'1.0'},release),false)
assert.equal(m.newerAndroidRelease({id:release.appId,build:'1',version:'99.99'},release),true)
assert.equal(m.newerAndroidRelease({id:'another.app',build:'1',version:'1.0'},release),false)
const now=100000000
const preference=JSON.stringify({build:2,until:now+m.updateReminderMs})
assert.equal(m.updateWasDeferred(preference,2,now),true)
assert.equal(m.updateWasDeferred(preference,3,now),false)
assert.equal(m.updateWasDeferred(preference,2,now+m.updateReminderMs),false)
for(const value of [null,'bad','{}',JSON.stringify({build:2,until:now+2*m.updateReminderMs})])assert.equal(m.updateWasDeferred(value,2,now),false)
const original=globalThis.fetch;let request
try{
 globalThis.fetch=async(url,init)=>{request={url,init};return new Response(JSON.stringify(release),{headers:{'Content-Type':'application/json'}})}
 assert.deepEqual(await m.fetchAndroidRelease(),release)
 assert.equal(request.url,m.releaseManifestUrl);assert.equal(request.init.credentials,'omit');assert.equal(request.init.redirect,'error');assert.equal(request.init.cache,'no-store');assert.deepEqual(request.init.headers,{Accept:'application/json'})
 for(const reply of [new Response('offline',{status:503}),new Response('<html>login</html>',{headers:{'content-type':'text/html'}}),new Response('{bad',{headers:{'content-type':'application/json'}}),new Response('x'.repeat(16385),{headers:{'content-type':'application/json'}})]){globalThis.fetch=async()=>reply;await assert.rejects(m.fetchAndroidRelease())}
 globalThis.fetch=async()=>{throw new TypeError('Network unavailable')};await assert.rejects(m.fetchAndroidRelease())
 globalThis.fetch=async(_,init)=>{init.signal.throwIfAborted();return new Response()};await assert.rejects(m.fetchAndroidRelease(AbortSignal.abort()),{name:'AbortError'})
 const originalTimer=globalThis.setTimeout
 try{
  let timeout
  globalThis.setTimeout=(fn,delay,...args)=>{timeout=delay;return originalTimer(fn,1,...args)}
  globalThis.fetch=async(_,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError')),{once:true}))
  await assert.rejects(m.fetchAndroidRelease(),{name:'AbortError'});assert.equal(timeout,8000)
 }finally{globalThis.setTimeout=originalTimer}
}finally{globalThis.fetch=original}
const csp=readFileSync('scripts/native-hardening.mjs','utf8');assert.ok(csp.includes(m.releaseOrigin))
mkdirSync('output/native',{recursive:true})
const result={environment:'Local automated release metadata tests; not Android runtime',checks:['strict schema, app/platform and version validation','download URL allowlist rejects credentials, redirects, arbitrary hosts and versions','build-number comparison prevents downgrade and repeated notices','24-hour defer is scoped to a build; a newer build is not suppressed','public request omits cookies, disables caching and follows no redirects','offline, HTTP errors, non-JSON, malformed or oversized responses, cancellation','native CSP allows only the expected release origin']}
writeFileSync('output/native/update-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))
