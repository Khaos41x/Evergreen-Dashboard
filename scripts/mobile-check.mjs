import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true })
const results = []
mkdirSync('output/playwright', { recursive:true })
for (const width of [320,375,390,430,768,1440]) {
  const context = await browser.newContext({viewport:{width,height:900},hasTouch:width<=768})
  const page = await context.newPage()
  const errors=[]; page.on('pageerror',error=>errors.push(error.message))
  await page.goto(process.argv[2] ?? 'http://localhost:5173', {waitUntil:'networkidle'})
  await page.getByRole('heading',{name:/^(Entrar na Evergreen)$/}).waitFor()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Auth overflow ${width}`)
  await page.screenshot({path:`output/playwright/auth-${width}.png`,fullPage:true,animations:'disabled'})
  // A fresh isolated browser context; never clear the user's local storage.
  await page.evaluate(()=>localStorage.setItem('evergreen.workspace.v1',JSON.stringify({tasks:[],projects:[{id:'keep',name:'Preserved project'}],objectives:[],inbox:[],activities:[]})))
  await page.getByRole('button',{name:'Abrir produtividade pessoal',exact:true}).click()
  await page.locator('.hero-timer').waitFor({state:'visible'})
  if(width<=768) {
    const menu=page.getByRole('button',{name:'Open navigation',exact:true}); if(await menu.isVisible()) await menu.click()
  }
  await page.getByRole('button',{name:'Tasks',exact:true}).click()
  await page.getByRole('button',{name:'New task',exact:true}).click()
  await page.getByPlaceholder('Task title',{exact:true}).fill(`Mobile task ${width}`)
  await page.getByRole('button',{name:'Create task',exact:true}).click()
  assert.ok(await page.getByText(`Mobile task ${width}`,{exact:true}).first().isVisible())
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Local tasks overflow ${width}`)
  await page.reload({waitUntil:'networkidle'})
  if(width<=768) {const menu=page.getByRole('button',{name:'Open navigation',exact:true}); if(await menu.isVisible()) await menu.click()}
  await page.getByRole('button',{name:'Tasks',exact:true}).click()
  assert.ok(await page.getByText(`Mobile task ${width}`,{exact:true}).first().isVisible())
  assert.ok((await page.evaluate(()=>localStorage.getItem('evergreen.workspace.v1'))).includes('Preserved project'))
  await page.screenshot({path:`output/playwright/local-tasks-${width}.png`,fullPage:true,animations:'disabled'})
  await page.getByRole('button',{name:'Abrir colaboração',exact:true}).click()
  await page.getByRole('heading',{name:/^(Entrar na Evergreen)$/}).waitFor()
  assert.deepEqual(errors,[])
  results.push({width,authNoOverflow:true,localTaskCreate:true,reloadPersistence:true,existingDataPreserved:true,localTasksNoOverflow:true,consoleErrors:errors})
  await context.close()
}
await browser.close()
writeFileSync('output/mobile-results.json',JSON.stringify({environment:'real browser; no Supabase configured; local and blocked-state checks only',results},null,2))
console.log(JSON.stringify(results,null,2))
