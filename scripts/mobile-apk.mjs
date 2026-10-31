import {mobileDoctor} from './mobile-doctor.mjs'
import {spawn} from 'node:child_process'
import {copyFileSync,existsSync,writeFileSync} from 'node:fs'
const report=mobileDoctor()
if(!report.android.ready){
 const result={status:'BLOCKED_ENVIRONMENT',apkGenerated:false,blockers:report.android.blockers};writeFileSync('output/native/apk-result.json',JSON.stringify(result,null,2));console.error(JSON.stringify(result,null,2));process.exitCode=1
}else{
 const cmd=process.platform==='win32'?'cmd.exe':'./gradlew',args=process.platform==='win32'?['/d','/s','/c','gradlew.bat assembleDebug --no-daemon']:['assembleDebug','--no-daemon']
 const child=spawn(cmd,args,{cwd:'android',windowsHide:true,stdio:'inherit',env:{...process.env,ANDROID_HOME:report.android.sdk}})
 child.on('exit',code=>{const apk='android/app/build/outputs/apk/debug/app-debug.apk';if(code===0&&existsSync(apk)){copyFileSync(apk,'output/native/Evergreen-Holdings-debug.apk');writeFileSync('output/native/apk-result.json',JSON.stringify({status:'DEBUG_APK_BUILT',apkGenerated:true,installedOrDeviceTested:false},null,2))}process.exitCode=code||0})
}
