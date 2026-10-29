// Component fixtures only; no hosted Supabase or user browser access.
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
mkdirSync('output/playwright',{recursive:true})
writeFileSync('output/playwright/review.html',`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module">
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{FocusDialog}from'/src/components/FocusDialog.tsx';import{SessionCompleteDialog}from'/src/components/FocusSessionDialogs.tsx';import{WorkModule}from'/src/features/productivity/WorkModule.tsx';
import '/src/styles.css';import '/src/styles-extra.css';import '/src/collaboration/collaboration.css';import '/src/features/productivity/productivity.css';
const session={mode:'timer',status:'running',startedAt:1,pausedAt:null,accumulatedPausedMs:0,durationMs:1500000,title:'Fixture focus',description:''};
function Harness(){const[modal,setModal]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('');function request(){setPending(true);setError('');setTimeout(()=>{setPending(false);setError('Fixture request failed; session unchanged')},800)}return React.createElement(React.Fragment,null,
React.createElement('button',{onClick:()=>{setError('');setModal('start')}},'Open start'),React.createElement('button',{onClick:()=>{setError('');setModal('summary')}},'Open summary'),
React.createElement(FocusDialog,{open:modal==='start',tasks:[],objectives:[],pending,error,onClose:()=>setModal(''),onStart:request}),
React.createElement(SessionCompleteDialog,{open:modal==='summary',session,durationMs:65000,pending,error,onClose:()=>setModal(''),onSave:request}),
React.createElement(WorkModule,{members:[],records:['2026-09-30','2026-10-15','2026-11-01'].map((date,i)=>({id:String(i),kind:'task',completed_at:date+'T12:00:00',assignee_id:null})),domain:{focus:[],activity:[],error:''}}))}createRoot(document.getElementById('root')).render(React.createElement(Harness));
</script>`)
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','scripts/vite-fixture.config.ts','--host','127.0.0.1','--port','5188','--strictPort'],{windowsHide:true,stdio:['ignore','pipe','pipe']})
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(logs)),15000);server.stdout.on('data',d=>{if(String(d).includes('5188')){clearTimeout(timer);resolve()}});server.on('error',reject)})
let browser
const results=[]
try{
 browser=await chromium.launch({executablePath:process.env.BROWSER_PATH??'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:5188/output/playwright/review.html')
  for(const [openerName,dialogName,submitName]of[['Open start','Start Focus','Start'],['Open summary','Session complete','Save session']]){
   const opener=page.getByRole('button',{name:openerName,exact:true});await opener.click()
   const modal=page.getByRole('dialog',{name:dialogName,exact:true});await modal.waitFor()
   await page.waitForFunction(()=>document.activeElement?.closest('[role=dialog]'))
   const controls=modal.locator('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')
   await controls.first().focus();await page.keyboard.press('Shift+Tab');assert.ok(await controls.last().evaluate(e=>document.activeElement===e))
   await page.keyboard.press('Tab');assert.ok(await controls.first().evaluate(e=>document.activeElement===e))
   await modal.getByRole('button',{name:submitName,exact:true}).click();await page.keyboard.press('Escape');assert.ok(await modal.isVisible());assert.ok(await modal.locator('.mini-actions .create-button').isDisabled())
   await modal.getByRole('alert').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   await page.screenshot({path:'output/playwright/review-'+dialogName.replaceAll(' ','-')+'-'+width+'.png',fullPage:true})
   await page.keyboard.press('Escape');await modal.waitFor({state:'hidden'});assert.ok(await opener.evaluate(e=>document.activeElement===e))
  }
  await page.getByLabel('Period',{exact:true}).selectOption('custom');await page.getByLabel('From',{exact:true}).fill('2026-10-01');await page.getByLabel('Until',{exact:true}).fill('2026-10-31')
  assert.equal(await page.locator('.domain-stats div').filter({has:page.locator('dt',{hasText:'Tasks completed'})}).locator('dd').textContent(),'1')
  assert.deepEqual(errors,[]);results.push({width,focusKeyboardTrap:true,pendingProtected:true,failureDismissal:true,openerRestored:true,historicalCompletionBounds:true,pageErrors:errors});await page.close()
 }
 writeFileSync('output/productivity-review-results.json',JSON.stringify({environment:'Component fixtures only; hosted services NOT_VERIFIED',results},null,2));console.log(JSON.stringify(results,null,2))
}finally{await browser?.close();server.kill()}

