import {chromium} from 'playwright-core'
import {createServer} from 'node:http'
import {readFileSync,existsSync,writeFileSync,mkdirSync} from 'node:fs'
import {resolve,extname} from 'node:path'
import assert from 'node:assert/strict'
const root=resolve('dist'),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json','.ttf':'font/ttf'}
let privateRequests=0,navigations=0
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://local').pathname
 if(path==='/api/private-proof'){privateRequests++;res.setHeader('content-type','application/json');return res.end(JSON.stringify({fixture:'PRIVATE_DATA_MUST_NOT_CACHE'}))}
 if(path==='/api/identity/config'){res.setHeader('content-type','application/json');return res.end('{"google":false,"passkeys":false,"cookieSessions":true}')}
 if(path.startsWith('/api/')){res.statusCode=401;res.setHeader('content-type','application/json');return res.end('{"error":{"code":"SESSION_REQUIRED","message":"Entre novamente."}}')}
 const navigation=path==='/'||path==='/hub'||path==='/login';if(navigation)navigations++
 const file=resolve(root,navigation?'index.html':'.'+path)
 if(!file.startsWith(root)||!existsSync(file)){res.statusCode=404;return res.end()}
 res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.setHeader('cache-control','no-store');res.end(readFileSync(file))
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port
const context=await chromium.launchPersistentContext(resolve('output/pwa/browser-profile-'+Date.now()),{executablePath:process.env.BROWSER_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,viewport:{width:390,height:844}})
mkdirSync('output/pwa',{recursive:true})
try{
 const page=await context.newPage()
 await page.goto(origin+'/hub');await page.getByRole('heading',{name:'Entrar na Evergreen',exact:true}).waitFor()
 await page.evaluate(()=>navigator.serviceWorker.ready)
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null)
 const cdp=await context.newCDPSession(page);await cdp.send('Page.enable')
 const manifest=await cdp.send('Page.getAppManifest');assert.deepEqual(manifest.errors,[])
 const data=JSON.parse(manifest.data);assert.equal(data.display,'standalone');assert.equal(data.start_url,'/hub')
 const installability=await cdp.send('Page.getInstallabilityErrors');assert.deepEqual(installability.installabilityErrors,[])
 await page.evaluate(()=>fetch('/api/private-proof').then(r=>r.json()));assert.equal(privateRequests,1)
 const before=navigations;await page.reload();assert.ok(navigations>before,'Private navigation must go to the server')
 await context.setOffline(true);await page.goto(origin+'/hub?offline-proof=1');await page.getByRole('heading',{name:'Você está sem conexão',exact:true}).waitFor()
 const urls=await page.evaluate(async()=>{const all=[];for(const key of await caches.keys())for(const request of await (await caches.open(key)).keys())all.push(new URL(request.url).pathname);return all})
 assert.equal(urls.some(path=>path.startsWith('/api/')||path==='/hub'||path==='/'),false)
 await page.screenshot({path:'output/pwa/offline-390.png',fullPage:true})
 await context.setOffline(false);await page.goto(origin+'/hub');await page.getByRole('heading',{name:'Entrar na Evergreen',exact:true}).waitFor()
 await page.evaluate(()=>sessionStorage.setItem('evergreen.local-mode','yes'))
 await page.goto(origin+'/#token_hash='+'a'.repeat(64)+'&type=recovery');await page.getByRole('button',{name:'Continuar com este link',exact:true}).waitFor()
 assert.equal(new URL(page.url()).hash,'');assert.equal(await page.locator('.local-mode-banner').count(),0)
 const report={authFragmentSkipsPersonalMode:true,environment:'Built web app in real Chrome; local HTTP/auth fixtures, not phone installation',installabilityErrors:installability.installabilityErrors,manifest:true,serviceWorker:true,privateApiNotCached:true,privateNavigationNetworkOnly:true,offlineFallback:true,reconnect:true,cacheEntries:urls}
 writeFileSync('output/pwa/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
}finally{await context.close();await new Promise(resolve=>server.close(resolve))}
