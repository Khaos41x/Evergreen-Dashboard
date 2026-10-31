// Real React/CSS in desktop Chromium with synthetic native bridge and release HTTP responses.
// This is not Android WebView/device execution.
import {chromium} from 'playwright-core'
import {spawn,spawnSync} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const dir='output/native/updates';mkdirSync(dir,{recursive:true})
writeFileSync(dir+'/harness.html',`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><div id="root"></div><script>
const params=new URLSearchParams(location.search),platform=params.get('platform')||'android';if(platform==='android')window.androidBridge={};if(platform==='ios')window.webkit={messageHandlers:{bridge:{}}};if(platform!=='web'){document.documentElement.dataset.native='true';document.documentElement.style.setProperty('--safe-area-inset-top','28px');document.documentElement.style.setProperty('--safe-area-inset-bottom','24px')}
window.qaDownloads=[];window.Capacitor={PluginHeaders:[{name:'App',methods:[{name:'getInfo',rtype:'promise'}]},{name:'Browser',methods:[{name:'open',rtype:'promise'}]},{name:'EvergreenSession',methods:[{name:'request',rtype:'promise'}]}],nativePromise:async(plugin,method,options)=>{
if(plugin==='App')return{id:'com.evergreen.holdings',build:params.get('build')||'1',version:'1.0'};
if(plugin==='Browser'){if(window.qaFailOpen)throw Error('Fixture browser unavailable');window.qaDownloads.push(options.url);return{}}
if(plugin==='EvergreenSession'){const config=options.path.includes('/config');return{status:config?200:401,headers:{'content-type':'application/json'},body:btoa(JSON.stringify(config?{google:false,passkeys:false,cookieSessions:true}:{error:{code:'SESSION_REQUIRED',message:'Entre novamente.'}}))}}
throw Error('Unexpected fixture plugin')
}};
</script><script type="module">import React from'react';import{createRoot}from'react-dom/client';import{Root}from'/src/collaboration/Root.tsx';import'/src/styles.css';import'/src/styles-extra.css';import'/src/home-reference.css';import'/src/mobile/mobile.css';createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(Root)));</script></html>`)
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','scripts/vite-fixture.config.ts','--host','127.0.0.1','--port','5197','--strictPort'],{windowsHide:true,env:{...process.env,VITE_SUPABASE_URL:'https://fixture.supabase.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_only'},stdio:['ignore','pipe','pipe']})
let logs='';server.stderr.on('data',d=>logs+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs)),20000);server.stdout.on('data',d=>{if(String(d).includes('5197')){clearTimeout(timer);resolve()}});server.on('error',reject)})
const origin='https://evergreen-android-downloads.vercel.app'
const base={schema:1,appId:'com.evergreen.holdings',platform:'android',versionCode:2,versionName:'1.0.1',downloadUrl:origin+'/releases/2/Evergreen.apk',sha256:'a'.repeat(64),bytes:11000000}
let browser;const results=[]
try{
 browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
 for(const width of [390,430,790,1440]){
  const context=await browser.newContext({viewport:{width,height:940},hasTouch:width<800,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];let latest={...base},checks=0
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/api/identity/config',r=>r.fulfill({contentType:'application/json',body:'{"google":false,"passkeys":false,"cookieSessions":true}'}))
  await page.route('**/api/identity/session',r=>r.fulfill({status:401,contentType:'application/json',body:'{"error":{"code":"SESSION_REQUIRED","message":"Entre novamente."}}'}))
  await page.route(origin+'/latest.json',r=>{checks++;return r.fulfill({contentType:'application/json',body:JSON.stringify(latest),headers:{'Access-Control-Allow-Origin':'*'}})})
  await page.goto('http://127.0.0.1:5197/'+dir+'/harness.html')
  await page.getByRole('heading',{name:'Entrar na Evergreen',exact:true}).waitFor()
  const notice=page.getByRole('complementary',{name:'Atualização do aplicativo'})
  await notice.waitFor();await page.evaluate(()=>document.fonts.ready)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  const box=await notice.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=28&&box.y+box.height<=940-24)
  for(const name of ['Baixar atualização','Mais tarde']){const b=await notice.getByRole('button',{name,exact:true}).boundingBox();assert.ok(b.height>=48)}
  const content=await page.locator('.mobile-app-content').boundingBox();assert.ok(content.y>=box.y+box.height)
  for(const name of ['Criar uma conta','Esqueci minha senha','Entrar com código de e-mail']){const button=page.getByRole('button',{name,exact:true});await button.scrollIntoViewIfNeeded();const rect=await button.boundingBox();assert.ok(rect.y>=box.y+box.height)}
  await page.locator('.mobile-app-content').evaluate(el=>el.scrollTop=0)
  if(!process.env.SKIP_UPDATE_CAPTURES)await page.screenshot({path:dir+`/notice-${width}.png`,fullPage:true})
  await page.evaluate(()=>window.qaFailOpen=true)
  await notice.getByRole('button',{name:'Baixar atualização',exact:true}).click()
  await notice.getByRole('alert').getByText('Não foi possível abrir o download. Tente novamente.').waitFor()
  const errorBox=await notice.boundingBox(),errorContent=await page.locator('.mobile-app-content').boundingBox();assert.ok(errorContent.y>=errorBox.y+errorBox.height)
  if(width===390&&!process.env.SKIP_UPDATE_CAPTURES)await page.screenshot({path:dir+'/error-390.png',fullPage:true})
  await page.evaluate(()=>window.qaFailOpen=false)
  await notice.getByRole('button',{name:'Baixar atualização',exact:true}).focus();await page.keyboard.press('Enter')
  await page.waitForFunction(()=>window.qaDownloads.length===1)
  assert.deepEqual(await page.evaluate(()=>window.qaDownloads),[base.downloadUrl])
  const count=checks;await page.evaluate(()=>{window.dispatchEvent(new Event('evergreen:resume'));window.dispatchEvent(new Event('online'))});assert.equal(checks,count)
  await notice.getByRole('button',{name:'Mais tarde',exact:true}).click();await notice.waitFor({state:'hidden'})
  await page.reload();await page.getByRole('heading',{name:'Entrar na Evergreen',exact:true}).waitFor();await page.waitForFunction(()=>!!localStorage.getItem('evergreen.android-update-reminder.v1'));await page.waitForTimeout(150);assert.equal(await notice.count(),0)
  latest={...base,versionCode:3,versionName:'1.0.2',downloadUrl:origin+'/releases/3/Evergreen.apk'}
  await page.evaluate(()=>{const original=Date.now;Date.now=()=>original()+7*60*60*1000;window.dispatchEvent(new Event('evergreen:resume'))});await notice.waitFor();await notice.getByText('Evergreen 1.0.2.',{exact:false}).waitFor()
  assert.deepEqual(errors,[]);results.push({width,updateVisible:true,noOverflow:true,touchTargets:true,keyboardDownload:true,downloadFailureRetry:true,deferPersists:true,newBuildOverridesDefer:true,resumeThrottled:true,pageErrors:errors});await context.close()
 }
 for(const scenario of [{name:'current',build:'2'},{name:'newer-installed',build:'3'},{name:'offline',status:503},{name:'untrusted-url',bad:true},{name:'web',platform:'web'},{name:'ios',platform:'ios'}]){
  const context=await browser.newContext({viewport:{width:390,height:940}}),page=await context.newPage();let checks=0;const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/api/identity/config',r=>r.fulfill({contentType:'application/json',body:'{"google":false,"passkeys":false,"cookieSessions":true}'}));await page.route('**/api/identity/session',r=>r.fulfill({status:401,contentType:'application/json',body:'{"error":{"code":"SESSION_REQUIRED","message":"Entre novamente."}}'}))
  await page.route(origin+'/latest.json',r=>{checks++;return r.fulfill({status:scenario.status||200,contentType:'application/json',body:JSON.stringify({...base,...(scenario.bad?{downloadUrl:'https://evil.invalid/app.apk'}:{})}),headers:{'Access-Control-Allow-Origin':'*'}})})
  await page.goto('http://127.0.0.1:5197/'+dir+'/harness.html?'+new URLSearchParams({build:scenario.build||'1',platform:scenario.platform||'android'}));await page.getByRole('heading',{name:'Entrar na Evergreen',exact:true}).waitFor();await page.waitForTimeout(250)
  assert.equal(await page.getByRole('complementary',{name:'Atualização do aplicativo'}).count(),0)
  if(scenario.platform)assert.equal(checks,0);else assert.ok(checks>0)
  assert.deepEqual(errors,[]);results.push({scenario:scenario.name,noNotice:true,loginAvailable:true,manifestChecks:checks,pageErrors:errors});await context.close()
 }
 writeFileSync(dir+'/browser-results.json',JSON.stringify({environment:'Desktop Chromium with synthetic native bridge and HTTP fixtures; update notice reserves its own layout space. NOT Android device runtime.',results},null,2));console.log(JSON.stringify(results,null,2))
}finally{await browser?.close();if(process.platform==='win32'&&server.pid)spawnSync('taskkill.exe',['/PID',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else server.kill()}
