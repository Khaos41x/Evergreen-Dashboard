// UI-only fixtures. No real authentication, database, or Realtime validation.
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
const atlas=process.env.COLLAB_ATLAS==='1'
const presentation=process.env.COLLAB_PRESENTATION==='1'
const workflow=process.env.COLLAB_WORKFLOW==='1'
const surfaces=process.env.COLLAB_SURFACES==='1'
const w2='00000000-0000-4000-8000-000000000011',c2='00000000-0000-4000-8000-000000000021'
const origin='http://127.0.0.1:5187'
const a='00000000-0000-4000-8000-000000000001',w='00000000-0000-4000-8000-000000000010',c='00000000-0000-4000-8000-000000000020'
const workspaceName=process.env.EG_FIXTURE_WORKSPACE||'UI fixture workspace'
const fixture={workspaces:[{id:w,name:workspaceName,owner_id:a}],members:[{workspace_id:w,user_id:a,display_name:'Fixture Alice',role:'owner'}],channels:[{id:c,workspace_id:w,name:'geral',is_private:false}],channel_members:[{channel_id:c,user_id:a}],profiles:[{id:a,display_name:'Fixture Alice',real_name:'',username:null,bio:'',timezone:'UTC',custom_status:'',avatar_path:null,preferences:{focus_minutes:25}}],messages:[],records:[],founderMembers:[{id:a,name:'Fixture Alice',presence:'online',seat:0,seatNumber:1,officeName:'Escritório Davy',jobTitle:'Chairman · assento 1'},{id:'seat2',name:'Assento 2 · aguardando titular',presence:'unknown',seat:1,seatNumber:2,officeName:'Escritório executivo',vacant:true},{id:'seat3',name:'Assento 3 · aguardando titular',presence:'unknown',seat:2,seatNumber:3,officeName:'Escritório executivo',vacant:true}],officeRename:null,roleUpdates:[]}
if(workflow||surfaces){
 fixture.workspaces.push({id:w2,name:'Outra empresa QA',owner_id:a})
 fixture.members.push({workspace_id:w2,user_id:a,display_name:'Fixture Alice',role:'owner'})
 fixture.channels.push({id:c2,workspace_id:w2,name:'geral-segundo',is_private:false})
 fixture.channel_members.push({channel_id:c2,user_id:a})
}
if(surfaces)fixture.members.push({workspace_id:w,user_id:'00000000-0000-4000-8000-000000000002',display_name:'Fixture Bruno',role:'member'})
mkdirSync('output/playwright',{recursive:true})
writeFileSync('output/playwright/fixture.html',`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module">
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Collaboration} from '/src/collaboration/Collaboration.tsx';
${process.env.EG_NATIVE_CSS?"import '/src/mobile/mobile.css';document.documentElement.dataset.native='true';document.documentElement.style.setProperty('--safe-area-inset-top','28px');document.documentElement.style.setProperty('--safe-area-inset-bottom','24px');":''}
import '/src/styles.css'; import '/src/styles-extra.css'; import '/src/home-reference.css'; import '/src/collaboration/collaboration.css';
import '/src/features/appearance/themes.css'; import { initializeTheme } from '/src/features/appearance/theme.ts';
import '/src/features/appearance/atlas.css'; import '@fontsource-variable/geist'; import { initializeFocusModality } from '/src/features/appearance/focus.ts';
${atlas ? '' : "localStorage.setItem('evergreen.appearance.v1',localStorage.getItem('evergreen.appearance.v1')||'evergreen');"}
${presentation?"localStorage.setItem('evergreen.appearance.v1','light');":''}
initializeTheme();initializeFocusModality();
createRoot(document.getElementById('root')).render(React.createElement(Collaboration,{session:{user:{id:'${a}',email:'alice@fixture.invalid',user_metadata:{}}},onLocal:()=>{}}));
</script>`)
// A second server with fixture-only public environment; no .env or user server modifications.
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','scripts/vite-fixture.config.ts','--host','127.0.0.1','--port','5187','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://fixture.supabase.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_only'},windowsHide:true,stdio:['ignore','pipe','pipe']})
let logs=''; server.stdout.on('data',d=>logs+=d); server.stderr.on('data',d=>logs+=d)
await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error(logs)),15000); const ready=d=>{if(String(d).includes('5187')){clearTimeout(timeout);resolve()}};server.stdout.on('data',ready);server.on('error',reject)})
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const results=[]
try {
 for(const width of (process.env.COLLAB_WIDTHS?process.env.COLLAB_WIDTHS.split(',').map(Number):[320,375,390,430,768,790,1440])) {
  if(surfaces){fixture.channels=fixture.channels.filter(channel=>[c,c2].includes(channel.id));fixture.channel_members=fixture.channel_members.filter(member=>[c,c2].includes(member.channel_id))}
  fixture.messages=[];fixture.records=[];fixture.focus=[];fixture.failRecordOnce=false;fixture.storedFiles=[];fixture.fileRequests=[];fixture.fileFailure=false;fixture.financeDenied=false;fixture.financialActions=[];fixture.officeRename=null;fixture.roleUpdates=[];fixture.profileRelationship='founder';fixture.profileHonors=false
  const context=await browser.newContext({viewport:{width,height:width===763?451:900},hasTouch:width<=768})
  await context.route('**/api/backend?**',async route=>{
   const req=route.request(),url=new URL(new URL(req.url()).searchParams.get('target')??new URL(route.request().url()).searchParams.get('path'),'https://fixture.supabase.invalid'),table=url.pathname.split('/').at(-1).replace('eg_',''),method=req.method()
   const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}
   if(method==='OPTIONS') return route.fulfill({status:200,headers,body:''})
   let rows=fixture[table]??[],payload=req.headers()['content-type']?.includes('json')?req.postDataJSON():null
   if(url.pathname.includes('/rpc/')) {
    if(table==='os_context'&&fixture.osAvailable===false)return route.fulfill({status:404,headers,body:JSON.stringify({code:'PGRST202',message:'Could not find the function eg_os_context in the schema cache'})});if(table==='os_context')return route.fulfill({status:200,headers,body:JSON.stringify({groups:[{id:'organization-fixture',name:'Holding fixture',workspace_id:w,admin:true,chairman:false,council_active:false,library_access:true}],companies:fixture.workspaces.map(workspace=>({...workspace,description:'Fixture',group_id:'organization-fixture',admin:true,level:'A0',level_name:'APEX',unread:0}))})})
    if(table==='os_snapshot'&&payload?.p_group)return route.fulfill({status:200,headers,body:JSON.stringify({
     name:'Holding fixture',workspace_id:w,group_id:'organization-fixture',admin:true,
     companies:[{id:w,name:workspaceName,description:'',operational:true,finance:true}],
     people:[],links:[],proposals:[],audit:[],levels:[],counts:{tasks:0,projects:0,channels:1},
    })})
    if(table==='library_heartbeat')return route.fulfill({status:200,headers,body:'null'})
    if(table==='founder_office_rename'){fixture.officeRename=payload.p_name;fixture.founderMembers[0].officeName=payload.p_name;return route.fulfill({status:200,headers,body:'null'})}
    if(table==='founder_library')return route.fulfill({status:200,headers,body:JSON.stringify({scene:'founders-library',members:fixture.founderMembers,projects:[],tasks:[],activity:[],channels:[]})})
    if(table==='holding_context')return route.fulfill({status:200,headers,body:JSON.stringify({groups:[{id:'organization-fixture',name:'Holding fixture',owner:true}],companies:fixture.workspaces.map(workspace=>({...workspace,group_id:'organization-fixture',description:'Fixture explícita da empresa',admin:true,operational:true,information:true}))})})
    if(table==='public_profiles')return route.fulfill({status:200,headers,body:JSON.stringify(fixture.profiles.map(p=>({id:p.id,display_name:p.display_name,job_title:p.job_title||'',avatar_path:p.avatar_path})))})
    if(table==='professional_profile')return route.fulfill({status:200,headers,body:JSON.stringify({id:a,display_name:'Fixture Alice',job_title:'Fundadora',bio:'Perfil QA',username:'alice',custom_status:'',cover_path:null,specialties:['Estratégia','Operações'],companies:[{id:w,name:workspaceName,relationship:fixture.profileRelationship,relationship_updated_at:'2026-10-01T12:00:00.000Z',system_level:{code:'A0',name:'APEX',updated_at:'2026-10-01T12:00:00.000Z'},participation_bps:2500}],original_founders:[{name:'Holding fixture',declared_at:'2026-10-01T12:00:00.000Z'}],trajectory:[{kind:'founder',title:'Holding fixture',description:'Fundador original confirmado',happened_at:'2026-10-01T12:00:00.000Z'}],executive:{linked_companies:1,active_roles:1,assigned_projects:2,pending_decisions:1,administrative_responsibilities:1}})})
    if(table==='profile_honors')return route.fulfill({status:200,headers,body:JSON.stringify({first_partner:fixture.profileHonors,first_founder:fixture.profileRelationship==='founder',companies:[{id:w,first_partner:fixture.profileHonors,first_founder:fixture.profileRelationship==='founder'}]})})
    if(table==='profile_relationship_medals'){fixture.roleUpdates.push(payload);return route.fulfill({status:200,headers,body:'null'})}
    if(table==='information_snapshot')return route.fulfill({status:200,headers,body:JSON.stringify({applications:[],integrations:[],metrics:[],objectives:[]})})

    if(table==='company_people')return route.fulfill({status:200,headers,body:JSON.stringify({can_manage:true,members:[{id:a,name:'Fixture Alice',position:'Diretora',relationship:'founder',role:'owner',level:'A0',suspended:false,departments:[]}],departments:[],resources:[]})})
    if(table==='company_invites_snapshot')return route.fulfill({status:200,headers,body:JSON.stringify({sent:[],received:[]})})
    if(workflow&&table==='focus_action'){
     const now=new Date().toISOString()
     let active=fixture.focus.find(f=>f.workspace_id===payload.p_workspace&&f.user_id===a&&f.status!=='completed')
     if(payload.p_action==='start'){
      active={...payload.p_data,id:crypto.randomUUID(),workspace_id:payload.p_workspace,user_id:a,started_at:now,paused_at:null,paused_ms:0,elapsed_ms:0,status:'running',ended_at:null}
      fixture.focus.push(active)
     }else if(payload.p_action==='pause'){active.paused_at=now;active.status='paused'}
     else if(payload.p_action==='resume'){active.paused_ms+=Date.parse(now)-Date.parse(active.paused_at);active.paused_at=null;active.status='running'}
     return route.fulfill({status:200,headers,body:'null'})
    }
    if(surfaces&&table==='direct_channel'){
     assert.equal(payload.p_workspace,w);assert.equal(payload.p_user,'00000000-0000-4000-8000-000000000002')
     const dm_key=[a,payload.p_user].sort().join(':')
     let channel=fixture.channels.find(channel=>channel.workspace_id===payload.p_workspace&&channel.dm_key===dm_key)
     if(!channel){channel={id:crypto.randomUUID(),workspace_id:payload.p_workspace,name:'Fixture Bruno',is_private:true,description:'',archived:false,dm_key};fixture.channels.push(channel);fixture.channel_members.push({channel_id:channel.id,user_id:a})}
     return route.fulfill({status:200,headers,body:JSON.stringify(channel.id)})
    }
    if(surfaces&&table==='create_channel'){
     const id=crypto.randomUUID();fixture.channels.push({id,workspace_id:payload.p_workspace,name:payload.p_name,is_private:payload.p_private,description:'',archived:false,dm_key:null});fixture.channel_members.push({channel_id:id,user_id:a})
     return route.fulfill({status:200,headers,body:JSON.stringify(id)})
    }
    if(surfaces&&table.startsWith('economy_')){
     const id=payload.p_workspace
     if(fixture.financeDenied)return route.fulfill({status:403,headers,body:JSON.stringify({code:'42501',message:'Acesso financeiro restrito nesta empresa.'})})
     const company={id:'co-'+id,name:id===w?'Empresa financeira QA':'Empresa financeira B',currency:'BRL',role:'admin'}
     const accounts=[{id:'account-'+id,company_id:company.id,name:'Conta operacional',currency:'BRL',kind:'checking',balance:id===w?'875099':'50000'},{id:'reserve-'+id,company_id:company.id,name:'Reserva',currency:'BRL',kind:'reserve',balance:'0'}]
     if(table==='economy_snapshot')return route.fulfill({status:200,headers,body:JSON.stringify({companies:[company],accounts,goals:[],budgets:[],flows:[{company_id:company.id,income:'250000',expense:'75000'}],can_create:true})})
     if(table==='economy_history')return route.fulfill({status:200,headers,body:JSON.stringify([{id:'entry-'+id,event_id:'event-'+id,account_id:accounts[0].id,cents:'250000',kind:'income',description:id===w?'Receita autorizada QA':'Receita da segunda empresa',created_at:new Date().toISOString(),happened_on:new Date().toLocaleDateString('en-CA'),reversed:false,can_reverse:true}])})
     if(table==='economy_targets')return route.fulfill({status:200,headers,body:JSON.stringify(accounts.map(account=>({...account,company_name:company.name,workspace_name:id===w?workspaceName:'Outra empresa QA'})))})
    }
    if(surfaces&&table==='financial_action'){fixture.financialActions.push(payload);return route.fulfill({status:200,headers,body:'null'})}
    if(table==='save_checklist'){fixture.checklist=payload.p_items.map((i,index)=>({...i,id:crypto.randomUUID(),record_id:payload.p_record,position:index}));return route.fulfill({status:200,headers,body:'null'})}
    return route.fulfill({status:200,headers,body:table==='read_channel'?'null':'[]'})
   }
   if(surfaces&&url.pathname.includes('/storage/')){
    fixture.fileRequests.push({path:url.pathname,method,payload})
    if(fixture.fileFailure){return route.fulfill({status:403,headers,body:JSON.stringify({message:'Storage temporariamente indisponível no teste'})})}
    if(url.pathname==='/storage/v1/object/list/eg-files'){
     const prefix=payload.prefix+'/',listed=new Map()
     for(const file of fixture.storedFiles.filter(file=>file.path.startsWith(prefix))){
      const remainder=file.path.slice(prefix.length),parts=remainder.split('/')
      listed.set(parts[0],parts.length===1?{name:parts[0],id:file.id,updated_at:file.updated_at,created_at:file.updated_at,metadata:{size:Buffer.byteLength(file.content),mimetype:'text/plain'}}:{name:parts[0],id:null,updated_at:null,created_at:null,metadata:null})
     }
     return route.fulfill({status:200,headers,body:JSON.stringify([...listed.values()].sort((a,b)=>a.name.localeCompare(b.name)).slice(payload.offset||0,(payload.offset||0)+(payload.limit||100)))})
    }
    const filePath=decodeURIComponent(url.pathname.replace('/storage/v1/object/eg-files/',''))
    if(method==='POST'&&url.pathname.startsWith('/storage/v1/object/eg-files/')){
     const buffer=req.postDataBuffer()?.toString('utf8')||'',begin=buffer.indexOf('\r\n\r\n',buffer.indexOf('filename='))+4,end=buffer.lastIndexOf('\r\n--')
     fixture.storedFiles.push({id:crypto.randomUUID(),path:filePath,content:buffer.includes('filename=')?buffer.slice(begin,end):buffer,updated_at:new Date().toISOString()})
     return route.fulfill({status:200,headers,body:JSON.stringify({Key:'eg-files/'+filePath})})
    }
    if(method==='GET'&&url.pathname.startsWith('/storage/v1/object/eg-files/')){
     const file=fixture.storedFiles.find(file=>file.path===filePath)
     return route.fulfill({status:file?200:404,contentType:'text/plain',body:file?.content||'Not found'})
    }
    if(method==='DELETE'&&url.pathname==='/storage/v1/object/eg-files'){
     fixture.storedFiles=fixture.storedFiles.filter(file=>!payload.prefixes.includes(file.path))
     return route.fulfill({status:200,headers,body:'[]'})
    }
   }
   if(url.pathname.includes('/storage/'))return route.fulfill({status:200,headers,body:JSON.stringify(url.pathname.includes('/object/sign/')?{signedURL:'/object/sign/eg-avatars/photo-fixture?token=synthetic'}:{Key:'eg-avatars/photo-fixture'})})
   if(method==='POST'&&table==='messages') {const row={...payload,author_id:a,author_name:'Fixture Alice',created_at:new Date().toISOString(),edited_at:null,deleted:false};rows.push(row);return route.fulfill({status:201,headers,body:JSON.stringify(row)})}
   if(method==='POST'&&table==='records') {if(fixture.failRecordOnce){fixture.failRecordOnce=false;fixture.storedFiles=[];fixture.fileRequests=[];fixture.fileFailure=false;fixture.financeDenied=false;fixture.financialActions=[];return route.fulfill({status:503,headers,body:JSON.stringify({message:'Falha temporária no teste. Tente novamente.'})})}const row={...payload,id:crypto.randomUUID(),version:1,priority:payload.priority??'normal',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),archived_at:null,completed_at:null,progress:0};rows.push(row);return route.fulfill({status:201,headers,body:JSON.stringify(row)})}
   if(method==='PATCH') {const row=rows.find(r=>r.id===url.searchParams.get('id')?.slice(3));if(row){Object.assign(row,payload);if(table==='records')row.version++;if(table==='messages')row.edited_at=new Date().toISOString();return route.fulfill({status:200,headers,body:JSON.stringify(row)})}}
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
  await context.route('https://fixture.supabase.invalid/storage/**',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAASSURBVBhXY1DJ8/iPjBlIFwAA2jkdkdPy0oAAAAAASUVORK5CYII=','base64')}))
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('WebSocket'))console.log(m.text())})
  await page.goto(`${origin}/output/playwright/fixture.html`,{waitUntil:'domcontentloaded'})
  async function go(label){
   if(label==='Configurações'){
    if(width<=600)await page.getByRole('navigation',{name:'Navegação mobile'}).getByRole('button',{name:'Ajustes',exact:true}).click()
    else await page.getByRole('button',{name:'Configurações',exact:true}).click()
    return
   }
   if(width<=600&&['Mensagens','Conversas','Tarefas','Hoje','Membros'].includes(label)){
    await page.getByRole('navigation',{name:'Navegação mobile'}).getByRole('button',{name:label==='Mensagens'?'Conversas':label,exact:true}).click()
   }else{
    if(width<=1000)await page.getByRole('button',{name:'Abrir menu',exact:true}).click()
    await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:({Mensagens:'Conversas',Tarefas:'Trabalho',Início:'Hoje'})[label]||label,exact:true}).click()
   }
   if(label==='Mensagens')await page.locator('.conversation-directory-list').getByRole('button').first().click()
  }
  await page.locator('.collab-top').waitFor()
  if(presentation){
   await page.locator('.os-company-directory article').first().getByRole('button',{name:'Entrar',exact:true}).click()
   await page.locator('.reference-hero').waitFor()
   await page.locator('.hero-tree-geometry[data-points]').waitFor()
   assert.equal(await page.locator('.hero-tree-geometry').evaluate(el=>getComputedStyle(el).filter),'brightness(0) saturate(0)')
   assert.equal(await page.locator('.hero-art').evaluate(el=>getComputedStyle(el).opacity),'0.72')
   await page.screenshot({path:'output/playwright/darker-tree-light-'+width+'.png'})
   await page.locator('.collab-top').getByRole('button',{name:'Meu perfil',exact:true}).click()
   await page.locator('.professional-cover-brand').getByText(workspaceName,{exact:true}).waitFor()
   const cover=await page.locator('.professional-cover').boundingBox(),brand=await page.locator('.professional-cover-brand').boundingBox()
   if(width<=600){
    const symbol=await page.locator('.professional-cover-brand > .evergreen-brand').boundingBox()
    assert.ok(symbol.width>=44&&symbol.height>=58)
    assert.ok(cover.height>=164)
    assert.ok(await page.locator('.professional-cover-copy > span').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=26))
   }
   assert.ok(brand.x>=cover.x&&brand.x+brand.width<=cover.x+cover.width+1)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   await page.screenshot({path:'output/playwright/profile-brand-mobile-'+width+'.png'})
   await page.locator('.professional-experience').screenshot({path:'output/playwright/preserved-companies-'+width+'.png'})
   assert.deepEqual(errors,[])
   results.push({width,darkerTreeInLightTheme:true,mobileBrandEnlarged:width<=600,brandInsideCover:true,companiesSectionPreserved:true,noOverflow:true,noPageErrors:true,evidence:'Real React with HTTP fixture data'})
   await context.close();continue
  }
  if(surfaces){
   const {checkCompanySurfaces}=await import('./company-surfaces-check.mjs')
   try{results.push(await checkCompanySurfaces({page,width,fixture,userId:a,workspaceId:w,otherWorkspaceId:w2,channelId:c,otherChannelId:c2,go}))}
   catch(error){await page.screenshot({path:'output/playwright/company-surfaces-failure-'+width+'.png'});writeFileSync('output/playwright/company-surfaces-failure-'+width+'.html',await page.content());throw error}
   assert.deepEqual(errors,[]);await context.close();continue
  }
  if(workflow){
   const {checkWorkspaceWorkflow}=await import('./workspace-workflow-check.mjs')
   try { results.push(await checkWorkspaceWorkflow({page,width,fixture,userId:a,workspaceId:w,otherWorkspaceId:w2,go})) }
   catch(error){await page.screenshot({path:'output/playwright/workflow-failure-'+width+'.png'});writeFileSync('output/playwright/workflow-failure-'+width+'.html',await page.content());throw error}
   assert.deepEqual(errors,[])
   await context.close()
   continue
  }
  if (atlas) {
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'atlas')
   assert.equal(await page.locator('.collab-main').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)')
   await page.evaluate(()=>document.fonts.ready)
   assert.equal(await page.evaluate(()=>document.fonts.check('14px "Geist Variable"')),true)
   await page.screenshot({path:`output/playwright/atlas-home-${width}.png`})
   await page.getByRole('button',{name:'Entrar',exact:true}).click()
   const day=page.locator('.domain-home')
   await day.getByText('Resumo de hoje',{exact:true}).waitFor()
   const start=await day.getByRole('button',{name:'Iniciar foco',exact:true}).boundingBox()
   const timer=await day.locator('.hero-timer').boundingBox()
   assert.ok(start.x+start.width<=timer.x)
   const tasks=await day.locator('.my-day-panel').boundingBox()
   const weekly=await day.locator('.weekly-progress').boundingBox()
   assert.ok(weekly.y>tasks.y)
   if (width>1000) assert.ok(await page.locator('.workspace-sidebar-scroll').evaluate(el=>
    el.querySelector('.domain-nav').compareDocumentPosition(el.querySelector('.workspace-channel-filter')) & Node.DOCUMENT_POSITION_FOLLOWING))
   await page.screenshot({path:`output/playwright/workspace-today-${width}.png`})

   await go('Mensagens')
   const composer=page.getByRole('textbox',{name:'Mensagem',exact:true})
   const mention=page.getByRole('combobox',{name:'Mencionar pessoa',exact:true})
   await composer.click()
   await composer.press('a')
   assert.deepEqual(await composer.evaluate(el=>[getComputedStyle(el).outlineStyle,getComputedStyle(el).borderColor]),['none','rgb(153, 153, 153)'])
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.inputModality),'pointer')
   await composer.fill('')
   await mention.focus()
   await page.keyboard.press('Tab')
   await page.keyboard.press('Shift+Tab')
   assert.deepEqual(await mention.evaluate(el=>[document.activeElement===el,getComputedStyle(el).outlineWidth,getComputedStyle(el).outlineOffset]),[true,'1px','2px'])
   await page.keyboard.press('ArrowDown')
   const alice=page.getByRole('option',{name:'Fixture Alice'})
   await alice.waitFor()
   await page.keyboard.press('End')
   await page.getByRole('option',{name:'Fixture Alice'}).and(page.locator('[data-highlighted]')).waitFor()
   await page.keyboard.press('Escape')
   assert.ok(await mention.evaluate(el=>document.activeElement===el))
   if(width<=600) await mention.tap()
   else await mention.click()
   await alice.click()
   assert.equal(await composer.inputValue(),'@Fixture Alice ')
   assert.equal(await mention.evaluate(el=>getComputedStyle(el).outlineStyle),'none')
   await composer.fill(`Mensagem Atlas ${width}`)
   await composer.press('Enter')
   await page.getByText(`Mensagem Atlas ${width}`,{exact:true}).waitFor()
   await mention.click()
   await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'})
   await page.keyboard.press('End')
   await page.getByRole('option',{name:'Fixture Alice'}).and(page.locator('[data-highlighted]')).waitFor()
   assert.ok(await alice.evaluate(el=>{
    const focus=getComputedStyle(el),inset=getComputedStyle(el,'::after')
    return matchMedia('(forced-colors: active)').matches&&document.activeElement===el&&
      ((focus.outlineWidth==='1px'&&focus.outlineOffset==='-2px')||(inset.borderTopWidth==='1px'&&inset.top==='1px'))
   }))
   await page.keyboard.press('Escape')
   await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'})
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   await page.screenshot({path:`output/playwright/atlas-chat-${width}.png`})
   await page.locator('.collab-top').getByRole('button',{name:'Meu perfil',exact:true}).click()
   const experience=page.locator('.professional-experience')
   await experience.getByRole('heading',{name:'Empresas e atuação',exact:true}).waitFor()
   const company=experience.getByRole('link',{name:new RegExp(workspaceName)})
   assert.equal(await company.locator('p').innerText(),'Fundador')
   assert.equal(await company.getAttribute('aria-description'),'Fundador · Nível APEX · Participação 25%')
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   if([375,1440].includes(width)) await experience.screenshot({path:`output/playwright/atlas-profile-companies-${width}.png`})
   await go('Tarefas')
   const work=page.locator('.domain-tasks')
   await work.getByRole('tablist').waitFor()
   const taskSearch=work.getByPlaceholder('Buscar tarefas...')
   const disclosure=work.locator('.task-filter-disclosure')
   const filter=disclosure.getByRole('combobox',{name:'Filtrar por projeto'})
   assert.equal(await filter.isVisible(),false)
   await disclosure.locator('summary').click()
   assert.ok(await filter.evaluate(button=>button.querySelector('span').clientWidth>0))
   const searchBounds=await taskSearch.boundingBox(),filterBounds=await filter.boundingBox()
   assert.ok(searchBounds.y+searchBounds.height<=filterBounds.y)
   await filter.click()
   await page.getByRole('option',{name:'Todos os projetos',exact:true}).waitFor()
   await page.keyboard.press('Escape')
   await disclosure.getByRole('combobox',{name:'Filtrar por prioridade'}).click()
   await page.getByRole('option',{name:'Alta',exact:true}).click()
   await disclosure.locator('summary').click()
   assert.equal(await disclosure.locator('.task-filter-count .sr-only').textContent(),'1 filtro ativo')
   await disclosure.locator('summary').click()
   await disclosure.getByRole('button',{name:'Limpar filtros',exact:true}).click()
   assert.equal(await disclosure.locator('.task-filter-count').count(),0)
   assert.ok(await disclosure.locator('summary').evaluate(summary=>summary===document.activeElement))
   await disclosure.locator('summary').click()


   const newTask=work.getByRole('button',{name:'Nova tarefa',exact:true})
   await newTask.click()
   await page.getByRole('dialog').getByLabel('Título',{exact:true}).waitFor()
   await page.keyboard.press('Escape')
   assert.ok(await newTask.evaluate(button=>document.activeElement===button))
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   if([375,1440].includes(width)) await page.screenshot({path:`output/playwright/workspace-tasks-${width}.png`})

   assert.deepEqual(errors,[])
   results.push({width,atlas:true,focus:true,mention:true,touch:width<=600,forcedColors:true,profileCompanies:true,noOverflow:true})
   await context.close()
   continue
  }
  if ([390, 1440].includes(width)) {
   await go('Configurações')
   const picker = page.locator('.appearance-picker')
   for (const [theme, expected] of [['atlas', 'rgb(0, 0, 0)'], ['black', 'rgb(0, 0, 0)'], ['electric', 'rgb(8, 13, 27)'], ['light', 'rgb(246, 246, 243)'], ['evergreen', 'rgba(0, 0, 0, 0)']]) {
    await picker.locator('label[data-preview="' + theme + '"]').click()
    assert.ok(await picker.locator('input[value="' + theme + '"]').isChecked())
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme)
    assert.equal(await page.locator('.collab-main').evaluate(el => getComputedStyle(el).backgroundColor), expected)
   }
   await picker.locator('label[data-preview="light"]').click()
   await picker.screenshot({path: 'output/playwright/themes-' + width + '.png'})
   const stamp = new Date(Date.now() - 1).toISOString()
   fixture.records = [
    {id: crypto.randomUUID(), kind: 'task', title: 'Minha entrega da semana', status: 'done', workspace_id: w, assignee_id: a, completed_at: stamp, created_at: stamp},
    {id: crypto.randomUUID(), kind: 'task', title: 'Entrega de outra pessoa', status: 'done', workspace_id: w, assignee_id: 'other', completed_at: stamp, created_at: stamp},
   ]
   fixture.focus = [
    {id: 'focus-qa', user_id: a, workspace_id: w, status: 'completed', started_at: stamp, ended_at: stamp, elapsed_ms: 25 * 60_000},
    {id: 'focus-other', user_id: 'other', workspace_id: w, status: 'completed', started_at: stamp, ended_at: stamp, elapsed_ms: 100 * 60_000},
   ]
   await page.goto(origin + '/output/playwright/fixture.html')
   assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light')
   const organizationMark = page.locator('.os-hub .os-page-heading .evergreen-symbol')
   await organizationMark.waitFor()
   assert.equal(await organizationMark.evaluate(el => getComputedStyle(el).filter), 'none')
   const groupMark = page.locator('.os-hub .os-group-entry .evergreen-symbol')
   await groupMark.first().waitFor()
   assert.ok(await groupMark.evaluateAll(images => images.every(el => getComputedStyle(el).filter === 'none')))
   const groupNavigation = page.getByRole('navigation', {name: 'Navegação do grupo', includeHidden:true})
   const openMenu = page.getByRole('button', {name: 'Abrir menu', exact: true})
   if (width <= 1000) await openMenu.click()
   await page.locator('.workspace-company-trigger').click()
   await page.getByRole('button', {name: 'Holding fixture · Todas as empresas', exact: true}).click()
   await page.getByRole('heading',{name:'Holding fixture',exact:true}).waitFor()
   await groupNavigation.waitFor({state:'attached'})
   if (width <= 1000) await openMenu.click()
   await groupNavigation.getByRole('button', {name: 'Ajustes', exact: true}).click()
   await page.getByRole('heading', {name: 'Configurações', exact: true}).waitFor()
   await picker.waitFor()
   await page.locator('.workspace-company-trigger').waitFor({state: 'attached'})
   if (width < 1000) await page.getByRole('button', {name: 'Abrir menu', exact: true}).click()
   await page.locator('.workspace-company-trigger').click()
   await page.locator('.workspace-company-options').getByText(workspaceName, {exact: true}).click()
   const progress = page.getByRole('region', {name: 'Progresso da semana'})
   await progress.getByText('15 XP na semana', {exact: false}).waitFor()
   assert.equal(await progress.locator('progress').getAttribute('value'), '15')
   assert.equal(await progress.locator('li[data-earned="true"]').count(), 2)
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
   await progress.screenshot({path: 'output/playwright/progresso-' + width + '.png'})
   const hero = page.locator('.reference-hero')
   await hero.locator('h1').waitFor()
   await page.locator('.domain-home').evaluate(el => el.scrollTop = 0)
   const dial = await hero.locator('.hero-timer').boundingBox()
   const start = await hero.getByRole('button', {name: 'Iniciar foco', exact: true}).boundingBox()
   assert.ok(start.x + start.width <= dial.x, 'Focus action and dial must not overlap')
   if (width <= 390) assert.ok((await hero.boundingBox()).height < 300, 'Focus card should fit above the day summary on mobile')
   await page.screenshot({path: 'output/playwright/refined-home-' + width + '.png'})
   await hero.getByRole('button', {name: 'Iniciar foco', exact: true}).click()
   await page.getByRole('dialog', {name: 'Iniciar foco', exact: true}).waitFor()
   await page.keyboard.press('Escape')
   await page.locator('.my-day-panel').getByRole('button', {name: 'Adicionar tarefa', exact: true}).click()
   await page.getByRole('dialog').getByLabel('Título', {exact: true}).waitFor()
   await page.keyboard.press('Escape')
   if (width <= 600) {
    const home = page.getByRole('navigation', {name: 'Navegação mobile'}).getByRole('button', {name: 'Hoje', exact: true})
    await home.click()
    await hero.waitFor()
    assert.equal(await home.getAttribute('aria-current'), 'page')
   }
   await go('Configurações')
   await picker.locator('label[data-preview="evergreen"]').click()
   fixture.records = []
   fixture.focus = []
   await page.goto(origin + '/output/playwright/fixture.html')
   console.log('Aparência e progresso validados em ' + width + 'px')
  }
  await go('Mensagens')
  await page.getByRole('heading',{name:'# geral',exact:true}).waitFor().catch(async e=>{console.log(JSON.stringify({errors,body:await page.locator('body').innerText()}));await page.screenshot({path:'output/playwright/fixture-failure.png'});throw e})
  if ([390, 1010, 1440].includes(width)) {
   const more = page.locator('.workspace-more')
   if (width > 1000 && !await more.evaluate(el => el.open)) await more.locator('summary').click()
   await page.emulateMedia({reducedMotion: 'reduce'})
   for (const theme of ['evergreen', 'black', 'electric', 'light']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme)
    const readability = await page.evaluate(() => {
     function luminance(color) {
      const [r, g, b] = color.match(/\d+/g).slice(0, 3).map(value => {
       const channel = Number(value) / 255
       return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4
      })
      return .2126 * r + .7152 * g + .0722 * b
     }
     const cases = [
      ['.conversation-title h1', '.collab-chat > header'],
      ['.conversation-title small', '.collab-chat > header'],
      ['.conversation-composer-actions button', '.conversation-composer-actions'],
     ]
     if (innerWidth > 1000) cases.push(
      ['.workspace-more summary', '.collab-sidebar'],
      ['.workspace-more button', '.collab-sidebar'],
     )
     return Object.fromEntries(cases.map(([foreground, background]) => {
      const colors = [
       getComputedStyle(document.querySelector(foreground)).color,
       getComputedStyle(document.querySelector(background)).backgroundColor,
      ].map(luminance)
      return [foreground, (Math.max(...colors) + .05) / (Math.min(...colors) + .05)]
     }))
    })
    for (const [selector, ratio] of Object.entries(readability)) {
     assert.ok(ratio >= 4.5, theme + ' ' + selector + ' needs readable contrast, got ' + ratio)
    }
    if (theme === 'light') await page.screenshot({path: 'output/playwright/chat-tema-claro-' + width + '.png'})
   }
   await page.evaluate(() => document.documentElement.dataset.theme = 'evergreen')
   await page.emulateMedia({reducedMotion: 'no-preference'})
  }
  if(width<=1000) {
   const opener=page.getByRole('button',{name:'Abrir menu',exact:true});await opener.click()
   const drawer = page.getByRole('dialog',{name:'Espaços de trabalho e canais'})
   assert.equal((await drawer.boundingBox()).x, 0, 'The drawer should start at the viewport edge')
   assert.equal(await opener.getAttribute('aria-expanded'), 'true')
   assert.equal(await page.locator('.collab-main').getAttribute('inert'),'')
   await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('.collab-sidebar')!==null))
   await page.screenshot({path:`output/playwright/fixture-drawer-${width}.png`,fullPage:true})
   await page.keyboard.press('Escape');assert.ok(await opener.evaluate(el=>document.activeElement===el))
   if (width === 763) {
    await page.evaluate(() => localStorage.setItem('evergreen.appearance.v1', 'electric'))
    await page.goto(origin + '/output/playwright/fixture.html')
    await go('Mensagens')
    await opener.click()
    const scrim = page.locator('.collab-menu-scrim')
    await page.mouse.move(width - 10, 80)
    assert.equal(await scrim.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0.58)')
    assert.ok(await drawer.evaluate(el => el.scrollHeight > el.clientHeight))
    const close = drawer.getByRole('button', {name: 'Fechar menu', exact: true})
    const closeTop = (await close.boundingBox()).y
    await drawer.evaluate(el => el.scrollTop = el.scrollHeight)
    assert.equal((await close.boundingBox()).y, closeTop, 'The close button should stay visible while scrolling')
    await drawer.evaluate(el => el.scrollTop = 0)
    await page.screenshot({path: 'output/playwright/drawer-azul-763.png'})
    await page.mouse.click(width - 10, 80)
    await drawer.waitFor({state: 'hidden'})
    assert.ok(await opener.evaluate(el=>document.activeElement===el))
   }
  }
  const composer=page.getByLabel('Mensagem',{exact:true});await page.getByLabel('Mencionar pessoa',{exact:true}).selectOption(a);assert.equal(await composer.inputValue(),'@Fixture Alice ');assert.ok(!(await composer.inputValue()).includes(a));await composer.fill('Linha de teste');await composer.press('Shift+Enter');assert.ok((await composer.inputValue()).includes('\n'),`Shift+Enter should add a line break at ${width}px`);await composer.fill(`UI fixture message ${width}`);await composer.press('Enter');await page.getByText(`UI fixture message ${width}`,{exact:true}).waitFor();if(width<=600)assert.equal(await composer.evaluate(el=>getComputedStyle(el).minHeight),'48px',`Mobile composer should stay compact at ${width}px`)
  await page.getByRole('button',{name:'Editar',exact:true}).click();await page.getByLabel('Mensagem',{exact:true}).fill(`UI fixture edited ${width}`);await page.getByRole('button',{name:'Salvar edição'}).click();await page.getByText(`UI fixture edited ${width}`,{exact:true}).waitFor()
  if(width===567){await page.getByRole('button',{name:'Editar',exact:true}).click();await composer.fill('');await page.getByLabel('Mencionar pessoa',{exact:true}).selectOption(a);await page.getByRole('button',{name:'Salvar edição'}).click();await page.locator('.domain-mention').getByText('@Fixture Alice',{exact:true}).waitFor();assert.equal(fixture.messages.at(-1).body,'@'+a);await page.getByRole('button',{name:'Editar',exact:true}).click();assert.equal(await composer.inputValue(),'@Fixture Alice');await composer.fill(`UI fixture edited ${width}`);await page.getByRole('button',{name:'Salvar edição'}).click();await page.getByText(`UI fixture edited ${width}`,{exact:true}).waitFor()}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Chat overflow ${width}`)
  await page.screenshot({path:`output/playwright/fixture-chat-${width}.png`,fullPage:true})
  let profileApex=false,profileExperience=false,profileFirstPartner=false
  if([320,390,567,790,1440].includes(width)){
   if(width<=600)assert.equal(await page.locator('.collab-top').evaluate(el=>{const avatar=el.querySelector('.workspace-top-profile').getBoundingClientRect(),mode=el.querySelector('.world-mode-switch').getBoundingClientRect();return Math.abs(avatar.y+avatar.height/2-mode.y-mode.height/2)<1}),true,'Profile must remain in the top navigation row')
   await page.locator('.collab-top').getByRole('button',{name:'Meu perfil',exact:true}).click();await page.getByRole('heading',{name:'Meu perfil',exact:true}).waitFor();await page.locator('.professional-founder-badge').first().waitFor();await page.getByText('APEX · Fundador da empresa',{exact:true}).waitFor();profileApex=true;await page.locator('.professional-medals').getByText('Primeiro fundador',{exact:true}).waitFor();await page.locator('.professional-brazil-watermark svg').waitFor({state:width<=768?'hidden':'visible'});await page.getByRole('heading',{name:'Experiência profissional',exact:true}).waitFor();const history=page.locator('.professional-history');assert.equal(await history.locator('article').count(),1);await history.getByText(workspaceName,{exact:true}).waitFor();await history.getByText('APEX',{exact:true}).waitFor();await history.getByText(/Vínculo atualizado em/).waitFor();profileExperience=true;await page.getByText('Estratégia',{exact:true}).waitFor()
   const companyRow=page.locator('.professional-experience article[role="link"]');assert.equal(await companyRow.count(),1);await companyRow.getByRole('heading',{name:workspaceName,exact:true}).waitFor();assert.equal(await companyRow.locator('p').innerText(),'Fundador');assert.equal(await companyRow.getAttribute('aria-description'),'Fundador · Nível APEX · Participação 25%')
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'output/playwright/profile-'+width+'.png',fullPage:true});await page.locator('.professional-experience').screenshot({path:'output/playwright/profile-companies-'+width+'.png'});await history.screenshot({path:'output/playwright/profile-history-'+width+'.png'})
   const cover = page.locator('.professional-cover')
   const avatar = page.locator('.professional-identity > .domain-member-avatar')
   await page.getByRole('heading',{name:'Meu perfil',exact:true}).scrollIntoViewIfNeeded()
   await page.emulateMedia({reducedMotion:'reduce'})
   for (const [theme, expectedCover, expectedAvatar] of [
    ['electric', 'rgb(21, 34, 59)', 'rgb(32, 58, 100)'],
    ['black', 'rgb(0, 0, 0)', 'rgb(0, 0, 0)'],
   ]) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme)
    assert.equal(await cover.evaluate(el => getComputedStyle(el).backgroundColor), expectedCover)
    assert.equal(await cover.evaluate(el => getComputedStyle(el, '::after').backgroundImage), 'none')
    assert.equal(await avatar.evaluate(el => getComputedStyle(el).backgroundColor), expectedAvatar)
    await page.screenshot({path:'output/playwright/perfil-'+theme+'-'+width+'.png'})
   }
   await page.evaluate(() => document.documentElement.dataset.theme = 'evergreen')
   await page.emulateMedia({reducedMotion:'no-preference'})
   if(process.env.EG_RELEASE_HOME){
    if(width<=600)await go('Membros');else{if(width<=1000)await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Equipe',exact:true}).click()}
    await page.getByRole('heading',{name:'Pessoas e equipe',exact:true}).waitFor();await page.locator('.people-row').getByRole('heading',{name:'Fixture Alice',exact:true}).waitFor();await page.getByRole('button',{name:'Convidar pessoa',exact:true}).waitFor();if(!process.env.EG_NATIVE_CSS){await page.getByRole('button',{name:'Instalar aplicativo',exact:true}).click();await page.locator('.pwa-install-help').waitFor()}
    await page.screenshot({path:`output/playwright/release-people-${width}.png`,fullPage:true});await page.locator('.collab-top').getByRole('button',{name:'Meu perfil',exact:true}).click();await page.getByRole('heading',{name:'Meu perfil',exact:true}).waitFor();
    await companyRow.click();await page.locator('main.reference-home').waitFor();await page.locator('.hero-copy>p').getByText('Veja o que importa hoje na Orkto.',{exact:true}).waitFor();
    if(process.env.EG_TIMER_FALLBACK)await page.locator('.hero-timer strong').evaluate(el=>el.style.fontFamily='Arial, sans-serif');
    const dial=await page.locator('.hero-timer').evaluate(el=>{const ring=el.getBoundingClientRect(),scale=ring.width/el.clientWidth,radius=ring.width/2-parseFloat(getComputedStyle(el,'::before').top)*scale,cx=ring.x+ring.width/2,cy=ring.y+ring.height/2;return {parts:[...el.querySelectorAll('small,strong,span')].map(c=>({text:c.textContent,rect:c.getBoundingClientRect().toJSON(),font:getComputedStyle(c).font})),ring:ring.toJSON(),spacing:parseFloat(getComputedStyle(el.querySelector('strong')).letterSpacing),inside:[...el.querySelectorAll('small,strong,span')].every(child=>{const r=child.getBoundingClientRect();return [[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]].every(([x,y])=>Math.hypot(x-cx,y-cy)<=radius+2)})}});
    assert.ok(dial.spacing>=0,'Digits must not overlap');if(!dial.inside)console.log('TIMER_LAYOUT',width,JSON.stringify(dial));await page.screenshot({path:`output/playwright/release-home-${width}.png`,fullPage:true});assert.equal(dial.inside,true,'Timer text must fit inside the circular dial');
    await page.locator('.collab-top').getByRole('button',{name:'Meu perfil',exact:true}).click();await page.getByRole('heading',{name:'Meu perfil',exact:true}).waitFor();
   }
   if(width===390){await companyRow.tap();await page.locator('main.reference-home').waitFor();await go('Ajustes')}
   if(width===1440){await companyRow.focus();await page.keyboard.press('Enter');await page.locator('main.reference-home').waitFor();await go('Configurações')}
   if(width===790){fixture.profileRelationship='partner';fixture.profileHonors=true;await page.getByRole('button',{name:'Atualizar perfil'}).click();await page.getByText('APEX · Primeiro sócio',{exact:true}).waitFor();await page.locator('.professional-history').getByText('Primeiro sócio',{exact:true}).waitFor();await page.locator('.professional-history').screenshot({path:'output/playwright/profile-history-first-partner-790.png'});profileFirstPartner=true;const relationship=page.locator('.professional-manage select[name="relationship"]');assert.equal(await relationship.count(),1);await relationship.selectOption('partner');await page.locator('.professional-first-partner input').check();await page.getByRole('button',{name:'Salvar vínculo profissional',exact:true}).click();await page.getByText('Vínculo profissional salvo. As permissões de acesso permanecem sob a gestão da empresa.',{exact:true}).waitFor();assert.equal(fixture.roleUpdates.at(-1).p_relationship,'partner');assert.equal(fixture.roleUpdates.at(-1).p_first_partner,true)}
   if(width!==390&&width!==1440)await page.getByRole('button',{name:'Editar perfil e foto',exact:true}).click();await page.getByRole('heading',{name:'Configurações',exact:true}).waitFor();const privacySelect=page.locator('.profile-privacy-fieldset select');await privacySelect.selectOption('selected');await page.getByRole('heading',{name:'Pessoas autorizadas neste espaço',exact:true}).waitFor();await page.locator('input[name="specialties"]').fill('Estratégia, Operações, Tecnologia');await page.locator('.profile-save-button').click();await page.getByText('Perfil e preferências salvos.',{exact:true}).waitFor();assert.equal(fixture.profiles[0].preferences.professional_profile.visibility,'selected');assert.deepEqual(fixture.profiles[0].preferences.professional_profile.specialties,['Estratégia','Operações','Tecnologia']);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Profile settings overflow ${width}`);await go('Mensagens')
  }
  if(process.env.PROFILE_ONLY){
   let imageCropAndSave='covered at 390',founderOffice='not exercised at this width'
   if(width===390){await page.getByRole('group',{name:'Modo do Evergreen'}).getByRole('button',{name:'Visão',exact:true}).click();await page.getByRole('heading',{name:'Biblioteca dos fundadores',exact:true}).waitFor();await page.getByRole('button',{name:'Diretório 2D',exact:true}).click();await page.getByRole('button',{name:'Ver estação de Fixture Alice',exact:true}).click();await page.getByLabel('Nome do seu escritório',{exact:true}).fill('Sala da Alice');await page.getByRole('button',{name:'Salvar nome',exact:true}).click();await page.getByText('Nome do seu escritório atualizado.',{exact:true}).waitFor();assert.equal(fixture.officeRename,'Sala da Alice');await page.screenshot({path:'output/playwright/founder-office-390.png',fullPage:true});founderOffice='seat holder renamed only own office using local RPC fixture'}
   if(width===1440){await go('Configurações');const buffer=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAASSURBVBhXY1DJ8/iPjBlIFwAA2jkdkdPy0oAAAAAASUVORK5CYII=','base64');const avatarInput=page.locator('.profile-image-editor').first().locator('input[type=file]');await avatarInput.setInputFiles({name:'avatar-fixture.png',mimeType:'image/png',buffer});await page.getByRole('button',{name:'Salvar foto',exact:true}).click();await page.getByText('Foto de perfil salva.',{exact:true}).waitFor().catch(async error=>{console.log('PROFILE IMAGE FIXTURE:',await page.locator('.profile-image-editor').first().innerText(),errors);await page.screenshot({path:'output/playwright/profile-image-failure.png',fullPage:true});throw error});const coverInput=page.locator('.profile-image-editor').nth(1).locator('input[type=file]');await coverInput.setInputFiles({name:'cover-fixture.png',mimeType:'image/png',buffer});await page.getByRole('button',{name:'Salvar capa',exact:true}).click();await page.getByText('Capa pessoal salva.',{exact:true}).waitFor();assert.ok(fixture.profiles[0].avatar_path?.startsWith(`${a}/`));assert.ok(fixture.profiles[0].cover_path?.startsWith(`${a}/covers/`));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'output/playwright/profile-settings-images-1440.png',fullPage:true});imageCropAndSave='avatar and cover crop/upload with fixture storage and profile-row updates'}
   assert.deepEqual(errors,[]);results.push({width,profileV2:true,companyRowsPreserved:true,apexFounderBadge:profileApex,apexFirstPartner:width===790?profileFirstPartner:'covered in local SQL checks',experienceSection:profileExperience,founderOffice,composerEnterAndShiftEnter:true,mobileComposerCompact:width<=600,keyboardOrTouchNavigation:width===390?'touch tap':'keyboard Enter',privacyAudienceControls:true,imageCropAndSave,noHorizontalOverflow:true,pageErrors:errors});await context.close();continue
  }
  await page.getByRole('button',{name:'Excluir',exact:true}).click();await page.getByRole('button',{name:'Confirmar exclusão',exact:true}).click();await page.getByText('Mensagem excluída',{exact:true}).waitFor()
  if(width===390){
   const staleResponse=page.waitForResponse(r=>r.url().includes('stale-search'))
   await page.getByLabel("Buscar mensagens",{exact:true}).fill('stale-search');await page.getByRole('button',{name:"Buscar",exact:true}).click()
   await page.getByLabel("Buscar mensagens",{exact:true}).fill('fresh-search');await page.getByRole('button',{name:"Buscar",exact:true}).click()
   await page.getByText('Fresh search result',{exact:true}).waitFor();await staleResponse
   assert.equal(await page.getByText('Stale search result',{exact:true}).count(),0)
   await page.getByRole('button',{name:"Limpar",exact:true}).click()
  }
  await go('Tarefas');const openEditor=page.getByRole('button',{name:"Nova tarefa",exact:true});await openEditor.click();await page.keyboard.press('Escape');assert.ok(await openEditor.evaluate(el=>document.activeElement===el));await openEditor.click();const dialog=page.getByRole('dialog');await dialog.getByLabel("Título",{exact:true}).fill(`UI fixture task ${width}`);await dialog.getByLabel("Novo item da lista").fill('Verify persistence');await dialog.getByRole('button',{name:"Adicionar item",exact:true}).click()
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
   await page.getByRole('heading',{name:'Biblioteca dos fundadores',exact:true}).waitFor();await page.getByRole('button',{name:'Diretório 2D',exact:true}).click()
   await page.getByRole('button',{name:'Ver estação de Fixture Alice',exact:true}).click()
   await page.getByLabel('Nome do seu escritório',{exact:true}).fill('Sala da Alice');await page.getByRole('button',{name:'Salvar nome',exact:true}).click();await page.getByText('Nome do seu escritório atualizado.',{exact:true}).waitFor();assert.equal(fixture.officeRename,'Sala da Alice');assert.equal(fixture.founderMembers[0].officeName,'Sala da Alice');await page.screenshot({path:'output/playwright/founder-office-390.png',fullPage:true})
   await page.getByRole('heading',{name:'Fixture Alice',exact:true}).waitFor()
   assert.equal(await page.getByRole('button',{name:`Concluir UI fixture task ${width}`,exact:true}).count(),0,'Library must not mix company tasks into founder desks')
   await page.getByRole('group',{name:'Modo do Evergreen'}).getByRole('button',{name:"Trabalho",exact:true}).click()
   await go('Tarefas');await page.getByText(`UI fixture task ${width}`,{exact:true}).waitFor()
   assert.equal(fixture.records.find(r=>r.title===`UI fixture task ${width}`).status,'todo','Visiting the library preserves company tasks')
  }
  await go('Configurações');await page.getByRole('heading',{name:'Configurações',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.screenshot({path:`output/playwright/fixture-settings-${width}.png`,fullPage:true})

  if([390,1440].includes(width)){
   if(width<=1000)await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await page.getByRole('button',{name:'Empresas e equipe',exact:true}).click();await page.getByRole('heading',{name:'Equipe e trabalho por empresa',exact:true}).waitFor();const orgNav=page.getByRole('navigation',{name:`Organizar ${workspaceName}`});await orgNav.getByRole('button',{name:'Projetos',exact:true}).click();await page.getByRole('heading',{name:'Projetos da empresa',exact:true}).waitFor();await page.getByRole('button',{name:'Novo projeto',exact:true}).click();await page.getByRole('dialog').getByLabel('Título',{exact:true}).fill('Projeto integrado QA');assert.equal(await page.getByRole('dialog').getByLabel('Tipo',{exact:true}).inputValue(),'project');await page.getByRole('dialog').getByRole('button',{name:'Salvar item',exact:true}).click();await page.getByRole('heading',{name:'Projeto integrado QA',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'output/playwright/organization-shell-projects-'+width+'.png',fullPage:true});if(width<=1000)await page.getByRole('button',{name:'Abrir menu',exact:true}).click();await page.getByRole('button',{name:'Empresas e equipe',exact:true}).click();await page.getByRole('navigation',{name:`Organizar ${workspaceName}`}).getByRole('button',{name:'Equipe e convites',exact:true}).click();await page.getByRole('heading',{name:'Membros e acesso',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Equipe e trabalho por empresa',exact:true}).count(),0);await page.screenshot({path:'output/playwright/organization-shell-team-'+width+'.png',fullPage:true});
  }
  if(width<=1000)await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
  if(!await page.locator('.workspace-more').evaluate(el=>el.open))await page.locator('.workspace-more summary').click();await page.getByRole('navigation',{name:'Navegação principal',exact:true}).getByRole('button',{name:'Sala de foco',exact:true}).click();
  await page.getByRole('heading',{name:'Sala de foco',exact:true}).waitFor();await page.getByText('Sem sessão ativa',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if([390,1440].includes(width))await page.screenshot({path:'output/playwright/focus-room-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Iniciar minha sessão',exact:true}).click();await page.getByRole('dialog',{name:'Iniciar foco',exact:true}).waitFor();await page.keyboard.press('Escape');
  if(width<=1000)await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
  if(!await page.locator('.workspace-more').evaluate(el=>el.open))await page.locator('.workspace-more summary').click();await page.getByRole('navigation',{name:'Navegação principal',exact:true}).getByRole('button',{name:'Como usar',exact:true}).click();
  await page.getByRole('heading',{name:'Comece pelo que importa.',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if([390,1440].includes(width))await page.screenshot({path:'output/playwright/getting-started-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Criar minha primeira tarefa',exact:false}).click();
  await page.getByRole('dialog',{name:'Nova tarefa',exact:true}).waitFor();await page.keyboard.press('Escape');
  if(width===1440){assert.equal(await page.locator('.workspace-self>.domain-member-avatar').evaluate(el=>el.getBoundingClientRect().width===el.getBoundingClientRect().height),true);await go('Configurações');const photo=page.locator('.profile-image-editor').first().locator('input[type=file]');await photo.setInputFiles({name:'avatar-fixture.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAASSURBVBhXY1DJ8/iPjBlIFwAA2jkdkdPy0oAAAAAASUVORK5CYII=','base64')});await page.getByRole('button',{name:'Salvar foto',exact:true}).click();await page.getByText('Foto de perfil salva.',{exact:true}).waitFor();await page.locator('.workspace-self>img').waitFor();assert.equal(await page.locator('.workspace-self>img').evaluate(el=>el.getBoundingClientRect().width===el.getBoundingClientRect().height),true);assert.equal(await page.locator('.workspace-rail>button[aria-label="Abrir meu perfil"]>img').evaluate(el=>{const b=el.getBoundingClientRect();return b.width===28&&b.height===28}),true);await page.screenshot({path:'output/playwright/photo-desktop.png',fullPage:true});fixture.members[0].role='member';await page.goto(origin+'/output/playwright/fixture.html',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/Trocar empresa:/}).waitFor();assert.equal(await page.getByRole('button',{name:'Adicionar canal',exact:true}).count(),0);await page.screenshot({path:'output/playwright/ordinary-member-desktop.png',fullPage:true});fixture.members[0].role='owner'}
  if(width===1440){fixture.osAvailable=false;await page.goto(origin+'/output/playwright/fixture.html',{waitUntil:'domcontentloaded'});await page.getByText('Não foi possível abrir o novo ambiente de organizações. Você pode continuar trabalhando nos espaços existentes.',{exact:true}).waitFor();await page.getByRole('button',{name:'Entrar na empresa',exact:true}).click();await page.locator('.reference-home').waitFor();fixture.osAvailable=true}
  if(process.env.EG_NATIVE_CSS){await page.evaluate(()=>window.dispatchEvent(new Event('evergreen:back',{cancelable:true})));await page.locator('.reference-home').waitFor();await page.screenshot({path:`output/native/home-${width}.png`,fullPage:true})}
  assert.deepEqual(errors,[]);results.push({width,organizationShellNavigation:[390,1440].includes(width)?true:'covered at 390/1440',focusRoomAndHelp:true,chatSendEditDelete:true,recordCreate:true,chatEditorSettingsNoOverflow:true,editorFocusReturn:true,mobileDrawerKeyboard:width<=1000,founderLibraryRoutePreservesCompanyTasks:width===390?'PASS (REST fixture)':'covered at 390',searchRaceAndTaskFocus:width===390?'PASS':'covered at 390',pageErrors:errors});await context.close()
 }
 const outputPath=presentation?'output/presentation-adjustments-results.json':surfaces?'output/company-surfaces-results.json':workflow?'output/workspace-workflow-'+(atlas?'atlas':'evergreen')+'-results.json':process.env.PROFILE_ONLY?'output/playwright/profile-v2-results.json':process.env.EG_NATIVE_CSS?'output/native/collaboration-results.json':process.env.COLLAB_WIDTHS?'output/collaboration-ui-focused-results.json':'output/collaboration-ui-results.json';writeFileSync(outputPath,JSON.stringify({environment:'Playwright REST response fixtures ONLY; does not prove auth, persistence or Realtime',results},null,2));console.log(JSON.stringify(results,null,2))
} finally {await browser.close();server.kill()}
