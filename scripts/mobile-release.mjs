import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {resolve,join} from 'node:path'
import {mobileDoctor} from './mobile-doctor.mjs'

// Preparation only: publishing is a separate, explicitly targeted Vercel command.
const doctor=mobileDoctor()
if(!doctor.android.ready)throw new Error('Execute mobile:doctor e configure JDK/SDK antes de preparar a versão.')
const origin='https://evergreen-android-downloads.vercel.app'
const policy=JSON.parse(readFileSync('resources/android-release.json','utf8'))
const gradle=readFileSync('android/app/build.gradle','utf8')
const versionCode=Number(gradle.match(/versionCode\s+(\d+)/)?.[1])
const versionName=gradle.match(/versionName\s+"([\d.]+)"/)?.[1]
const apk=resolve('output/native/Evergreen-Holdings-debug.apk')
const bytes=readFileSync(apk),sha256=createHash('sha256').update(bytes).digest('hex')
const run=(file,args)=>{
 const result=spawnSync(file,args,{encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024})
 if(result.error||result.status!==0)throw new Error(result.error?.message||result.stderr||'A validação do APK falhou.')
 return result.stdout
}
const signature=run(join(doctor.android.javaHome,'bin',process.platform==='win32'?'java.exe':'java'),['-jar',join(doctor.android.sdk,'build-tools','36.0.0','lib','apksigner.jar'),'verify','--verbose','--print-certs',apk])
const certificates=[...signature.matchAll(/certificate SHA-256 digest: ([a-f0-9]{64})/g)].map(m=>m[1])
if(certificates.length!==1||certificates[0]!==policy.signingCertificateSha256)throw new Error('Assinatura diferente da primeira versão. Não publique este APK como atualização.')
const badging=run(join(doctor.android.sdk,'build-tools','36.0.0',process.platform==='win32'?'aapt2.exe':'aapt2'),['dump','badging',apk])
const pkg=badging.match(/package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/)
if(!pkg||pkg[1]!==policy.appId||Number(pkg[2])!==versionCode||pkg[3]!==versionName)throw new Error('O APK não corresponde à versão do código. Execute mobile:sync e mobile:apk.')
const site=resolve(process.argv[2]||'output/native/download-site'),output=join(site,'.vercel','output'),staticDir=join(output,'static')
const manifest={schema:1,appId:policy.appId,platform:'android',versionCode,versionName,downloadUrl:`${origin}/releases/${versionCode}/Evergreen.apk`,sha256,bytes:bytes.length,signingCertificateSha256:certificates[0]}
const latest=join(staticDir,'latest.json')
if(existsSync(latest)){
 const previous=JSON.parse(readFileSync(latest,'utf8'))
 if(previous.versionCode>versionCode||(previous.versionCode===versionCode&&previous.sha256!==sha256))throw new Error('Incremente versionCode antes de preparar outro APK. A versão publicada não pode ser sobrescrita.')
}
const releaseDir=join(staticDir,'releases',String(versionCode)),versionedApk=join(releaseDir,'Evergreen.apk')
if(existsSync(versionedApk)&&createHash('sha256').update(readFileSync(versionedApk)).digest('hex')!==sha256)throw new Error('O arquivo desta versão já existe com outro conteúdo.')
mkdirSync(releaseDir,{recursive:true})
copyFileSync(apk,versionedApk);copyFileSync(apk,join(staticDir,'Evergreen.apk'))
writeFileSync(latest,JSON.stringify(manifest,null,2)+'\n')
writeFileSync(join(staticDir,'SHA256.txt'),`${sha256}  Evergreen.apk\n`)
writeFileSync(join(staticDir,'index.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Evergreen para Android</title><body><main><h1>Evergreen para Android</h1><p><a href="/Evergreen.apk" download>Baixar versão ${versionName} — ${(bytes.length/1000000).toFixed(1).replace('.',',')} MB</a></p><p>APK de teste. Android 7 ou superior. Abra o arquivo baixado e confirme a instalação. Não desinstale a versão anterior.</p><p>Inclui o cadastro atual e o recebimento automático de atualizações web assinadas ao fechar e abrir o app. Mudanças nativas ainda exigem outro APK. Instalação em aparelho ainda não homologada. Push não ativado.</p><p><a href="/SHA256.txt">SHA-256 do arquivo</a></p></main></body></html>`)
const headers={'Content-Type':'application/vnd.android.package-archive','Content-Disposition':'attachment; filename="Evergreen-Holdings.apk"','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}
writeFileSync(join(output,'config.json'),JSON.stringify({version:3,routes:[{src:'/latest.json',headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}},{src:'/Evergreen.apk',headers:{...headers,'Cache-Control':'no-store'}},{src:'/releases/[0-9]+/Evergreen.apk',headers:{...headers,'Cache-Control':'public, max-age=31536000, immutable'}},{handle:'filesystem'}]},null,2))
writeFileSync('output/native/release-preparation.json',JSON.stringify({preparedAt:new Date().toISOString(),site,manifest,signatureVerified:true,packageVerified:true,published:false},null,2))
console.log(JSON.stringify({site,manifest,signatureVerified:true,packageVerified:true,published:false},null,2))
