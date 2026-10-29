// Isolated UI fixtures. Does not verify hosted registration or email delivery.
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
mkdirSync('output/playwright',{recursive:true})
writeFileSync('output/playwright/internal-auth.html',`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module">
import React from 'react';import{createRoot}from'react-dom/client';import{Auth}from'/src/collaboration/Auth.tsx';import'/src/styles.css';import'/src/collaboration/collaboration.css';
createRoot(document.getElementById('root')).render(React.createElement(Auth,{onLocal:()=>{}},()=>React.createElement('h1',null,'Authenticated fixture')));
</script>`)
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','scripts/vite-fixture.config.ts','--host','127.0.0.1','--port','5189','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://fixture.supabase.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_only'},windowsHide:true,stdio:['ignore','pipe','pipe']})
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d)
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(logs)),15000);server.stdout.on('data',d=>{if(String(d).includes('5189')){clearTimeout(timer);resolve()}});server.on('error',reject)})
let browser;const results=[],invite='00000000-0000-4000-8000-000000000077'
try{
 browser=await chromium.launch({executablePath:process.env.BROWSER_PATH??'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),requests=[],errors=[];let rejectSignup=true,recoveryRequested=false
  await context.route('https://fixture.supabase.invalid/**',async route=>{
   const req=route.request(),url=new URL(req.url()),headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}
   if(req.method()==='OPTIONS')return route.fulfill({status:200,headers,body:''})
   if(url.pathname.endsWith('/recover')){
    assert.ok(url.searchParams.get('redirect_to')?.endsWith('/?invite='+invite));recoveryRequested=true
    return route.fulfill({status:200,headers,body:'{}'})
   }
   assert.ok(url.pathname.endsWith('/signup'),'Unexpected external request')
   const body=req.postDataJSON();requests.push({invite:body.data?.evergreen_invite,redirect:url.searchParams.get('redirect_to')})
   assert.equal(body.data?.evergreen_invite,invite)
   assert.ok(url.searchParams.get('redirect_to')?.endsWith('/?invite='+invite))
   return route.fulfill({status:rejectSignup?400:200,headers,body:JSON.stringify(rejectSignup?{msg:'Convite inválido para este e-mail',code:'signup_disabled'}:{user:{id:'fixture-only',email:body.email,identities:[]},session:null})})
  })
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  const base='http://127.0.0.1:5189/output/playwright/internal-auth.html'
  for(const suffix of['','?invite=invalid']){
   await page.goto(base+suffix);await page.getByRole('heading',{name:'Entrar',exact:true}).waitFor()
   assert.equal(await page.getByRole('button',{name:'Criar conta',exact:true}).count(),0)
   assert.equal(await page.getByRole('button',{name:'Ativar meu acesso',exact:true}).count(),0)
  }
  await page.getByRole('button',{name:'Tenho um convite',exact:true}).click()
  await page.getByLabel('Link ou código de convite',{exact:true}).fill('not-an-invitation')
  await page.getByRole('button',{name:'Continuar com convite',exact:true}).click()
  await page.getByRole('alert').filter({hasText:'Cole o link completo'}).waitFor()
  await page.getByLabel('Link ou código de convite',{exact:true}).fill('https://evergreen.example/?invite='+invite)
  await page.getByRole('button',{name:'Continuar com convite',exact:true}).click()
  await page.getByRole('heading',{name:'Ativar meu acesso',exact:true}).waitFor()
  assert.ok(new URL(page.url()).searchParams.get('invite')===invite)
  await page.goto(base+'?invite='+invite)
  await page.getByRole('button',{name:'Esqueci a senha',exact:true}).click();await page.getByRole('heading',{name:'Recuperar conta',exact:true}).waitFor()
  await page.getByLabel('E-mail',{exact:true}).fill('staff@fixture.invalid');await page.getByRole('button',{name:'Enviar recuperação',exact:true}).click()
  await page.getByRole('status').filter({hasText:'Se a conta existir'}).waitFor();assert.ok(recoveryRequested)
  await page.getByRole('button',{name:'Ativar meu acesso',exact:true}).click()
  await page.getByLabel('Seu nome',{exact:true}).fill('Invited colleague');await page.getByLabel('E-mail',{exact:true}).fill('staff@fixture.invalid');await page.getByLabel('Senha',{exact:true}).fill('Fixture-only-passphrase')
  await page.getByRole('button',{name:'Ativar acesso',exact:true}).click();await page.getByRole('alert').filter({hasText:'Convite inválido'}).waitFor()
  assert.equal(await page.getByLabel('E-mail',{exact:true}).inputValue(),'staff@fixture.invalid')
  rejectSignup=false;await page.getByRole('button',{name:'Ativar acesso',exact:true}).click();await page.getByRole('status').filter({hasText:'Solicitação recebida'}).waitFor()
  assert.equal(requests.length,2);assert.equal(await page.getByRole('heading',{name:'Authenticated fixture'}).count(),0)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.screenshot({path:`output/playwright/internal-invitation-${width}.png`,fullPage:true})
  assert.deepEqual(errors,[]);results.push({width,noOpenSignup:true,invalidLinkCannotActivate:true,pasteInvitationFlow:true,inviteSurvivesRecoveryMode:true,inviteBoundToSignupAndConfirmationRedirect:true,failurePreservesEmail:true,noFalseLogin:true,noOverflow:true,pageErrors:errors});await context.close()
 }
 writeFileSync('output/internal-access-ui-results.json',JSON.stringify({environment:'Auth UI with fixture responses ONLY; hosted Auth/email NOT_VERIFIED',results},null,2));console.log(JSON.stringify(results,null,2))
}finally{await browser?.close();server.kill()}
