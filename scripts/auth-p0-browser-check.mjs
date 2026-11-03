// Actual React auth UI + SDK/BFF against a LOCAL provider double. No real email.
import {chromium} from 'playwright-core'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {authFixture} from './auth-fixture.mjs'
import {createHandler} from '../server/app.mjs'
const fixture=await authFixture(),origin='http://127.0.0.1:5209',results=[]
const html='<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module">import React from "react";import{createRoot}from"react-dom/client";import{Auth}from"/src/features/identity/AuthScreen.tsx";import{identity}from"/src/features/identity/client.ts";import"/src/styles.css";import"/src/styles-extra.css";import"/src/collaboration/collaboration.css";import"/src/features/identity/identity.css";createRoot(document.getElementById("root")).render(React.createElement(React.StrictMode,null,React.createElement(Auth,{onLocal:()=>{}},s=>React.createElement("main",null,React.createElement("h1",null,"Espaço autorizado QA"),React.createElement("p",null,s.user.user_metadata.display_name),React.createElement("button",{onClick:()=>identity.signOut()},"Sair QA")))));</script></html>'
const reviewHTML=html.replace('<div id="root"></div>','<main class="collab-content"><div id="root"></div></main>').replace('import{Auth}from"/src/features/identity/AuthScreen.tsx";', 'import{CompanyOnboardingReview}from"/src/features/people/CompanyOnboardingReview.tsx";').replace('React.createElement(Auth,{onLocal:()=>{}},s=>React.createElement("main",null,React.createElement("h1",null,"Espaço autorizado QA"),React.createElement("p",null,s.user.user_metadata.display_name),React.createElement("button",{onClick:()=>identity.signOut()},"Sair QA")))','React.createElement(CompanyOnboardingReview,{workspace:new URLSearchParams(location.search).get("workspace"),email:"review@example.invalid",onChanged:()=>{}})')
const handler=createHandler({NODE_ENV:'development',APP_ORIGIN:origin,SUPABASE_URL:fixture.origin,SUPABASE_PUBLISHABLE_KEY:'local-fixture-only'})
const vite=await createServer({configFile:false,plugins:[react(),{name:'auth-p0-harness',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url.startsWith('/api/'))return void handler(req,res);if(['/','/login','/hub','/review'].includes(req.url.split('?')[0])){res.setHeader('content-type','text/html');res.setHeader('referrer-policy','no-referrer');void server.transformIndexHtml(req.url,req.url.startsWith('/review')?reviewHTML:html).then(t=>res.end(t));return}next()})}}],server:{host:'127.0.0.1',port:5209,strictPort:true}})
await vite.listen();const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
mkdirSync('output/auth-p0',{recursive:true})
try{for(const width of[320,390,1440]){
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<700}),page=await context.newPage(),errors=[],paths=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>paths.push(new URL(r.url()).pathname))
 const email='browser-'+width+'@example.invalid',password='UI-LOCAL-Password-123',newPassword='UI-NEW-Password-123'
 await page.goto(origin+'/login');await page.getByRole('heading',{name:'Entrar na Evergreen'}).waitFor()
 await page.getByRole('button',{name:'Criar uma conta',exact:true}).click()
 await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Seu nome',{exact:true}).fill('Miguel QA '+width)
 await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByLabel('Confirmar senha',{exact:true}).fill(password)
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();await page.getByRole('heading',{name:'Confirme seu e-mail'}).waitFor()
 await page.getByRole('button',{name:'Já confirmei · entrar'}).click();await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click()
 await page.getByRole('alert').filter({hasText:'Confirme seu e-mail antes de entrar.'}).waitFor();await page.getByRole('button',{name:'Reenviar confirmação'}).click()
 await page.getByRole('status').filter({hasText:'Se aplicável'}).waitFor()
 await page.getByLabel('Código do e-mail').fill(fixture.outbox.at(-1).code);await page.getByRole('button',{name:'Confirmar acesso',exact:true}).click();await page.getByRole('heading',{name:'Vamos começar'}).waitFor()
 await page.getByRole('checkbox',{name:'Orkto',exact:true}).check();await page.getByLabel('Sua atuação na Orkto',{exact:true}).selectOption('founder')
 await page.getByRole('checkbox',{name:'ThinkerChess',exact:true}).check();await page.getByLabel('Sua atuação na ThinkerChess',{exact:true}).selectOption('partner')
 await page.getByRole('button',{name:'Salvar minhas empresas',exact:true}).click();await page.getByRole('status').filter({hasText:'Informações salvas.'}).waitFor()
 assert.equal(fixture.users.get(email).workspaces.length,0,'Declaration never grants access')
 await page.reload();await page.getByRole('heading',{name:'Vamos começar'}).waitFor();await page.getByLabel('Sua atuação na Orkto',{exact:true}).waitFor();assert.equal(await page.getByLabel('Sua atuação na Orkto',{exact:true}).inputValue(),'founder');assert.equal(await page.getByLabel('Sua atuação na ThinkerChess',{exact:true}).inputValue(),'partner')
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'output/auth-p0/companies-'+width+'.png',fullPage:true})
 await page.getByText('Outras opções de espaço de trabalho',{exact:true}).click()
 await page.getByLabel('Nome do espaço').fill('Equipe QA '+width);await page.getByRole('button',{name:'Criar espaço de trabalho',exact:true}).click();await page.getByRole('heading',{name:'Espaço autorizado QA'}).waitFor()
 await page.reload();await page.getByRole('heading',{name:'Espaço autorizado QA'}).waitFor()
 const cookies=await context.cookies();assert.ok(cookies.some(c=>c.name.startsWith('eg-auth')&&c.httpOnly&&c.sameSite==='Lax'))
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>/auth-token/.test(k))),false)
 await page.getByRole('button',{name:'Sair QA'}).click();await page.getByRole('heading',{name:'Entrar na Evergreen'}).waitFor()
 await page.getByRole('button',{name:'Esqueci minha senha'}).click();await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByRole('button',{name:'Enviar link de recuperação'}).click();await page.getByLabel('Código do e-mail').waitFor()
 const recovery=fixture.outbox.at(-1);assert.equal(recovery.redirect,origin+'/login')
 await page.getByLabel('Código do e-mail').fill('000000');await page.getByRole('button',{name:'Confirmar acesso',exact:true}).click();await page.getByRole('alert').filter({hasText:'expirado'}).waitFor()
 await page.getByLabel('Código do e-mail').fill(recovery.code);await page.getByRole('button',{name:'Confirmar acesso',exact:true}).click();await page.getByLabel('Nova senha',{exact:true}).waitFor()
 await page.getByLabel('Nova senha',{exact:true}).fill(newPassword);await page.getByLabel('Confirmar senha',{exact:true}).fill(newPassword);await page.getByRole('button',{name:'Salvar nova senha'}).click()
 await page.getByRole('status').filter({hasText:'Senha atualizada.'}).waitFor();await page.getByRole('button',{name:'Continuar para o espaço de trabalho'}).click();await page.getByRole('heading',{name:'Espaço autorizado QA'}).waitFor()
 await page.getByRole('button',{name:'Sair QA'}).click();await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(newPassword);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('heading',{name:'Espaço autorizado QA'}).waitFor()
 await page.getByRole('button',{name:'Sair QA'}).click();await page.getByRole('button',{name:'Esqueci minha senha'}).click();await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByRole('button',{name:'Enviar link de recuperação'}).click();await page.getByLabel('Código do e-mail').waitFor()
 const second=fixture.outbox.at(-1),other=await browser.newContext({viewport:{width,height:900},hasTouch:width<700}),linkPage=await other.newPage()
 const before=fixture.used.size
 await linkPage.goto(second.redirect+'#token_hash='+second.token_hash+'&type=recovery');await linkPage.getByRole('button',{name:'Continuar com este link'}).waitFor()
 assert.equal(fixture.used.size,before,'GET/scanner must not consume a token');assert.equal(new URL(linkPage.url()).hash,'')
 await linkPage.getByRole('button',{name:'Continuar com este link'}).click();await linkPage.getByLabel('Nova senha',{exact:true}).waitFor()
 assert.equal(await linkPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await linkPage.screenshot({path:'output/auth-p0/reset-'+width+'.png',fullPage:true})
 await other.close()
 await page.goto(origin+'/login?auth_error=expired');await page.getByRole('alert').filter({hasText:'Este link expirou.'}).waitFor()
 await page.getByRole('button',{name:'Esqueci minha senha'}).click();await page.getByLabel('E-mail',{exact:true}).fill(email)
 await page.route('**/api/identity/recover',route=>route.abort('failed'));await page.getByRole('button',{name:'Enviar link de recuperação'}).click();await page.getByRole('alert').filter({hasText:'Não foi possível conectar.'}).waitFor()
 assert.equal(await page.getByLabel('E-mail',{exact:true}).inputValue(),email);await page.unroute('**/api/identity/recover')
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);assert.equal(paths.some(p=>/WorldScene|three\.module/.test(p)),false)
 await page.screenshot({path:'output/auth-p0/network-'+width+'.png',fullPage:true})
 await page.goto(origin+'/login');await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(newPassword);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('heading',{name:'Espaço autorizado QA'}).waitFor()
 fixture.pendingApprovals.push({user_id:'44444444-4444-4444-8444-444444444444',name:'Gabriel QA',email:'gabriel@example.invalid',relationship:'partner',revision:3})
 await page.goto(origin+'/review?workspace='+fixture.users.get(email).workspaces[0].id);await page.getByRole('button',{name:'Confirmar vínculo e acesso',exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'output/auth-p0/company-review-'+width+'.png',fullPage:true})
 await page.getByRole('button',{name:'Confirmar vínculo e acesso',exact:true}).click();await page.getByRole('status').filter({hasText:'Vínculo confirmado.'}).waitFor();assert.equal(fixture.decisions.at(-1).p_revision,3);assert.equal(fixture.decisions.at(-1).p_accept,true)
 fixture.pendingApprovals.push({user_id:'55555555-5555-4555-8555-555555555555',name:'Outra pessoa QA',email:'other@example.invalid',relationship:'founder',revision:1})
 await page.reload();await page.getByRole('button',{name:'Recusar',exact:true}).click();await page.getByRole('status').filter({hasText:'Solicitação recusada.'}).waitFor();assert.equal(fixture.decisions.at(-1).p_accept,false);assert.deepEqual(errors,[])
 results.push({width,companySelectionPersisted:true,reviewConfirmDecline:true,flow:'signup/unconfirmed/resend/confirm/provision/login/reload/logout/recover/invalid OTP/reset/new-password login/cross-browser link/network error',noOverflow:true,noPageErrors:true,no3D:true,fragmentCleared:true,scannerDoesNotConsume:true,httpOnlyCookies:true});await context.close()
}writeFileSync('output/auth-p0/browser.json',JSON.stringify({environment:'Desktop Chromium at emulated widths/touch; local provider double and real BFF. No real SMTP, PWA install or physical phone.',results},null,2));console.log(JSON.stringify(results,null,2))
}finally{await browser.close();await vite.close();await fixture.close()}
