// UI-only fixtures. No real authentication, database, or Realtime validation.
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
const origin='http://127.0.0.1:5187'
const a='00000000-0000-4000-8000-000000000001',w='00000000-0000-4000-8000-000000000010',c='00000000-0000-4000-8000-000000000020'
const fixture={workspaces:[{id:w,name:'UI fixture workspace',owner_id:a}],members:[{workspace_id:w,user_id:a,display_name:'Fixture Alice',role:'owner'}],channels:[{id:c,workspace_id:w,name:'geral',is_private:false}],channel_members:[{channel_id:c,user_id:a}],profiles:[{id:a,display_name:'Fixture Alice',real_name:'',username:null,bio:'',timezone:'UTC',custom_status:'',avatar_path:null,preferences:{focus_minutes:25}}],messages:[],records:[]}
mkdirSync('output/playwright',{recursive:true})
writeFileSync('output/playwright/fixture.html',`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module">
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Collaboration} from '/src/collaboration/Collaboration.tsx';
import '/src/styles.css'; import '/src/styles-extra.css'; import '/src/home-reference.css'; import '/src/collaboration/collaboration.css';
createRoot(document.getElementById('root')).render(React.createElement(Collaboration,{session:{user:{id:'${a}',email:'alice@fixture.invalid',user_metadata:{}}},onLocal:()=>{}}));
</script>`)
// A second server with fixture-only public environment; no .env or user server modifications.
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','scripts/vite-fixture.config.ts','--host','127.0.0.1','--port','5187','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://fixture.supabase.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_only'},windowsHide:true,stdio:['ignore','pipe','pipe']})
let logs=''; server.stdout.on('data',d=>logs+=d); server.stderr.on('data',d=>logs+=d)
await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error(logs)),15000); const ready=d=>{if(String(d).includes('5187')){clearTimeout(timeout);resolve()}};server.stdout.on('data',ready);server.on('error',reject)})
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const results=[]
try {
 for(const width of [320,375,390,430,768,1440]) {
  fixture.messages=[];fixture.records=[]
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<=768})
  await context.route('**/api/backend?**',async route=>{
   const req=route.request(),url=new URL(new URL(req.url()).searchParams.get('path'),'https://fixture.supabase.invalid'),table=url.pathname.split('/').at(-1).replace('eg_',''),method=req.method()
   const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}
   if(method==='OPTIONS') return route.fulfill({status:200,headers,body:''})
   let rows=fixture[table]??[],payload=req.postDataJSON()
   if(url.pathname.includes('/rpc/')) {
    if(table==='save_checklist'){fixture.checklist=payload.p_items.map((i,index)=>({...i,id:crypto.randomUUID(),record_id:payload.p_record,position:index}));return route.fulfill({status:200,headers,body:'null'})}
    return route.fulfill({status:200,headers,body:table==='read_channel'?'null':'[]'})
   }
   if(url.pathname.includes('/storage/'))return route.fulfill({status:200,headers,body:'[]'})
   if(method==='POST'&&table==='messages') {const row={...payload,author_id:a,author_name:'Fixture Alice',created_at:new Date().toISOString(),edited_at:null,deleted:false};rows.push(row);return route.fulfill({status:201,headers,body:JSON.stringify(row)})}
   if(method==='POST'&&table==='records') {const row={...payload,id:crypto.randomUUID(),version:1,priority:payload.priority??'normal',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),archived_at:null,completed_at:null,progress:0};rows.push(row);return route.fulfill({status:201,headers,body:JSON.stringify(row)})}
   if(method==='PATCH') {const row=rows.find(r=>r.id===url.searchParams.get('id')?.slice(3));if(row){Object.assign(row,payload);if(table==='messages')row.edited_at=new Date().toISOString();return route.fulfill({status:200,headers,body:JSON.stringify(row)})}}
   if(method==='GET') {
    const search=url.searchParams.get('body')??''
    if(search.includes('stale-search')||search.includes('fresh-search')){
     const stale=search.includes('stale-search');if(stale)await new Promise(resolve=>setTimeout(resolve,350))
     return route.fulfill({status:200,headers,body:JSON.stringify([{id:stale?'stale-id':'fresh-id',channel_id:c,parent_id:null,author_id:a,author_name:'Fixture Alice',body:stale?'Stale search result':'Fresh search result',created_at:new Date().toISOString(),deleted:false}])})
    }
    for(const [key,val] of url.searchParams) {if(val.startsWith('eq.')) rows=rows.filter(r=>r[key]===val.slice(3));if(val==='is.null')rows=rows.filter(r=>r[key]==null)}
    const single=req.headers().accept?.includes('vnd.pgrst.object')
    return route.fulfill({status:200,headers,body:JSON.stringify(single ? rows[0]??null : rows)})
   }
   return route.fulfill({status:200,headers,body:JSON.stringify(payload??{})})
  })
  await context.route('**/api/realtime?**',route=>route.fulfill({status:200,contentType:'text/event-stream',body:'data: {"type":"status","status":"CHANNEL_ERROR"}\n\n'}))
  await context.route('**/api/identity/config',route=>route.fulfill({contentType:'application/json',body:'{"google":false,"passkeys":false}'}))
  await context.route('**/api/identity/sessions',route=>route.fulfill({contentType:'application/json',body:'{"sessions":[]}'}))
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('WebSocket'))console.log(m.text())})
  await page.goto(`${origin}/output/playwright/fixture.html`,{waitUntil:'networkidle'})
  await page.locator('.collab-top nav').waitFor({state:'attached'}).catch(async e=>{console.log(JSON.stringify({errors,body:await page.locator('body').innerText()}));await page.screenshot({path:'output/playwright/productivity-initial-failure.png'});throw e});await page.getByRole('navigation',{name:width<=768?'Navegação mobile':'Navegação desktop'}).getByRole('button',{name:'Conversas',exact:true}).click()
  await page.getByRole('heading',{name:'# geral',exact:true}).waitFor().catch(async e=>{console.log(JSON.stringify({errors,body:await page.locator('body').innerText()}));await page.screenshot({path:'output/playwright/fixture-failure.png'});throw e})
  if(width<=768) {
   const opener=page.getByRole('button',{name:'Abrir menu',exact:true});await opener.click()
   assert.ok(await page.getByRole('dialog',{name:'Espaços de trabalho e canais'}).isVisible())
   assert.equal(await page.locator('.collab-main').getAttribute('inert'),'')
   await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('.collab-sidebar')!==null))
   await page.screenshot({path:`output/playwright/fixture-drawer-${width}.png`,fullPage:true})
   await page.keyboard.press('Escape');assert.ok(await opener.evaluate(el=>document.activeElement===el))
  }
  await page.getByLabel('Mensagem',{exact:true}).fill(`UI fixture message ${width}`);await page.getByRole('button',{name:'Enviar',exact:true}).click();await page.getByText(`UI fixture message ${width}`,{exact:true}).waitFor()
  await page.getByRole('button',{name:'Editar',exact:true}).click();await page.getByLabel('Mensagem',{exact:true}).fill(`UI fixture edited ${width}`);await page.getByRole('button',{name:'Salvar edição'}).click();await page.getByText(`UI fixture edited ${width}`,{exact:true}).waitFor()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Chat overflow ${width}`)
  await page.screenshot({path:`output/playwright/fixture-chat-${width}.png`,fullPage:true})
  await page.getByRole('button',{name:'Excluir',exact:true}).click();await page.getByRole('button',{name:'Confirmar exclusão',exact:true}).click();await page.getByText('Mensagem excluída',{exact:true}).waitFor()
  if(width===390){
   const staleResponse=page.waitForResponse(r=>r.url().includes('stale-search'))
   await page.getByLabel("Buscar mensagens",{exact:true}).fill('stale-search');await page.getByRole('button',{name:"Buscar",exact:true}).click()
   await page.getByLabel("Buscar mensagens",{exact:true}).fill('fresh-search');await page.getByRole('button',{name:"Buscar",exact:true}).click()
   await page.getByText('Fresh search result',{exact:true}).waitFor();await staleResponse
   assert.equal(await page.getByText('Stale search result',{exact:true}).count(),0)
   await page.getByRole('button',{name:"Limpar",exact:true}).click()
  }
  const nav=page.getByRole('navigation',{name:width<=768?'Navegação mobile':'Navegação desktop'})
  await nav.getByRole('button',{name:width<=768?'Tarefas':'Projetos e tarefas',exact:true}).click();const openEditor=page.getByRole('button',{name:"Nova tarefa",exact:true});await openEditor.click();await page.keyboard.press('Escape');assert.ok(await openEditor.evaluate(el=>document.activeElement===el));await openEditor.click();const dialog=page.getByRole('dialog');await dialog.getByLabel("Título",{exact:true}).fill(`UI fixture task ${width}`);await dialog.getByLabel("Novo item da lista").fill('Verify persistence');await dialog.getByRole('button',{name:"Adicionar item",exact:true}).click()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Modal overflow ${width}`)
  await page.screenshot({path:`output/playwright/fixture-editor-${width}.png`,fullPage:true})
  await dialog.getByRole('button',{name:"Salvar tarefa"}).click();await page.getByText(`UI fixture task ${width}`,{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  if(width===390){
   await page.getByText(`UI fixture task ${width}`,{exact:true}).click()
   const editor=page.getByRole('dialog',{name:"Detalhes da tarefa"}),focus=editor.getByRole('button',{name:"Focar nesta tarefa",exact:true})
   await editor.getByLabel("Título",{exact:true}).fill('Unsaved fixture title')
   page.once('dialog',dialog=>dialog.dismiss());await focus.click();assert.equal(await editor.getByLabel("Título",{exact:true}).inputValue(),'Unsaved fixture title')
   await focus.focus();page.once('dialog',dialog=>dialog.accept());await page.keyboard.press('Enter')
   await page.getByRole('dialog',{name:"Iniciar foco",exact:true}).waitFor();await page.keyboard.press('Escape')
   await page.getByRole('group',{name:'Modo do Evergreen'}).getByRole('button',{name:"Visão",exact:true}).click()
   await page.getByRole('heading',{name:"Evergreen Visão",exact:true}).waitFor();await page.getByRole('button',{name:'Diretório 2D',exact:true}).click()
   await page.getByRole('button',{name:'Ver estação de Fixture Alice',exact:true}).click()
   await page.getByRole('button',{name:`Concluir UI fixture task ${width}`,exact:true}).click()
   await page.getByRole('progressbar',{name:'Progresso das tarefas selecionadas'}).waitFor()
   await page.waitForFunction(()=>document.querySelector('.world-progress progress')?.value===100)
   await page.getByRole('group',{name:'Modo do Evergreen'}).getByRole('button',{name:"Trabalho",exact:true}).click()
   await nav.getByRole('button',{name:'Tarefas',exact:true}).click();await page.getByRole('tab',{name:"Concluídas",exact:true}).click()
   await page.getByText(`UI fixture task ${width}`,{exact:true}).waitFor()
  }
  await nav.getByRole('button',{name:width<=768?'Ajustes':'Configurações',exact:true}).click();await page.getByRole('heading',{name:'Configurações',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.screenshot({path:`output/playwright/fixture-settings-${width}.png`,fullPage:true})

  if(width<=768)await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
  await page.getByRole('navigation',{name:'Navegação principal',exact:true}).getByRole('button',{name:'Sala de foco',exact:true}).click();
  await page.getByRole('heading',{name:'Sala de foco',exact:true}).waitFor();await page.getByText('Sem sessão ativa',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if([390,1440].includes(width))await page.screenshot({path:'output/playwright/focus-room-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Iniciar minha sessão',exact:true}).click();await page.getByRole('dialog',{name:'Iniciar foco',exact:true}).waitFor();await page.keyboard.press('Escape');
  if(width<=768)await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
  await page.getByRole('navigation',{name:'Navegação principal',exact:true}).getByRole('button',{name:'Como usar',exact:true}).click();
  await page.getByRole('heading',{name:'Comece pelo que importa.',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if([390,1440].includes(width))await page.screenshot({path:'output/playwright/getting-started-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Criar minha primeira tarefa',exact:false}).click();
  await page.getByRole('dialog',{name:'Nova tarefa',exact:true}).waitFor();await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);results.push({width,focusRoomAndHelp:true,chatSendEditDelete:true,recordCreate:true,chatEditorSettingsNoOverflow:true,editorFocusReturn:true,mobileDrawerKeyboard:width<=768,worldMutationSharedWithWork:width===390?'PASS (REST fixture)':'covered at 390',searchRaceAndTaskFocus:width===390?'PASS':'covered at 390',pageErrors:errors});await context.close()
 }
 writeFileSync('output/collaboration-ui-results.json',JSON.stringify({environment:'Playwright REST response fixtures ONLY; does not prove auth, persistence or Realtime',results},null,2));console.log(JSON.stringify(results,null,2))
} finally {await browser.close();server.kill()}
