// Isolated HTTP fixtures plus real software WebGL. Not authenticated hosted E2E.
import {chromium} from 'playwright-core'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const atlas=process.env.EG_LIBRARY_THEME==='atlas'
mkdirSync('output/library',{recursive:true})
writeFileSync('output/library/harness.html',`<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module">
import React from'react';import{createRoot}from'react-dom/client';import HoldingOffice from'/src/features/holding/HoldingOffice.tsx';import{useFounderPresence}from'/src/features/holding/useFounderPresence.ts';import'/src/styles.css';import'/src/styles-extra.css';import'/src/collaboration/collaboration.css';import'/src/features/appearance/themes.css';import'/src/features/appearance/atlas.css';import'@fontsource-variable/geist';${atlas?"document.documentElement.dataset.theme='atlas';":""}function Harness(){useFounderPresence(['group-fixture']);return React.createElement('div',{style:{height:'100dvh',display:'flex'}},React.createElement(HoldingOffice,{group:'group-fixture',name:'Evergreen Group QA',userId:'founder-a',onBack:()=>{window.back=true},onEconomy:()=>{window.vault=true},onFounders:()=>{}}))}createRoot(document.getElementById('root')).render(React.createElement(Harness));</script></html>`)
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','scripts/vite-fixture.config.ts','--host','127.0.0.1','--port','5191','--strictPort'],{windowsHide:true,env:{...process.env,VITE_SUPABASE_URL:'https://fixture.supabase.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_only'},stdio:['ignore','pipe','pipe']})
let logs='';server.stderr.on('data',d=>logs+=d);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs)),20000);server.stdout.on('data',d=>{if(String(d).includes('5191')){clearTimeout(timer);resolve()}});server.on('error',reject)})
let browser;const results=[]
try{
 browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']})
 for(const width of [390,763,1238,1440]){
  const context=await browser.newContext({viewport:{width,height:width===763?451:width===1238?715:940},hasTouch:width===390,reducedMotion:'no-preference'}),page=await context.newPage(),errors=[],calls=[];let denied=false
  const people=[{id:'founder-a',name:'Davy Peixoto Medeiros QA',officeName:'Escritório executivo do presidente',seat:0,seatNumber:1,presence:'online',jobTitle:'Chairman · assento 1',company:'Evergreen Group QA',focus:'',lastSeen:new Date().toISOString()},{id:'founder-b',name:'Miguel Mármore QA',seat:1,seatNumber:2,presence:'away',jobTitle:'Chairman · assento 2',company:'Evergreen Group QA',focus:''},{id:'pending-seat',name:'Assento 3 · aguardando titular',seat:2,seatNumber:3,vacant:true,presence:'unknown',jobTitle:'Chairman · assento 3',company:'Evergreen Group QA',focus:''}]
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/api/backend?**',async route=>{const req=route.request(),url=new URL(new URL(req.url()).searchParams.get('target')||new URL(req.url()).searchParams.get('path'),'https://fixture.invalid'),method=url.pathname.split('/').at(-1),body=req.headers()['content-type']?.includes('json')?req.postDataJSON():{};calls.push({method,body});if(method==='eg_library_heartbeat')return route.fulfill({contentType:'application/json',body:'null'});if(method==='eg_founder_library'){if(denied)return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'42501',message:'A biblioteca é exclusiva dos titulares dos três assentos de fundadores.'})});return route.fulfill({contentType:'application/json',body:JSON.stringify({scene:'founders-library',members:people,tasks:[],projects:[],activity:[],channels:[]})})}return route.fulfill({contentType:'application/json',body:'[]'})})
  await page.goto('http://127.0.0.1:5191/output/library/harness.html');await page.getByRole('heading',{name:'Biblioteca dos fundadores',exact:true}).waitFor();await page.waitForFunction(()=>Number(document.querySelector('[data-testid=world-renderer]')?.dataset.frames)>0)
  assert.equal(await page.locator('[data-world-node^="member:"]').count(),3);assert.ok(calls.some(c=>c.method==='eg_library_heartbeat'&&c.body.p_state==='online'));assert.equal(calls.some(c=>c.method==='eg_holding_office'||c.method==='eg_office_seats'),false)
  const renderer=page.getByTestId('world-renderer');await page.getByRole('button',{name:'Recentralizar câmera',exact:true}).click();await page.waitForTimeout(400)
  // Camera-only movement reuses the static shadow map; opening the vault still invalidates it.
  const quality=page.getByRole('combobox',{name:'Qualidade gráfica',exact:true})
  if(atlas){
   await quality.click()
   await page.getByRole('option',{name:'Detalhada',exact:true}).click()
  }else await quality.selectOption('high')
  await page.waitForTimeout(300)
  const shadowsBefore=Number(await renderer.getAttribute('data-shadow-updates'))
  await page.getByRole('button',{name:'Aproximar',exact:true}).click();await page.waitForTimeout(450)
  const shadowsAfter=Number(await renderer.getAttribute('data-shadow-updates'));assert.ok(shadowsBefore>0);assert.equal(shadowsAfter,shadowsBefore,'Camera zoom must reuse furniture shadows')
  await page.getByRole('button',{name:'Recentralizar câmera',exact:true}).click();await page.waitForTimeout(500)
  const bounds=await renderer.boundingBox(),vault=page.locator('[data-world-node="vault"]'),position=await vault.evaluate(el=>({x:Number(el.dataset.screenX),y:Number(el.dataset.screenY),pickX:Number(el.dataset.pickX),pickY:Number(el.dataset.pickY)}));assert.ok(position.x<bounds.width*.5&&position.y<bounds.height*.5,JSON.stringify({bounds,position}))
  for(const founder of people){const label=page.locator(`[data-world-node="member:${founder.id}"]`);assert.ok(await label.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Full founder names must wrap without clipping')}
  assert.equal(await vault.evaluate(el=>getComputedStyle(el).opacity),'1','Library vault label stays visible without hover')
  const face = {x: bounds.x + position.pickX, y: bounds.y + position.pickY}
  for (const label of await page.locator('[data-world-node^="member:"]').all()) {
   const box = await label.boundingBox()
   assert.ok(face.x < box.x || face.x > box.x + box.width || face.y < box.y || face.y > box.y + box.height,
    'The vault door must remain visible outside all office labels')
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`output/library/scene-${width}.png`,fullPage:true});await renderer.screenshot({path:`output/library/room-${width}.png`})
  await page.getByRole('button',{name:'Ver estação de Davy Peixoto Medeiros QA',exact:true}).click();await page.getByRole('heading',{name:'Davy Peixoto Medeiros QA',exact:true}).waitFor();await page.getByText('Disponível',{exact:true}).first().waitFor();await page.getByText(/Última presença:/).waitFor();await page.getByRole('button',{name:'Fechar detalhes',exact:true}).click()
  await page.getByRole('button',{name:'Diretório 2D',exact:true}).click();await page.getByRole('button',{name:'Ver estação de Assento 3 · aguardando titular',exact:true}).click();await page.getByText('Aguardando designação de conta confirmada',{exact:true}).waitFor();await page.screenshot({path:`output/library/directory-${width}.png`,fullPage:true});await page.getByRole('button',{name:'Fechar detalhes',exact:true}).click()
  await page.getByRole('button',{name:'Sala 3D',exact:true}).click();await page.waitForFunction(()=>Number(document.querySelector('[data-testid=world-renderer]')?.dataset.frames)>0);await renderer.scrollIntoViewIfNeeded();await page.waitForTimeout(250);const newBounds=await renderer.boundingBox(),pick=await vault.evaluate(el=>({x:Number(el.dataset.pickX),y:Number(el.dataset.pickY)}));await page.mouse.click(newBounds.x+pick.x,newBounds.y+pick.y);await page.waitForFunction(()=>document.querySelector('[data-testid=world-renderer]')?.dataset.vaultState==='opening');await page.waitForFunction(()=>window.vault===true)
  denied=true;await page.reload();await page.getByRole('alert').waitFor();assert.equal(await page.locator('canvas').count(),0);await page.getByRole('button',{name:'Voltar ao Trabalho',exact:true}).click();assert.equal(await page.evaluate(()=>window.back),true)
  assert.deepEqual(errors,[]);results.push({width,threeEqualDesks:true,staticShadowReuse:true,fullLengthNamesWrap:true,persistentVaultLabel:true,pendingSeatHonest:true,serverPresenceDisplayed:true,heartbeatSent:true,vaultUpperLeft:true,vaultRaycastAndOpening:true,keyboardDirectory:true,accessDeniedNoCanvas:true,noOverflow:true,pageErrors:errors});await context.close()
 }
 const context=await browser.newContext({viewport:{width:390,height:940},reducedMotion:'reduce'});await context.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null});const page=await context.newPage();await page.route('**/api/backend?**',r=>r.fulfill({contentType:'application/json',body:r.request().url().includes('heartbeat')?'null':JSON.stringify({scene:'founders-library',members:[{id:'qa',name:'Fundador QA',seat:0,presence:'offline'}],tasks:[],projects:[],activity:[],channels:[]})}));await page.goto('http://127.0.0.1:5191/output/library/harness.html');await page.getByRole('button',{name:'Ver estação de Fundador QA',exact:true}).waitFor();assert.equal(await page.locator('canvas').count(),0);await page.getByRole('button',{name:'Abrir cofre Evergreen Finanças',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.vault===true);results.push({noWebGLKeyboardFallback:true});await context.close()
 writeFileSync('output/library/browser-results.json',JSON.stringify({environment:'Local HTTP fixtures and real software WebGL; NOT hosted user/heartbeat E2E',results},null,2));console.log(JSON.stringify(results,null,2))
}finally{await browser?.close();server.kill()}
