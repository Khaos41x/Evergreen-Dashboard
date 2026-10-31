import {mobileDoctor} from './mobile-doctor.mjs'
import {spawn} from 'node:child_process'
import {copyFileSync,existsSync,readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {delimiter,join} from 'node:path'
const report=mobileDoctor()
if(!report.android.ready){
 const result={status:'BLOCKED_ENVIRONMENT',apkGenerated:false,blockers:report.android.blockers};writeFileSync('output/native/apk-result.json',JSON.stringify(result,null,2));console.error(JSON.stringify(result,null,2));process.exitCode=1
}else{
 const cmd=process.platform==='win32'?'cmd.exe':'./gradlew',args=process.platform==='win32'?['/d','/s','/c','gradlew.bat assembleDebug --no-daemon']:['assembleDebug','--no-daemon']
 const env={...process.env,JAVA_HOME:report.android.javaHome,ANDROID_HOME:report.android.sdk,ANDROID_SDK_ROOT:report.android.sdk,PATH:join(report.android.javaHome,'bin')+delimiter+process.env.PATH}
 if(report.android.gradleUserHome)env.GRADLE_USER_HOME=report.android.gradleUserHome
 if(report.android.windowsCertificateStore)env.JAVA_TOOL_OPTIONS=(env.JAVA_TOOL_OPTIONS||'')+' -Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NONE'
 if(report.android.javaSocketTempDir)env.JAVA_TOOL_OPTIONS=(env.JAVA_TOOL_OPTIONS||'')+' "-Djdk.net.unixdomain.tmpdir='+report.android.javaSocketTempDir+'"'
 const child=spawn(cmd,args,{cwd:'android',windowsHide:true,stdio:'inherit',env})
 child.on('error',error=>{writeFileSync('output/native/apk-result.json',JSON.stringify({status:'BUILD_FAILED',apkGenerated:false,error:error.message},null,2));process.exitCode=1})
 child.on('exit',code=>{const apk='android/app/build/outputs/apk/debug/app-debug.apk';if(code===0&&existsSync(apk)){const output='output/native/Evergreen-Holdings-debug.apk';copyFileSync(apk,output);const bytes=readFileSync(output);writeFileSync('output/native/apk-result.json',JSON.stringify({status:'DEBUG_APK_BUILT',apkGenerated:true,builtAt:new Date().toISOString(),artifact:output,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),buildType:'debug',installedOrDeviceTested:false},null,2))}else writeFileSync('output/native/apk-result.json',JSON.stringify({status:'BUILD_FAILED',apkGenerated:false,exitCode:code},null,2));process.exitCode=code===0?0:1})
}
