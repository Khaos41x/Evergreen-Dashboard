// Browser tests against LOCAL UI/API fixtures. No real account/provider is used.
import {chromium} from 'playwright-core'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import {randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
mkdirSync('output/platform',{recursive:true})
const html=(script)=>'<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module">import React from "react";import{createRoot}from"react-dom/client";import"/src/styles.css";import"/src/styles-extra.css";import"/src/collaboration/collaboration.css";import"/src/features/identity/identity.css";'+script+'</script></html>'
writeFileSync('output/platform/auth.html',html('import{Auth}from"/src/features/identity/AuthScreen.tsx";import{SecuritySettings}from"/src/features/identity/SecuritySettings.tsx";import{identity}from"/src/features/identity/client.ts";createRoot(document.getElementById("root")).render(React.createElement(Auth,{onLocal:()=>{}},s=>React.createElement("main",{className:"collab-content"},React.createElement("h1",null,"Olá, "+s.user.user_metadata.display_name),React.createElement("p",null,s.user.user_metadata.job_title),React.createElement(SecuritySettings,{email:s.user.email}),React.createElement("button",{onClick:()=>identity.signOut()},"Sair QA"))));'))
writeFileSync('output/platform/economy.html',html('import Economy from"/src/features/economy/Economy.tsx";createRoot(document.getElementById("root")).render(React.createElement(Economy,{workspaceId:"workspace-qa",name:"Holding QA · dados sintéticos",email:"qa@example.invalid",onBack:()=>history.pushState(null,"","/vision")}));'))
writeFileSync('output/platform/founders.html',html('import Founders from"/src/features/founders/Founders.tsx";createRoot(document.getElementById("root")).render(React.createElement(Founders,{userId:"qa-user",email:"qa@example.invalid",onBack:()=>history.pushState(null,"","/vision"),onWorkspace:()=>{},onEconomy:()=>{},onChat:()=>{}}));'))
writeFileSync('output/platform/vault.html',html('import{useState}from"react";import WorldPane from"/src/features/world/WorldPane.tsx";import{useSurface}from"/src/features/navigation.ts";const data={scope:"workspace-qa",name:"Holding QA",source:"workspace",userId:"qa-user",members:[],projects:[],tasks:[],activity:[],channels:[]};function Harness(){const[surface,navigate]=useSurface();return surface==="economy"?React.createElement("main",null,React.createElement("h1",null,"Economy QA"),React.createElement("p",null,"workspace-qa / qa-user"),React.createElement("button",{onClick:()=>navigate("vision")},"Voltar ao Vision QA")):React.createElement(WorldPane,{data,actions:{onOpenTask:()=>{},onOpenProject:()=>{},onOpenEconomy:()=>navigate("economy"),onOpenFounders:()=>navigate("founders")}})}createRoot(document.getElementById("root")).render(React.createElement(Harness));'))
writeFileSync('output/platform/personal.html',html('import{App}from"/src/App.tsx";import"/src/home-reference.css";createRoot(document.getElementById("root")).render(React.createElement(App));'))
const challenge=randomBytes(32).toString('base64url')
const snapshot={companies:[{id:'ca',name:'Operações QA',currency:'BRL',role:'admin'},{id:'cb',name:'Produtos QA',currency:'BRL',role:'editor'}],accounts:[{id:'ac',company_id:'ca',name:'Principal QA',currency:'BRL',kind:'checking',balance:'7500'},{id:'bc',company_id:'cb',name:'Operação QA',currency:'BRL',kind:'checking',balance:'2501'}],goals:[],budgets:[],flows:[{company_id:'ca',income:'10001',expense:'0'}],can_create:true}
const caps=['overview','companies','finance','people','projects','intelligence','decisions','communication','governance','documents']
const founders={group:{id:'group-qa',name:'Grupo QA'},companies:[{id:'workspace-qa',name:'Operações QA',capabilities:caps}],people:[{id:'qa-user',workspace_id:'workspace-qa',name:'Ana QA',job_title:'Diretora',role:'owner'}],records:[{id:'task-qa',workspace_id:'workspace-qa',kind:'task',title:'Revisar contrato QA',status:'todo',due_date:'2026-01-01',progress:0,updated_at:'2026-10-01',assignee_id:null}],finance:[{workspace_id:'workspace-qa',data:snapshot}],decisions:[],documents:[{id:'d-group',title:'Documento do grupo QA',workspace_id:null,path:'fixture-group'},{id:'d-company',title:'Documento da empresa QA',workspace_id:'workspace-qa',path:'fixture-company'},{id:'d-other',title:'Documento de outra empresa QA',workspace_id:'other-qa',path:'fixture-other'}],link_options:[],scope_options:[{id:'workspace-qa',name:'Operações QA'}],grant_candidates:[],members:[{user_id:'qa-user',name:'Ana QA',role:'group_owner',capabilities:caps}],communication:{workspace_id:'communication-qa',channel_id:'channel-qa'},audit:[]}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','scripts/vite-fixture.config.ts','--host','localhost','--port','5196','--strictPort'],{windowsHide:true,stdio:['ignore','pipe','pipe']})
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs)),20000);server.stdout.on('data',d=>{if(String(d).includes('5196')){clearTimeout(timer);resolve()}});server.on('error',reject)})
const origin='http://localhost:5196',results=[]
let browser
try{
 browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']})
 for(const width of[390,478,1440]){
 const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<700,reducedMotion:'reduce'})
 const page=await context.newPage(),errors=[],requests=[],actions=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()))
 let hasWorkspace=false,signed=false,profile={display_name:'Ana QA',job_title:'Diretora'},keys=[],registered=false,credential=null
 const session=()=>({user:{id:'qa-user',email:'qa@example.invalid',user_metadata:profile},context:{active:true,recent_auth:true,session_id:'fixture-session',workspaces:hasWorkspace?[{id:'workspace-qa',name:'Holding QA',role:'owner'}]:[],profile}})
 await page.route('**/api/identity/**',async route=>{const action=new URL(route.request().url()).pathname.split('/api/identity/')[1],body=route.request().method()==='POST'?route.request().postDataJSON():{}
 const fulfill=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
 if(action==='config')return fulfill({google:false,passkeys:true,email:true,cookieSessions:true})
 if(action==='session')return signed?fulfill({session:session()}):fulfill({error:{message:'Entre novamente',code:'SESSION_REQUIRED'}},401)
 if(action==='signup'){assert.equal(body.invite,undefined);assert.equal(body.password,'Fixture-normal-123');profile={display_name:body.name,job_title:body.job_title};return fulfill({pendingConfirmation:true})}
 if(action==='password'){signed=true;return fulfill({session:session()})}
 if(action==='create-workspace'){assert.equal(body.name,'Equipe Ana QA');hasWorkspace=true;return fulfill({workspaceId:'workspace-qa',session:session()})}
 if(action==='recover')return fulfill({pendingConfirmation:true})
 if(action==='update-password'){assert.equal(body.password,'Fixture-updated-456');return fulfill({session:session()})}
 if(action==='email')return fulfill({pendingConfirmation:true})
 if(action==='verify-email'){if(body.code!=='123456')return fulfill({error:{message:'Código inválido',code:'otp_expired'}},400);signed=true;return fulfill({session:session()})}
 if(action==='sessions')return fulfill({sessions:[{id:'fixture',current:true,created_at:new Date().toISOString(),user_agent:'Navegador de teste'}]})
 if(action==='passkey/list')return fulfill({passkeys:keys})
 if(action==='passkey/register/start')return fulfill({challenge_id:'registration-qa',options:{challenge,rp:{id:'localhost',name:'Evergreen QA'},user:{id:Buffer.from('qa-user-handle').toString('base64url'),name:'qa@example.invalid',displayName:'Ana QA'},pubKeyCredParams:[{type:'public-key',alg:-7}],timeout:60000,attestation:'none',authenticatorSelection:{residentKey:'required',userVerification:'required'}}})
 if(action==='passkey/register/verify'){credential=body.credential;assert.equal(body.challengeId,'registration-qa');keys=[{id:body.credential.id,friendly_name:'Dispositivo QA'}];registered=true;return fulfill({id:body.credential.id})}
 if(action==='passkey/auth/start')return fulfill({challenge_id:'authentication-qa',options:{challenge,rpId:'localhost',userVerification:'required',timeout:60000}})
 if(action==='passkey/auth/verify'){assert.equal(body.challengeId,'authentication-qa');const client=JSON.parse(Buffer.from(body.credential.response.clientDataJSON,'base64url'));assert.equal(client.challenge,challenge);assert.equal(client.origin,origin);signed=true;return fulfill({session:session()})}
 if(action==='passkey/update'){keys=keys.map(k=>({...k,friendly_name:body.name}));return fulfill(keys[0])}
 if(action==='passkey/delete'){keys=[];return fulfill(null)}
 if(action==='logout'){signed=false;return fulfill({signedOut:true})}
 return fulfill({error:{message:'Unexpected fixture action '+action}},500)
 })
 await page.goto(origin+'/output/platform/auth.html');await page.getByRole('heading',{name:'Entrar na Evergreen',exact:true}).waitFor()
 assert.equal(requests.some(x=>/WorldScene|@react-three|\/three\./.test(x)),false)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await page.screenshot({path:'output/platform/auth-'+width+'.png',fullPage:true})

 await page.getByRole('button',{name:'Criar uma conta',exact:true}).click();
 await page.getByLabel('E-mail',{exact:true}).fill('qa@example.invalid');
 await page.getByLabel('Seu nome',{exact:true}).fill('Ana QA');await page.getByLabel('Cargo',{exact:false}).fill('Diretora');
 await page.getByLabel('Senha',{exact:true}).fill('Fixture-normal-123');await page.getByLabel('Confirmar senha',{exact:true}).fill('Fixture-normal-123');
 assert.equal(await page.getByLabel('Código do convite',{exact:true}).count(),0);
 await page.screenshot({path:'output/platform/signup-'+width+'.png',fullPage:true});
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();await page.getByRole('heading',{name:'Confirme seu e-mail',exact:true}).waitFor();
 await page.getByRole('button',{name:'Já confirmei · entrar',exact:true}).click();await page.getByLabel('Senha',{exact:true}).fill('Fixture-normal-123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('heading',{name:'Vamos começar',exact:true}).waitFor();await page.screenshot({path:'output/platform/onboarding-'+width+'.png',fullPage:true});await page.getByLabel('Nome do espaço',{exact:true}).fill('Equipe Ana QA');await page.getByRole('button',{name:'Criar espaço de trabalho',exact:true}).click();
 await page.getByRole('heading',{name:'Olá, Ana QA',exact:true}).waitFor();await page.getByText('Diretora',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Sair QA',exact:true}).click();await page.getByRole('button',{name:'Entrar com código de e-mail',exact:true}).click();await page.getByLabel('E-mail',{exact:true}).fill('qa@example.invalid');await page.getByRole('button',{name:'Receber código ou link',exact:true}).click();
 await page.getByLabel('Código do e-mail',{exact:true}).fill('000000');await page.getByRole('button',{name:'Confirmar acesso',exact:true}).click();await page.getByText('Código inválido',{exact:false}).waitFor();
 await page.getByLabel('Código do e-mail',{exact:true}).fill('123456');await page.getByRole('button',{name:'Confirmar acesso',exact:true}).click();await page.getByRole('heading',{name:'Olá, Ana QA',exact:true}).waitFor();
 await page.goto(origin+'/output/platform/auth.html?recovery=1');await page.getByLabel('Nova senha',{exact:true}).fill('Fixture-updated-456');await page.getByLabel('Confirmar senha',{exact:true}).fill('Fixture-updated-456');await page.getByRole('button',{name:'Salvar nova senha',exact:true}).click();await page.getByRole('heading',{name:'Olá, Ana QA',exact:true}).waitFor();
 const cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}})
 await page.getByRole('button',{name:"Registrar chave de acesso neste dispositivo",exact:true}).click();await page.getByText("Chave de acesso registrada.",{exact:true}).waitFor();assert.ok(registered&&credential.response.attestationObject)

 await page.evaluate(()=>{window.__createCredential=navigator.credentials.create.bind(navigator.credentials);navigator.credentials.create=async()=>{throw new DOMException('The operation timed out or was not allowed.','NotAllowedError')}});
 await page.getByRole('button',{name:"Registrar chave de acesso neste dispositivo",exact:true}).click();await page.getByText('A solicitação foi cancelada ou o tempo esgotou.',{exact:false}).waitFor();assert.equal((await page.getByRole('alert').innerText()).includes('The operation'),false);
 await page.evaluate(()=>{navigator.credentials.create=window.__createCredential});
 await page.getByRole('button',{name:'Sair QA',exact:true}).click();await page.getByRole('heading',{name:'Entrar na Evergreen',exact:true}).waitFor()
 await page.evaluate(()=>{window.__getCredential=navigator.credentials.get.bind(navigator.credentials);navigator.credentials.get=async()=>{throw new DOMException('The operation timed out or was not allowed.','NotAllowedError')}});
 await page.getByRole('button',{name:"Usar chave de acesso",exact:true}).click();await page.getByText('A solicitação foi cancelada ou o tempo esgotou.',{exact:false}).waitFor();assert.equal((await page.getByRole('alert').innerText()).includes('The operation'),false);
 await page.evaluate(()=>{navigator.credentials.get=window.__getCredential});

 await page.getByRole('button',{name:"Usar chave de acesso",exact:true}).click();await page.getByRole('heading',{name:'Olá, Ana QA',exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>/^sb-.*auth-token/.test(k))),false)
 results.push({width,normalSignupWithoutInvite:true,firstWorkspaceOnboarding:true,passwordReset:true,profileNameJob:true,otpErrorRecovery:true,nativeWebAuthnVirtualCeremony:true,nativeWebAuthnErrorsPortuguese:true,noLocalAuthTokens:true,no3DDuringAuth:true})
 await page.route('**/api/backend?**',async route=>{const path=new URL(new URL(route.request().url()).searchParams.get('path'),'https://fixture.invalid').pathname;const body=route.request().method()==='POST'?route.request().postDataJSON():{};let data
 if(path.endsWith('/eg_members'))data=[{user_id:'qa-user',display_name:'Ana QA'}]
 else if(path.endsWith('/eg_economy_targets'))data=snapshot.accounts.map(a=>({...a,company_name:a.company_id==='ca'?'Operações QA':'Produtos QA',workspace_name:'Holding QA'}))
 else if(path.endsWith('/eg_economy_snapshot'))data=snapshot
 else if(path.endsWith('/eg_economy_history'))data=[{id:'entry-qa',event_id:'event-qa',account_id:'ac',cents:'10001',kind:'income',description:'Receita QA · fixture',created_at:new Date().toISOString(),happened_on:'2026-10-29',reversed:false,can_reverse:true}]
 else if(path.endsWith('/eg_economy_action')){actions.push(body);if(actions.length===1)return route.fulfill({status:428,contentType:'application/json',body:JSON.stringify({code:'REAUTH_REQUIRED',message:'Confirme sua identidade novamente.'})});data='new-qa'}
 else if(path.endsWith('/eg_founders_groups'))data=[{id:'group-qa',name:'Grupo QA',role:'group_owner',owner:true,capabilities:caps}]
 else if(path.endsWith('/eg_founders_snapshot'))data=founders
 else if(path.endsWith('/eg_founders_action')){actions.push(body);data='action-qa'}
 else return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Unexpected fixture endpoint '+path})})
 return route.fulfill({contentType:'application/json',body:JSON.stringify(data)})
 })
 await page.goto(origin+'/output/platform/economy.html');await page.getByText('BRL 100,01',{exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await page.screenshot({path:'output/platform/economy-'+width+'.png',fullPage:true})
 for(const tab of ['Empresas','Cofres','Movimentações','Relatórios','Planejamento']){await page.getByRole('navigation',{name:"Evergreen Finanças"}).getByRole('button',{name:tab,exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
 await page.getByRole('button',{name:'Empresas',exact:true}).click()
 const newAccount=page.getByRole('button',{name:'Nova conta',exact:true});await newAccount.click()
 await page.waitForFunction(()=>document.activeElement?.id==='economy-form-title')
 assert.ok(await page.locator('#economy-form-title').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}))
 await page.screenshot({path:'output/platform/economy-editor-'+width+'.png',fullPage:true})
 await page.getByRole('button',{name:'Fechar',exact:true}).click();assert.ok(await newAccount.evaluate(el=>document.activeElement===el))
 await page.getByRole('button',{name:'Movimentações',exact:true}).click();await page.getByRole('button',{name:'Transferência',exact:true}).click()
 await page.getByLabel('Conta de origem',{exact:true}).selectOption('ac');await page.getByLabel('Conta de destino',{exact:true}).selectOption('bc')
 await page.getByLabel('Valor',{exact:true}).fill('25,01');await page.getByLabel('Descrição',{exact:true}).fill('Transferir QA')
 await page.getByRole('button',{name:'Salvar registro',exact:true}).click()
 const stepup=page.getByRole('dialog',{name:'Proteja esta operação.',exact:true});await stepup.waitFor();await stepup.getByRole('button',{name:'Receber código',exact:true}).click();await stepup.getByLabel('Código do e-mail',{exact:true}).fill('123456');await stepup.getByRole('button',{name:'Confirmar identidade',exact:true}).click()
 await page.getByText('Registro salvo no livro interno da empresa.',{exact:true}).waitFor()
 assert.equal(actions.length,2);assert.equal(actions[0].p_data.request_id,actions[1].p_data.request_id)
 const transfer=actions.find(a=>a.p_action==='transfer');assert.equal(transfer.p_data.cents,'2501');assert.match(transfer.p_data.request_id,/^[a-f0-9-]{36}$/)
 await page.getByRole('button',{name:'Voltar à Visão',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/vision')
 results.push({width,economySixTabs:true,financialStepUpRetrySameId:true,noOverflow:true,exactTransferInput:true,returnVision:true})
 await page.goto(origin+'/output/platform/founders.html');await page.getByText('O grupo, em perspectiva.',{exact:true}).waitFor();await page.getByRole('heading',{name:'Prioridades para sua atenção',exact:true}).waitFor()
 await page.screenshot({path:'output/platform/founders-'+width+'.png',fullPage:true})
 for(const tab of Object.values({companies:'Empresas',finance:"Finanças",people:'Pessoas',projects:'Projetos',intelligence:'Inteligência',decisions:'Decisões',communication:'Comunicação',governance:'Governança'})){await page.getByRole('navigation',{name:"Evergreen Fundadores"}).getByRole('button',{name:tab,exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
 await page.getByRole('button',{name:'Decisões',exact:true}).click();await page.getByText('Documento de outra empresa QA',{exact:true}).waitFor()
 await page.getByLabel('Filtrar empresa',{exact:true}).selectOption('workspace-qa')
 assert.equal(await page.getByText('Documento de outra empresa QA',{exact:true}).count(),0);assert.equal(await page.getByText('Documento do grupo QA',{exact:true}).count(),0);assert.equal(await page.getByText('Documento da empresa QA',{exact:true}).count(),1)
 await page.getByLabel('Filtrar empresa',{exact:true}).selectOption('all');await page.getByRole('button',{name:'Governança',exact:true}).click()
 const scopeTrigger=page.getByRole('button',{name:'Meu escopo de empresas',exact:true});await scopeTrigger.click()
 await page.waitForFunction(()=>document.activeElement?.id==='founders-form-title')
 assert.ok(await page.locator('#founders-form-title').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}))
 await page.screenshot({path:'output/platform/founders-editor-'+width+'.png',fullPage:true})
 await page.getByRole('button',{name:'Fechar',exact:true}).click();assert.ok(await scopeTrigger.evaluate(el=>document.activeElement===el))
 assert.deepEqual(errors,[]);results.push({editorFocusAndReturn:true,documentCompanyFilter:true,width,foundersNineTabs:true,scopedIndicators:true,noOverflow:true,errors})
 await context.close()
 }
 for(const width of[390,478,1440]){
 const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<700,reducedMotion:'no-preference'})
 const page=await context.newPage(),errors=[],requested=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requested.push(r.url()))
 await page.goto(origin+'/output/platform/vault.html');await page.waitForFunction(()=>Number(document.querySelector('[data-testid=world-renderer]')?.dataset.frames)>0)
 const renderer=page.getByTestId('world-renderer');const label=page.locator('[data-world-node=vault]');await page.waitForFunction(()=>!!document.querySelector('[data-world-node=vault]')?.dataset.pickX)
 await page.waitForTimeout(500);const box=await renderer.boundingBox(),pick=await label.evaluate(el=>({x:Number(el.dataset.pickX),y:Number(el.dataset.pickY)}))
 await page.mouse.move(box.x+pick.x,box.y+pick.y);await page.waitForFunction(()=>{const node=document.querySelector('[data-world-node=vault]'),s=getComputedStyle(node);return Number(s.opacity)>.9&&s.display!=='none'&&s.visibility==='visible'})
 assert.ok(await label.isVisible());if(width<700)assert.ok((await page.getByLabel('Qualidade gráfica',{exact:true}).boundingBox()).height>=44)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await page.screenshot({path:'output/platform/vision-'+width+'.png',fullPage:true})
 await page.evaluate(()=>{window.__vaultTiming={};new MutationObserver(()=>{const t=window.__vaultTiming;if(document.querySelector('[data-testid=world-renderer]')?.dataset.vaultState==='opening'&&!t.opening)t.opening=performance.now();if(document.querySelector('h1')?.textContent==='Economy QA'&&!t.entered)t.entered=performance.now()}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-vault-state']})});
 const started=Date.now();if(width<700)await page.touchscreen.tap(box.x+pick.x,box.y+pick.y);else await page.mouse.click(box.x+pick.x,box.y+pick.y)
 await page.waitForFunction(()=>!!window.__vaultTiming.opening)
 await page.getByRole('heading',{name:'Economy QA',exact:true}).waitFor();assert.ok(Date.now()-started>=600);const timing=await page.evaluate(()=>window.__vaultTiming);assert.ok(timing.entered-timing.opening>=600,JSON.stringify(timing));assert.equal(new URL(page.url()).pathname,'/economy')
 await page.getByText('workspace-qa / qa-user',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Voltar ao Vision QA'}).click();await page.getByRole('heading',{name:"Evergreen Visão",exact:true}).waitFor()
 await page.goBack();await page.getByRole('heading',{name:'Economy QA',exact:true}).waitFor()
 assert.equal(requested.some(r=>r.includes('/api/backend')),false);assert.deepEqual(errors,[])
 results.push({width,vaultRaycast:true,touch:width<700,hoverLabel:true,openingDelay:true,contextPreserved:true,historyNavigation:true,noFinancialQueriesInScene:true})
 await context.close()
 }
 const fallback=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'})
 await fallback.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:old.call(this,type,...args)}})
 const page=await fallback.newPage();await page.goto(origin+'/output/platform/vault.html');await page.getByRole('button',{name:"Abrir cofre Evergreen Finanças",exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Economy QA',exact:true}).waitFor();assert.equal(await page.locator('canvas').count(),0);results.push({noWebGLKeyboardAlternative:true});await fallback.close()
 const personal=await browser.newPage({viewport:{width:478,height:1000}})
 await personal.goto(origin+'/output/platform/personal.html')
 await personal.getByRole('button',{name:'Meu perfil · Você',exact:true}).click()
 await personal.getByLabel('Nome',{exact:true}).fill('Marina Silva');await personal.getByLabel('Cargo',{exact:true}).fill('Diretora de operações');await personal.getByRole('button',{name:'Salvar perfil',exact:true}).click()
 await personal.getByRole('heading',{name:/Marina\./}).waitFor();await personal.getByText("Diretora de operações · Disponível",{exact:true}).waitFor()
 await personal.reload();await personal.getByRole('heading',{name:/Marina\./}).waitFor();assert.equal(await personal.evaluate(()=>JSON.parse(localStorage.getItem('evergreen.personal-profile.v1')).name),'Marina Silva')
 assert.equal(await personal.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);results.push({personalProfileNameJobPersisted:true,noFakeJoao:true});await personal.close()
 writeFileSync('output/platform/browser-results.json',JSON.stringify({environment:'Local API fixtures + virtual authenticator; not Supabase/provider E2E; mobile emulation, not physical devices',results},null,2));console.log(JSON.stringify(results,null,2))
}catch(e){console.log(logs.slice(-500));for(const c of browser?.contexts()||[])for(const p of c.pages()){await p.screenshot({path:'output/platform/browser-failure.png',fullPage:true}).catch(()=>{});console.log((await p.locator('body').innerText()).slice(-1500))}throw e}finally{await browser?.close();server.kill()}
