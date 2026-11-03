// Public browser smoke only: no extracted sessions, credentials or account writes.
import {chromium} from 'playwright-core'
import {resolve} from 'node:path'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
mkdirSync('output/pwa',{recursive:true})
const context=await chromium.launchPersistentContext(resolve('output/pwa/production-profile-'+Date.now()),{executablePath:process.env.BROWSER_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,viewport:{width:390,height:844}})
try{
 const page=await context.newPage(),origin='https://evergreen-holding.vercel.app'
 await page.goto(origin,{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Entrar na Evergreen',exact:true}).waitFor()
 assert.equal(await page.locator('meta[name="application-version"]').getAttribute('content'),'1.2.0')
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller!==null)
 const cdp=await context.newCDPSession(page);await cdp.send('Page.enable');const manifest=await cdp.send('Page.getAppManifest'),installability=await cdp.send('Page.getInstallabilityErrors')
 assert.deepEqual(manifest.errors,[]);assert.deepEqual(installability.installabilityErrors,[])
 await page.evaluate(()=>fetch('/api/identity/session',{cache:'no-store'}));await page.screenshot({path:'output/pwa/production-login-390.png',fullPage:true})
 if(process.argv.includes('--timer')){
  await page.getByRole('button',{name:'Usar apenas neste navegador',exact:true}).click();await page.locator('.hero-timer').waitFor();await page.locator('.hero-timer strong').evaluate(el=>el.style.fontFamily='Arial, sans-serif');
  const metrics=await page.locator('.hero-timer').evaluate(el=>{const r=el.getBoundingClientRect(),cx=r.x+r.width/2,cy=r.y+r.height/2,radius=r.width/2-10*r.width/el.clientWidth;return {count:getComputedStyle(el).getPropertyValue('--timer-character-count').trim(),fits:[...el.querySelectorAll('small,strong,span')].every(child=>{const b=child.getBoundingClientRect();return [[b.left,b.top],[b.right,b.top],[b.left,b.bottom],[b.right,b.bottom]].every(([x,y])=>Math.hypot(x-cx,y-cy)<=radius+2)})}});assert.equal(metrics.count,'5');assert.equal(metrics.fits,true);await page.screenshot({path:'output/pwa/production-home-fallback-390.png',fullPage:true});await page.getByRole('button',{name:'Abrir colaboração',exact:true}).click();await page.getByRole('heading',{name:'Entrar na Evergreen',exact:true}).waitFor();
 }
 await context.setOffline(true);await page.goto(origin+'/hub?offline-test=1');await page.getByRole('heading',{name:'Você está sem conexão',exact:true}).waitFor();await page.screenshot({path:'output/pwa/production-offline-390.png',fullPage:true})
 const cached=await page.evaluate(async()=>{const urls=[];for(const key of await caches.keys())for(const request of await (await caches.open(key)).keys())urls.push(new URL(request.url).pathname);return urls})
 assert.equal(cached.some(path=>path.startsWith('/api/')||['/hub','/economy','/founders','/vision','/'].includes(path)),false)
 await context.setOffline(false);await page.goto(origin+'/hub');await page.getByRole('heading',{name:'Entrar na Evergreen',exact:true}).waitFor()
 const report={environment:'Real public production URL in Chrome; no signed-in account or phone installation',version:'1.2.0',portableTimer:process.argv.includes('--timer')?'PASS (local mode on real production URL)':'not exercised',manifest:true,serviceWorker:true,installabilityErrors:installability.installabilityErrors,offlineFallback:true,reconnect:true,privateCacheEntries:false}
 writeFileSync('output/releases/1.2.0/production-pwa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
}finally{await context.close()}
