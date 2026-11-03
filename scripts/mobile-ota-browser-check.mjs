// Real browser/CSP/WebCrypto and published UI; updater lifecycle is a controlled plugin double.
import {chromium} from 'playwright-core'
import {spawn} from 'node:child_process'
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {nativeCsp} from './native-csp.mjs'
mkdirSync('output/native',{recursive:true})
writeFileSync('output/native/ota-browser.html','<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="'+nativeCsp+'"></head><body><script type="module" src="/output/native/ota-browser.js"></script></body></html>')
writeFileSync('output/native/ota-browser.js',"import * as ota from '/src/mobile/live-updates.ts';window.qaOTA=ota;")
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','scripts/vite-fixture.config.ts','--host','127.0.0.1','--port','5194','--strictPort'],{windowsHide:true,env:{...process.env,VITE_SUPABASE_URL:'https://fixture.supabase.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_only'},stdio:['ignore','pipe','pipe']})
let logs='';server.stderr.on('data',d=>logs+=d)
await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error(logs)),20000);server.stdout.on('data',d=>{if(String(d).includes('5194')){clearTimeout(t);resolve()}});server.on('error',reject)})
let browser
try{
 browser=await chromium.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5194/output/native/ota-browser.html');await page.waitForFunction(()=>!!window.qaOTA)
 const crypto=await page.evaluate(async()=>{
  const ota=window.qaOTA,payload=await ota.fetchLiveManifest(),calls=[]
  const plugin={current:async()=>({bundle:{id:'builtin',version:'1.2.1'}}),list:async()=>({bundles:[]}),download:async o=>{calls.push('download');return{id:'fixture-bundle',version:o.version}},next:async()=>calls.push('next')}
  const staged=await ota.checkLiveUpdate(plugin,{id:'com.evergreen.holdings',build:'5'},async()=>payload)
  const response=await fetch(ota.liveUpdateManifest,{credentials:'omit',cache:'no-store'}),envelope=await response.json()
  let tamperDenied=false;try{await ota.verifyLiveManifest({...envelope,payload:envelope.payload+' '})}catch{tamperDenied=true}
  return{actualPublishedManifest:true,browserSignatureVerified:true,nativeCspAllowsManifest:true,staged,calls,tamperDenied,sequence:payload.sequence}
 })
 assert.equal(crypto.staged,'staged');assert.deepEqual(crypto.calls,['download','next']);assert.equal(crypto.tamperDenied,true);assert.deepEqual(errors,[]);await page.close()
 const ui=[]
 for(const width of [390,1440]){
  const p=await browser.newPage({viewport:{width,height:940}}),errs=[],requests=[];p.on('pageerror',e=>errs.push(e.message));p.on('request',r=>requests.push(r.url()))
  await p.goto('https://evergreen-holding.vercel.app/');await p.getByRole('heading',{name:'Entrar na Evergreen',exact:true}).waitFor()
  await p.getByRole('button',{name:'Criar uma conta',exact:true}).click();await p.getByRole('heading',{name:'Crie sua conta',exact:true}).waitFor()
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errs,[])
  assert.equal(requests.some(u=>/WorldScene|three\.module/.test(u)),false)
  await p.screenshot({path:'output/native/published-signup-'+width+'.png',fullPage:true})
  ui.push({width,publishedSignup:true,noOverflow:true,noPageErrors:true,no3DDuringAuth:true});await p.close()
 }
 const report={environment:'Actual browser verifies production signature under packaged CSP. Download/next use a controlled plugin double. Public production signup UI, no form submission or real login.',crypto,ui}
 writeFileSync('output/native/ota-browser-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
}finally{await browser?.close();server.kill()}
