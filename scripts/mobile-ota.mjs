// Runs after Vite. Production must sign; previews never publish a live-update channel.
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync} from 'node:fs'
import {join,relative,resolve} from 'node:path'
import {createPrivateKey,createPublicKey,createHash,randomBytes,createCipheriv,privateEncrypt,constants,sign} from 'node:crypto'
import {zipSync} from 'fflate'
import {pathToFileURL} from 'node:url'
import {nativeHTML} from './native-csp.mjs'
const hash=b=>createHash('sha256').update(b).digest('hex')
export function prepareLiveUpdate({directory='dist',outputDirectory=join(directory,'mobile-updates'),key,sequence=Date.now()}={}){
 const policy=JSON.parse(readFileSync('src/mobile/live-update-policy.json','utf8'))
 const publicKey=JSON.parse(readFileSync('src/mobile/live-update-key.json','utf8'))
 const privateKey=createPrivateKey(key)
 if(createPublicKey(privateKey).export({type:'spki',format:'der'}).toString('base64')!==publicKey.spki)throw Error('Live-update signing key does not match the installed public key.')
 const pkg=JSON.parse(readFileSync('package.json','utf8'))
 const deps=Object.fromEntries(Object.entries(pkg.dependencies).filter(([name])=>name.startsWith('@capacitor/')||name==='@capgo/capacitor-updater').sort())
 const expected=JSON.parse(readFileSync('src/mobile/live-update-native.json','utf8'))
 if(hash(JSON.stringify(deps))!==expected.dependenciesSha256)throw Error('Native dependencies changed: build a new APK and explicitly update native compatibility before OTA.')
 if(existsSync('android/app/build.gradle')){
  const gradle=readFileSync('android/app/build.gradle','utf8')
  if(Number(gradle.match(/versionCode\s+(\d+)/)?.[1])!==policy.maxBuild)throw Error('Native build and OTA policy differ. Review compatibility explicitly.')
 }
 const files={}
 function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(entry.name==='mobile-updates'||(dir===directory&&entry.name==='build-manifest.json'))continue
  const path=join(dir,entry.name)
  if(entry.isSymbolicLink())throw Error('Symlinks cannot enter a live bundle.')
  if(entry.isDirectory())walk(path)
  else{const name=relative(directory,path).replaceAll('\\','/');if(/(^|\/)\.|\.map$|\.pem$|\.env|keystore|\.jks$/i.test(name))throw Error('Unexpected file in live bundle: '+name);files[name]=readFileSync(path)}
 }}
 walk(directory)
 if(!files['index.html'])throw Error('Missing app entry point.')
 files['index.html']=Buffer.from(nativeHTML(files['index.html'].toString('utf8')))
 const zip=Buffer.from(zipSync(files,{level:6})),checksum=hash(zip)
 const aes=randomBytes(16),iv=randomBytes(16),cipher=createCipheriv('aes-128-cbc',aes,iv)
 const encrypted=Buffer.concat([cipher.update(zip),cipher.final()])
 const rsa=b=>privateEncrypt({key:privateKey,padding:constants.RSA_PKCS1_PADDING},b)
 const artifactHash=hash(encrypted),version=policy.nativeVersion+'+'+sequence
 const payload={...policy,sequence,version,url:`https://evergreen-holding.vercel.app/mobile-updates/bundles/${sequence}-${artifactHash}.bin`,bytes:encrypted.length,sha256:artifactHash,checksum:rsa(Buffer.from(checksum,'hex')).toString('hex'),sessionKey:iv.toString('base64')+':'+rsa(aes).toString('base64')}
 const serialized=JSON.stringify(payload)
 const signature=sign('sha256',Buffer.from(serialized),{key:privateKey,padding:constants.RSA_PKCS1_PSS_PADDING,saltLength:32}).toString('base64')
 const dir=outputDirectory,bundles=join(dir,'bundles');mkdirSync(bundles,{recursive:true})
 writeFileSync(join(bundles,sequence+'-'+artifactHash+'.bin'),encrypted)
 writeFileSync(join(dir,'latest.json'),JSON.stringify({payload:serialized,signature})+'\n')
 return{sequence,version,bytes:encrypted.length,sha256:artifactHash,zipSha256:checksum,fileCount:Object.keys(files).length,keyVerified:true}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 if(process.env.VERCEL==='1'&&process.env.VERCEL_ENV!=='production')console.log('Preview: live-update publication disabled.')
 else{
  let key=process.env.MOBILE_OTA_SIGNING_KEY
  if(!key&&process.env.VERCEL!=='1'&&existsSync('.mobile-update-signing.local.pem'))key=readFileSync('.mobile-update-signing.local.pem','utf8')
  if(!key&&process.env.VERCEL==='1')throw Error('Missing MOBILE_OTA_SIGNING_KEY. Refusing to publish an unsigned production update.')
  if(!key)console.log('Local build: live-update export skipped without a local signing key.')
  else console.log(JSON.stringify({liveUpdate:prepareLiveUpdate({key,outputDirectory:process.env.VERCEL==='1'?'dist/mobile-updates':'output/native/live-update'})}))
 }
}
