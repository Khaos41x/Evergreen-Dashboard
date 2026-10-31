// Browser projection of native CSS + timestamp lifecycle. NOT an emulator/device test.
import {chromium} from 'playwright-core'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
mkdirSync('output/native',{recursive:true})
writeFileSync('output/native/harness.html',`<!doctype html><html lang="pt-BR" data-native="true" style="--safe-area-inset-top:28px;--safe-area-inset-bottom:24px"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><div id="root"></div><script type="module">
import React from'react';import{createRoot}from'react-dom/client';import{Root}from'/src/collaboration/Root.tsx';import{FocusTimer}from'/src/components/FocusTimer.tsx';import{useFocusSession}from'/src/state/useFocusSession.ts';import'/src/styles.css';import'/src/styles-extra.css';import'/src/home-reference.css';import'/src/collaboration/collaboration.css';import'/src/mobile/mobile.css';
function Clock(){const focus=useFocusSession();window.qaFocus=focus.session;window.qaCompletions=window.qaCompletions||0;return React.createElement('main',null,React.createElement('h1',null,'Foco — ciclo de vida QA'),React.createElement('button',{onClick:()=>focus.start({mode:'timer',durationMs:1500000,title:'Sessão sintética',description:''})},'Iniciar QA'),React.createElement('button',{onClick:focus.pause},'Pausar QA'),React.createElement('button',{onClick:focus.resume},'Retomar QA'),React.createElement(FocusTimer,{session:focus.session,onComplete:()=>{window.qaCompletions++}}));}createRoot(document.getElementById('root')).render(React.createElement(location.search?'div':React.Fragment,null,location.search?React.createElement(Clock):React.createElement(Root)));
</script></html>`)
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','scripts/vite-fixture.config.ts','--host','127.0.0.1','--port','5195','--strictPort'],{windowsHide:true,env:{...process.env,VITE_SUPABASE_URL:'https://fixture.supabase.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_only'},stdio:['ignore','pipe','pipe']})
let logs='';server.stderr.on('data',d=>logs+=d);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs)),20000);server.stdout.on('data',d=>{if(String(d).includes('5195')){clearTimeout(timer);resolve()}});server.on('error',reject)})
let browser;const results=[]
try{
 browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
 for(const width of [390,430,768,1440]){
  const context=await browser.newContext({viewport:{width,height:940},hasTouch:width<800,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/api/identity/config',r=>r.fulfill({contentType:'application/json',body:'{"google":false,"passkeys":false,"cookieSessions":true}'}));await page.route('**/api/identity/session',r=>r.fulfill({status:401,contentType:'application/json',body:'{"error":{"code":"SESSION_REQUIRED","message":"Entre novamente."}}'}))
  await page.goto('http://127.0.0.1:5195/output/native/harness.html');await page.getByRole('heading',{name:'Entrar na Evergreen',exact:true}).waitFor()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  const top=await page.locator('body').evaluate(el=>parseFloat(getComputedStyle(el).paddingTop));assert.equal(top,28)
  const inputSize=await page.getByLabel('E-mail',{exact:true}).evaluate(el=>parseFloat(getComputedStyle(el).fontSize));assert.ok(inputSize>=16)
  await page.getByRole('button',{name:'Criar uma conta',exact:true}).click();await page.getByRole('heading',{name:'Crie sua conta',exact:true}).waitFor();await page.getByLabel('Seu nome',{exact:true}).fill('Pessoa de teste com nome completo');await page.screenshot({path:`output/native/signup-${width}.png`,fullPage:true})
  await page.goto('http://127.0.0.1:5195/output/native/harness.html?focus=1');await page.getByRole('button',{name:'Iniciar QA'}).click();await page.waitForFunction(()=>window.qaFocus?.status==='running');await page.waitForFunction(()=>document.querySelector('.hero-timer strong')?.textContent==='25:00')
  const started=await page.evaluate(()=>window.qaFocus.startedAt)
  await page.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+600000;window.dispatchEvent(new Event('evergreen:resume'))});await page.waitForFunction(()=>document.querySelector('.hero-timer strong')?.textContent==='15:00')
  await page.getByRole('button',{name:'Pausar QA'}).click();await page.waitForFunction(()=>window.qaFocus?.status==='paused');await page.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+300000;window.dispatchEvent(new Event('evergreen:resume'))});assert.equal(await page.locator('.hero-timer strong').innerText(),'15:00')
  await page.getByRole('button',{name:'Retomar QA'}).click();await page.waitForFunction(()=>window.qaFocus?.status==='running');assert.ok(await page.evaluate(()=>window.qaFocus.accumulatedPausedMs>=300000));await page.screenshot({path:`output/native/focus-${width}.png`,fullPage:true})
  await page.reload();await page.waitForFunction(()=>window.qaFocus?.status==='running');assert.equal(await page.evaluate(()=>window.qaFocus.startedAt),started)
  await page.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+3600000;window.dispatchEvent(new Event('evergreen:resume'))});await page.waitForFunction(()=>window.qaCompletions===1);await page.evaluate(()=>{window.dispatchEvent(new Event('evergreen:resume'));window.dispatchEvent(new Event('evergreen:resume'))});assert.equal(await page.evaluate(()=>window.qaCompletions),1)
  assert.deepEqual(errors,[]);results.push({width,safeInsetTop:true,inputNoIOSZoom:true,signupNoOverflow:true,backgroundTimestampAdvance:true,pauseExcludesBackgroundTime:true,timestampPersistsReload:true,completionOnlyOnce:true,pageErrors:errors});await context.close()
 }
 writeFileSync('output/native/browser-results.json',JSON.stringify({environment:'Desktop browser with native CSS and synthetic time; NOT Android/iOS execution',results},null,2));console.log(JSON.stringify(results,null,2))
}finally{await browser?.close();server.kill()}
