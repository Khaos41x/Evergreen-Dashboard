// Real React form and browser against controlled HTTP doubles. No live provider access.
import {chromium} from 'playwright-core'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const origin='http://127.0.0.1:5234',results=[]
const html=`<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module">
import React,{useState} from"react";import{createRoot}from"react-dom/client";
import{Integrations}from"/src/features/holding/Integrations.tsx";import{checked,db}from"/src/collaboration/client";
import"/src/styles.css";import"/src/collaboration/collaboration.css";import"/src/features/holding/holding.css";import"/src/features/appearance/themes.css";import"/src/features/appearance/atlas.css";import"@fontsource-variable/geist";
document.documentElement.dataset.theme=new URLSearchParams(location.search).get("theme")||"atlas";
function Harness(){
 const [snapshot,setSnapshot]=useState({applications:[{id:"app-a",name:"Aplicação A",url:"https://site-a.example.invalid",archived:false},{id:"app-b",name:"Aplicação B",url:"https://site-b.example.invalid",archived:false}],integrations:[]});
 async function refresh(){setSnapshot(await checked(db().rpc("eg_information_snapshot",{p_workspace:"company-a"})))}
 return React.createElement("main",{className:"collab-app",style:{display:"block",height:"auto",overflow:"visible",padding:16}},React.createElement(Integrations,{workspace:"company-a",email:"qa@example.invalid",apps:snapshot.applications,integrations:snapshot.integrations,from:"2026-11-01",to:"2026-11-04",refresh}))
}createRoot(document.getElementById("root")).render(React.createElement(Harness));
</script></html>`
const vite=await createServer({configFile:false,cacheDir:'node_modules/.vite-integration-flow',plugins:[react(),{name:'integration-flow-harness',configureServer(server){server.middlewares.use((req,res,next)=>{if(new URL(req.url,origin).pathname==='/'){res.setHeader('content-type','text/html');void server.transformIndexHtml('/',html).then(t=>res.end(t));return}next()})}}],server:{host:'127.0.0.1',port:5234,strictPort:true,watch:{ignored:['**/output/**']}}})
await vite.listen();const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true})
mkdirSync('output/integration-flow',{recursive:true})
try{for(const {width,theme} of[{width:390,theme:'atlas'},{width:495,theme:'light'},{width:1440,theme:'atlas'}]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],requests=[]
 let ready=false,release=null,previewDenied=true,syncFails=true
 const apps=[{id:'app-a',name:'Aplicação A',url:'https://site-a.example.invalid',archived:false},{id:'app-b',name:'Aplicação B',url:'https://site-b.example.invalid',archived:false}],connections=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname,body=request.postData()?request.postDataJSON():null;requests.push({path,body})
  let data={companies:[{id:'book-a',name:'Livro A',role:'admin'}]},status=200
  if(path==='/api/backend'){
   const target=new URL(url.searchParams.get('target')||url.searchParams.get('path'),'https://fixture.invalid').pathname
   if(target.endsWith('/eg_holding_action')){assert.equal(body.p_workspace,'company-a');assert.equal(body.p_action,'application');apps.push({id:'new-site',...body.p_data,archived:false});data='new-site'}
   if(target.endsWith('/eg_information_snapshot'))data={applications:apps,integrations:connections}
  }
  if(path.endsWith('/status'))data={ready,encryption:ready,storage:ready,scheduled:false,providers:['cloudflare','vercel','supabase','asaas']}
  if(path.endsWith('/discover')){await new Promise(resolve=>{release=resolve});data={resources:[{id:'resource-a',name:'Recurso A'},{id:'resource-b',name:'Recurso B'}],limited:false}}
  if(path.endsWith('/preview')){
   if(previewDenied){previewDenied=false;status=403;data={error:{message:'Credencial recusada pela fonte no teste',code:'PROVIDER_CREDENTIAL_DENIED'}}}
   else data={resource:{id:body.resource_id,name:body.resource_id==='resource-a'?'Recurso A':'Recurso B'},checked_at:new Date().toISOString(),payload:{provider:body.provider,resource_id:body.resource_id,from:body.from,to:body.to,timezone:'UTC',metrics:[{key:'pageviews',label:'Páginas vistas',value:220,unit:'pageviews',aggregation:'sum'}],series:[{date:'2026-11-01',pageviews:100,visitors:30},{date:'2026-11-04',pageviews:120,visitors:40}],unavailable:['Visitantes diários não são somados como pessoas únicas.'],definition:'Dados de fixture identificados; não são uma consulta real de provedor.'}}
  }
  if(path.endsWith('/connect')){const id='connection-'+connections.length;connections.push({id,workspace_id:body.workspace_id,application_id:body.application_id,provider:body.provider,resource_id:body.resource_id,label:body.label,state:'pending',last_sync:null,last_error:null});data={id,state:'pending'}}
  if(path.endsWith('/sync')){
   if(syncFails){syncFails=false;status=503;data={error:{message:'Falha temporária na fonte de teste'}}}
   else{const row=connections.find(row=>row.id===body.id);row.state='connected';row.last_sync=new Date().toISOString();data={synced:true}}
  }
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
 })
 await page.goto(origin+'/?theme='+theme)
 await page.getByRole('heading',{name:'Prepare o servidor para conectar suas fontes'}).waitFor()
 assert.equal(await page.getByLabel('Token de leitura').count(),0)
 await page.getByRole('button',{name:'Adicionar site',exact:true}).click()
 await page.getByLabel('Nome do site',{exact:true}).fill('Site de QA')
 await page.getByLabel('Endereço do site',{exact:true}).fill('http://site-qa.example.invalid')
 await page.getByRole('button',{name:'Salvar site',exact:true}).click()
 assert.equal(requests.filter(r=>r.body?.p_action==='application').length,0)
 await page.getByLabel('Endereço do site',{exact:true}).fill('https://site-qa.example.invalid')
 await page.getByRole('button',{name:'Salvar site',exact:true}).click()
 await page.getByRole('link').filter({hasText:'https://site-qa.example.invalid'}).waitFor()
 assert.equal(apps.at(-1).url,'https://site-qa.example.invalid/')
 ready=true;await page.getByRole('button',{name:'Verificar preparação',exact:true}).click()
 await page.getByRole('heading',{name:'Conectar uma fonte',exact:true}).waitFor()
 const token=page.getByLabel('Token de leitura'),query=page.getByRole('button',{name:'Consultar recursos autorizados',exact:true}),provider=page.getByRole('combobox',{name:'Serviço',exact:true}),save=page.getByRole('button',{name:'Salvar e sincronizar',exact:true}),test=page.getByRole('button',{name:'Testar conexão e buscar dados',exact:true})
 async function choose(label,value,text){const field=page.getByRole('combobox',{name:label,exact:true});if(await field.evaluate(el=>el.tagName==='SELECT'))await field.selectOption(value);else{await field.click();await page.getByRole('option',{name:text,exact:true}).click()}}
 async function discover(){await token.fill('fixture-read-credential');await query.click();await page.waitForFunction(()=>!!document.querySelector('fieldset:disabled'));assert.equal(await provider.isDisabled(),true);while(!release)await new Promise(r=>setTimeout(r,10));release();release=null;await page.getByRole('combobox',{name:'Recurso autorizado',exact:true}).waitFor();assert.equal(await token.inputValue(),'')}
 await discover();await choose('Aplicação','app-b','Aplicação B');assert.equal(await page.getByRole('combobox',{name:'Recurso autorizado',exact:true}).count(),0)
 await discover();await choose('Serviço','vercel','Vercel');assert.equal(await page.getByRole('combobox',{name:'Recurso autorizado',exact:true}).count(),0)
 await discover();await page.getByLabel('Equipe da Vercel · opcional').fill('team-changed');assert.equal(await page.getByRole('combobox',{name:'Recurso autorizado',exact:true}).count(),0)
 await discover();assert.equal(await save.isDisabled(),true)
 await test.click();await page.getByRole('alert').filter({hasText:'Credencial recusada'}).waitFor();assert.equal(await page.getByRole('region',{name:'Prévia dos dados da fonte',exact:true}).count(),0)
 assert.equal(requests.filter(r=>r.path.endsWith('/connect')).length,0)
 await test.click();const preview=page.getByRole('region',{name:'Prévia dos dados da fonte',exact:true});await preview.getByText('220',{exact:false}).waitFor()
 assert.equal(await save.isDisabled(),false)
 await page.screenshot({path:'output/integration-flow/preview-'+theme+'-'+width+'.png',fullPage:true});await preview.screenshot({path:'output/integration-flow/data-preview-'+theme+'-'+width+'.png'})
 await choose('Recurso autorizado','resource-b','Recurso B');assert.equal(await preview.count(),0);assert.equal(await save.isDisabled(),true)
 await test.click();await preview.waitFor()
 await save.click();await page.getByRole('status').filter({hasText:'A conexão foi salva, mas os indicadores não foram confirmados.'}).waitFor()
 assert.equal(connections.length,1);assert.equal(connections[0].state,'pending')
 assert.equal(await page.getByRole('status').filter({hasText:'Conexão salva e indicadores sincronizados.'}).count(),0)
 const connection=requests.findLast(r=>r.path.endsWith('/connect'));assert.equal(connection.body.application_id,'app-a');assert.equal(connection.body.provider,'vercel');assert.equal(connection.body.config.teamId,'team-changed');assert.equal(connection.body.resource_id,'resource-b')
 await page.getByRole('button',{name:'Sincronizar período',exact:true}).click()
 await page.getByRole('status').filter({hasText:'Sincronização concluída para esta consulta.'}).waitFor()
 assert.equal(connections[0].state,'connected')
 // A successful second source runs discovery -> preview -> credential save -> initial metrics sync.
 await choose('Serviço','supabase','Supabase');await discover();await test.click();await preview.waitFor();await save.click()
 await page.getByRole('status').filter({hasText:'Conexão salva e indicadores sincronizados.'}).waitFor()
 assert.equal(connections[1].state,'connected')
 const tail=requests.filter(r=>r.path.startsWith('/api/integrations/')).slice(-3).map(r=>r.path.split('/').at(-1));assert.deepEqual(tail,['preview','connect','sync'])
 // Asaas setup never silently imports financial records.
 await choose('Serviço','asaas','Asaas');await choose('Livro financeiro autorizado','book-a','Livro A');await discover()
 await page.getByRole('button',{name:'Conectar à aplicação',exact:true}).click()
 await page.getByRole('status').filter({hasText:'Credencial Asaas salva.'}).waitFor()
 assert.equal(connections[2].state,'pending')
 assert.notEqual(requests.filter(r=>r.path.startsWith('/api/integrations/')).at(-1).path,'/api/integrations/sync')
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage)).then(s=>s.includes('fixture-read-credential')),false)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 assert.deepEqual(errors,[])
 results.push({width,theme,websiteRegisteredWithCompanyScope:true,insecureWebsiteRejected:true,readinessBlocksCredentials:true,draftInvalidation:true,providerDeniedNoFalseSuccess:true,previewBeforeSave:true,resourceChangeInvalidatesPreview:true,syncFailureRetainsRetryableConnection:true,saveThenFirstSync:true,asaasImportExplicit:true,credentialNotInBrowserStorage:true,noOverflow:true,noPageErrors:true})
 await context.close()
}console.log(JSON.stringify({scope:'HTTP doubles and real React/Chromium; not live API or hosted verification',results},null,2))}finally{writeFileSync('output/integration-flow/results.json',JSON.stringify(results,null,2));await browser.close();await vite.close()}
