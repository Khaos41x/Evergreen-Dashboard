import { chromium } from 'playwright-core'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH??'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
try {
 const page=await browser.newPage()
 page.on('pageerror',e=>console.log('PAGE ERROR',e.message))
 page.on('console',m=>{if(m.type()==='error')console.log(m.text())})
 await page.goto(process.argv[2]??'http://localhost:5173')
 await page.evaluate(()=>{localStorage.setItem('evergreen.workspace.v1','{corrupt workspace');localStorage.setItem('evergreen.focus-session.v1','{corrupt focus')})
 await page.getByRole('button',{name:"Usar apenas neste navegador",exact:true}).click()
 await page.getByText('Não foi possível ler os dados locais.',{exact:false}).waitFor()
 assert.equal(await page.evaluate(()=>localStorage.getItem('evergreen.workspace.v1')),'{corrupt workspace')
 assert.equal(await page.evaluate(()=>localStorage.getItem('evergreen.focus-session.v1')),'{corrupt focus')
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Backup',exact:true}).click()]).catch(async e=>{console.log(String(e));await page.screenshot({path:'output/playwright/backup-failure.png'});throw e})
 const backup=JSON.parse(readFileSync(await download.path(),'utf8'));assert.equal(backup.workspace,'{corrupt workspace');assert.equal(backup.focus,'{corrupt focus')
 mkdirSync('output',{recursive:true});writeFileSync('output/local-preservation-results.json',JSON.stringify({status:'PASS',corruptWorkspacePreserved:true,corruptFocusPreserved:true,rawBackupDownload:true},null,2));console.log('PASS: corrupt local workspace and focus preserved; raw backup downloaded')
}finally{await browser.close()}
