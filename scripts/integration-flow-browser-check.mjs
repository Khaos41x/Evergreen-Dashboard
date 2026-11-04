// Actual React form, isolated API transport. No provider credentials or real connections.
import {chromium} from 'playwright-core'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const origin='http://127.0.0.1:5234',results=[]
const html='<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module">import React from"react";import{createRoot}from"react-dom/client";import{Integrations}from"/src/features/holding/Integrations.tsx";import"/src/styles.css";import"/src/collaboration/collaboration.css";import"/src/features/holding/holding.css";createRoot(document.getElementById("root")).render(React.createElement("div",{className:"collab-app",style:{display:"block",overflow:"auto"}},React.createElement(Integrations,{workspace:"company-a",email:"qa@example.invalid",apps:[{id:"app-a",name:"Aplicação A",archived:false},{id:"app-b",name:"Aplicação B",archived:false}],integrations:[],from:"2026-11-01",to:"2026-11-04",refresh:async()=>{}})));</script></html>'
const vite=await createServer({configFile:false,cacheDir:'node_modules/.vite-integration-flow',plugins:[react(),{name:'integration-flow-harness',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url==='/'){res.setHeader('content-type','text/html');void server.transformIndexHtml('/',html).then(t=>res.end(t));return}next()})}}],server:{host:'127.0.0.1',port:5234,strictPort:true,watch:{ignored:['**/output/**']}}})
await vite.listen();const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true})
mkdirSync('output/integration-flow',{recursive:true})
try{for(const width of[390,1440]){
 const context=await browser.newContext({viewport:{width,height:800}}),page=await context.newPage(),errors=[],requests=[]
 let ready=true,release=null
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname,body=route.request().postDataJSON();requests.push({path,body})
  let data={companies:[{id:'book-a',name:'Livro A',role:'admin'}]}
  if(path.endsWith('/status'))data={ready,encryption:ready,storage:ready,scheduled:false,providers:['cloudflare','vercel','supabase','asaas']}
  if(path.endsWith('/discover')){await new Promise(resolve=>{release=resolve});data={resources:[{id:'resource-a',name:'Recurso A'}],limited:false}}
  if(path.endsWith('/connect'))data={id:'connection-a',state:'pending'}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)})
 })
 await page.goto(origin);await page.getByRole('heading',{name:'Conectar uma fonte',exact:true}).waitFor()
 const token=page.getByLabel('Token de leitura'),query=page.getByRole('button',{name:'Consultar recursos autorizados',exact:true}),provider=page.getByLabel('Serviço',{exact:true})
 async function discover(){await token.fill('fixture-read-credential');await query.click();await page.waitForFunction(()=>!!document.querySelector('fieldset:disabled'));assert.equal(await provider.isDisabled(),true);while(!release)await new Promise(r=>setTimeout(r,10));release();release=null;await page.getByRole('combobox',{name:/Recurso autorizado/}).waitFor();assert.equal(await token.inputValue(),'')}
 await discover();await page.getByLabel('Aplicação',{exact:true}).selectOption('app-b');assert.equal(await page.getByRole('combobox',{name:/Recurso autorizado/}).count(),0)
 await discover();await provider.selectOption('vercel');assert.equal(await page.getByRole('combobox',{name:/Recurso autorizado/}).count(),0)
 await discover();await page.getByLabel('Equipe da Vercel · opcional').fill('team-changed');assert.equal(await page.getByRole('combobox',{name:/Recurso autorizado/}).count(),0)
 await discover();await page.getByRole('button',{name:'Conectar à aplicação',exact:true}).click();await page.getByRole('status').filter({hasText:'Credencial salva.'}).waitFor();const connection=requests.findLast(r=>r.path.endsWith('/connect'));assert.equal(connection.body.application_id,'app-a');assert.equal(connection.body.provider,'vercel');assert.equal(connection.body.config.teamId,'team-changed')
 await page.screenshot({path:`output/integration-flow/connected-draft-${width}.png`,fullPage:true})
 await provider.selectOption('asaas');await page.getByLabel('Livro financeiro autorizado',{exact:true}).selectOption('book-a');await discover();await page.getByLabel('Ambiente',{exact:true}).selectOption('production');assert.equal(await page.getByRole('combobox',{name:/Recurso autorizado/}).count(),0)
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage)).then(s=>s.includes('fixture-read-credential')),false)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 ready=false;await page.reload();await page.getByRole('heading',{name:'Prepare o servidor para conectar suas fontes'}).waitFor();assert.equal(await page.getByLabel('Token de leitura').count(),0)
 assert.deepEqual(errors,[]);await page.screenshot({path:`output/integration-flow/readiness-${width}.png`,fullPage:true});results.push({width,configLockedDuringDiscovery:true,draftInvalidatedByApplicationProviderTeamAndEnvironment:true,connectionBoundToCurrentApplication:true,credentialNotInBrowserStorage:true,missingReadinessBlocksCredentialEntry:true,noOverflow:true,noPageErrors:true});await context.close()
}console.log(JSON.stringify({scope:'Local API doubles and real React/Chromium, no live provider verification',results},null,2))}finally{writeFileSync('output/integration-flow/results.json',JSON.stringify(results,null,2));await browser.close();await vite.close()}
