import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
export function mobileDoctor(){
 const sdk=[process.env.ANDROID_HOME,process.env.ANDROID_SDK_ROOT,process.env.LOCALAPPDATA&&join(process.env.LOCALAPPDATA,'Android','Sdk')].filter(Boolean).find(p=>existsSync(join(p,'platforms','android-36','android.jar')))
 const java=process.env.JAVA_HOME,javaExecutable=java&&join(java,'bin',process.platform==='win32'?'java.exe':'java')
 let javaVersion=null;try{const release=readFileSync(join(java,'release'),'utf8');javaVersion=Number(release.match(/JAVA_VERSION="(\d+)/)?.[1])}catch{}
 const blockers=[]
 if(!sdk)blockers.push('Android SDK Platform 36 não localizado. Instale Android Studio e o SDK 36 com Build Tools e Platform Tools.')
 if(!javaExecutable||!existsSync(javaExecutable)||!javaVersion||javaVersion<21)blockers.push('JDK 21+ não verificado. Configure JAVA_HOME para o JBR do Android Studio ou um JDK 21 instalado.')
 const result={checkedAt:new Date().toISOString(),node:process.version,capacitor:JSON.parse(readFileSync('node_modules/@capacitor/core/package.json','utf8')).version,android:{sdk:sdk||null,javaHome:java||null,javaVersion,ready:blockers.length===0,blockers},ios:{canBuildHere:process.platform==='darwin',requires:'macOS, Xcode26+, Apple signing/provisioning; iOS15+; generated Swift Package Manager project'},push:{androidConfigPresent:existsSync('android/app/google-services.json'),serverCredentialsChecked:false,iosProvisioningVerified:false},nativeRuntimeVerified:false}
 mkdirSync('output/native',{recursive:true});writeFileSync('output/native/doctor.json',JSON.stringify(result,null,2));return result
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])console.log(JSON.stringify(mobileDoctor(),null,2))
