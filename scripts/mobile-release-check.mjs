// Requires the locally built APK + Android SDK. Does not publish or mutate source/version/signing keys.
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
mkdirSync('output/native',{recursive:true})
const site=mkdtempSync(join(tmpdir(),'evergreen-release-check-'))
const run=()=>spawnSync(process.execPath,['scripts/mobile-release.mjs',site],{encoding:'utf8',windowsHide:true,maxBuffer:2*1024*1024})
let result=run();assert.equal(result.status,0,result.stderr)
const path=join(site,'.vercel/output/static/latest.json'),manifest=JSON.parse(readFileSync(path,'utf8'))
assert.equal(manifest.appId,'com.evergreen.holdings');assert.equal(manifest.versionCode,Number(readFileSync('android/app/build.gradle','utf8').match(/versionCode\s+(\d+)/)[1]))
assert.equal(readFileSync(join(site,'.vercel/output/static/Evergreen.apk')).equals(readFileSync(join(site,`.vercel/output/static/releases/${manifest.versionCode}/Evergreen.apk`))),true)
writeFileSync(path,JSON.stringify({...manifest,sha256:'f'.repeat(64)}));result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/Incremente versionCode/)
writeFileSync(path,JSON.stringify({...manifest,versionCode:manifest.versionCode+1}));result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/Incremente versionCode/)
writeFileSync(path,JSON.stringify({...manifest,versionCode:manifest.versionCode-1}));writeFileSync(join(site,`.vercel/output/static/releases/${manifest.versionCode}/Evergreen.apk`),'corrupted immutable release');result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/outro conte\u00fado/)
const report={environment:'Actual local APK validated with apksigner/aapt2; no installation or publication',checks:['signature matches pinned first-install certificate','APK package and version match Gradle','immutable/versionless downloads contain identical bytes','same versionCode with changed checksum is rejected','downgrade is rejected','existing immutable release cannot be replaced'],temporarySite:site}
writeFileSync('output/native/update-release-guard-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
