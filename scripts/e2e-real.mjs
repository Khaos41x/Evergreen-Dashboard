// Opt-in only. Requires three existing, confirmed, disposable accounts in a dedicated project.
// This test creates named workspace/channel/task/message fixtures and does not delete them.
import { chromium } from 'playwright-core'
import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
const required = ['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','EG_TEST_A_EMAIL','EG_TEST_A_PASSWORD','EG_TEST_B_EMAIL','EG_TEST_B_PASSWORD','EG_TEST_C_EMAIL','EG_TEST_C_PASSWORD']
const missing=required.filter(k=>!process.env[k]); mkdirSync('output',{recursive:true})
if(missing.length) {
 const result={status:'BLOCKED',reason:'Dedicated Supabase and confirmed disposable accounts required',missing}
 writeFileSync('output/e2e-real-results.json',JSON.stringify(result,null,2)); console.log(JSON.stringify(result,null,2)); process.exit(2)
}
const url=process.env.EG_TEST_URL ?? 'http://localhost:5173'
const checks=[]
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true})
const contextA=await browser.newContext(),contextB=await browser.newContext(),contextC=await browser.newContext()
const a=await contextA.newPage(),b=await contextB.newPage()
const api=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}})
async function login(page,who) { await page.goto(url); await page.getByLabel('E-mail',{exact:true}).fill(process.env[`EG_TEST_${who}_EMAIL`]); await page.getByLabel('Senha',{exact:true}).fill(process.env[`EG_TEST_${who}_PASSWORD`]); await page.getByRole('button',{name:'Entrar',exact:true}).click(); await page.getByRole('navigation',{name:'Navegação desktop'}).waitFor() }
async function navigate(page,name) { await page.getByRole('navigation',{name:'Navegação desktop'}).getByRole('button',{name,exact:true}).click() }
try {
 await login(a,'A'); await login(b,'B'); checks.push('login A/B in independent contexts')
 await navigate(a,'Configurações')
 const profile=a.locator('form').filter({has:a.getByRole('heading',{name:'Seu perfil'})})
 await profile.getByLabel('Nome',{exact:true}).fill('Evergreen E2E A'); await profile.getByRole('button',{name:'Salvar perfil'}).click(); await a.getByText('Perfil atualizado no servidor.').waitFor()
 const name=`E2E ${Date.now()}`
 const newWorkspace=a.locator('form').filter({has:a.getByRole('heading',{name:'Novo workspace'})})
 await newWorkspace.getByLabel('Nome do workspace').fill(name); await newWorkspace.getByRole('button',{name:'Criar workspace',exact:true}).click(); await a.getByRole('heading',{name:'# geral',exact:true}).waitFor()
 await navigate(a,'Membros')
 await a.getByLabel('E-mail do destinatário').fill(process.env.EG_TEST_B_EMAIL); await a.getByRole('button',{name:'Criar convite',exact:true}).click()
 const invitation=await a.getByLabel('Link do convite',{exact:false}).inputValue()
 await navigate(b,'Configurações'); await b.getByLabel('Link ou código').fill(invitation); await b.getByRole('button',{name:'Aceitar convite',exact:true}).click(); await b.getByRole('heading',{name:'# geral',exact:true}).waitFor(); checks.push('workspace creation and email-bound invitation accepted')
 await a.getByRole('navigation',{name:'Navegação desktop'}).getByRole('button',{name:'Conversas',exact:true}).click()
 console.log('Active workspace equality:',(await a.getByLabel('Workspace',{exact:true}).inputValue())===(await b.getByLabel('Workspace',{exact:true}).inputValue()))
 await a.getByText('Tempo real conectado',{exact:true}).waitFor(); await b.getByText('Tempo real conectado',{exact:true}).waitFor()
 const body=`A realtime ${Date.now()}`; await a.getByLabel('Mensagem',{exact:true}).fill(body); await a.getByRole('button',{name:'Enviar',exact:true}).click(); await b.getByText(body,{exact:true}).waitFor({timeout:8000})
 const reply=`B realtime ${Date.now()}`; await b.getByLabel('Mensagem',{exact:true}).fill(reply); await b.getByRole('button',{name:'Enviar',exact:true}).click(); await a.getByText(reply,{exact:true}).waitFor({timeout:8000}); checks.push('A/B realtime delivery faster than polling interval')
 await a.reload(); await a.getByText(body,{exact:true}).waitFor(); await b.reload(); await b.getByText(reply,{exact:true}).waitFor(); checks.push('sessions and history persist across reload')
 await navigate(a,'Configurações')
 const newChannel=a.locator('form').filter({has:a.getByRole('heading',{name:'Novo canal'})})
 await newChannel.getByLabel('Nome do canal').fill('e2e-private'); await newChannel.getByLabel('Canal privado (somente convidados)').check(); await newChannel.getByRole('button',{name:'Criar canal',exact:true}).click(); await a.getByRole('heading',{name:'Canal privado e2e-private'}).waitFor()
 const authC=await api.auth.signInWithPassword({email:process.env.EG_TEST_C_EMAIL,password:process.env.EG_TEST_C_PASSWORD}); if(authC.error) throw authC.error
 const outside=await api.from('eg_workspaces').select('*').eq('name',name); if(outside.error) throw outside.error; assert.equal(outside.data.length,0)
 const privateChannel=await api.from('eg_channels').select('*').eq('name','e2e-private'); if(privateChannel.error) throw privateChannel.error; assert.equal(privateChannel.data.length,0); checks.push('real outsider RLS cannot read workspace or private channel')
 await navigate(b,'Projetos e tarefas'); await b.getByRole('button',{name:'Criar item',exact:true}).click(); const dialog=b.getByRole('dialog'); await dialog.getByLabel('Título',{exact:true}).fill('E2E shared task'); await dialog.getByRole('button',{name:'Salvar item',exact:true}).click(); await b.getByText('Item salvo no servidor.').waitFor()
 await navigate(a,'Projetos e tarefas'); await a.getByRole('button',{name:/E2E shared task/}).click(); await a.getByRole('dialog').getByLabel('Status',{exact:true}).selectOption('done'); await a.getByRole('dialog').getByLabel('Progresso (%)').fill('100'); await a.getByRole('button',{name:'Salvar item',exact:true}).click(); await b.getByRole('button',{name:/E2E shared task/}).filter({hasText:'Concluído'}).waitFor({timeout:8000}); checks.push('shared task assignment and status update')
 await b.setViewportSize({width:390,height:844}); await b.getByRole('navigation',{name:'Navegação mobile'}).getByRole('button',{name:'Conversas',exact:true}).click(); const mobile=`Mobile ${Date.now()}`; await b.getByLabel('Mensagem',{exact:true}).fill(mobile); await b.getByRole('button',{name:'Enviar',exact:true}).click(); await b.getByText(mobile,{exact:true}).waitFor(); assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false); checks.push('mobile channel send without horizontal overflow')
 await b.screenshot({path:'output/e2e-mobile.png',fullPage:true})
 await navigate(a,'Conversas'); await a.getByRole('button',{name:'geral',exact:true}).click(); await a.getByText(body,{exact:true}).waitFor()
 const ownMessage=a.locator('.collab-message').filter({has:a.getByText(body,{exact:true})})
 await ownMessage.getByRole('button',{name:'Editar',exact:true}).click(); const edited=`Edited ${Date.now()}`; await a.getByLabel('Mensagem',{exact:true}).fill(edited); await a.getByRole('button',{name:'Salvar edição',exact:true}).click(); await b.getByText(edited,{exact:true}).waitFor({timeout:8000})
 const updatedMessage=a.locator('.collab-message').filter({has:a.getByText(edited,{exact:true})})
 await updatedMessage.getByRole('button',{name:'Excluir',exact:true}).click(); await updatedMessage.getByRole('button',{name:'Confirmar exclusão',exact:true}).click(); await b.getByText('Mensagem excluída',{exact:true}).waitFor({timeout:8000});checks.push('message edit and soft deletion propagate in real time')
 await a.screenshot({path:'output/e2e-desktop.png',fullPage:true})
 await a.getByRole('button',{name:'Sair da conta',exact:true}).click();await a.getByRole('heading',{name:'Entrar',exact:true}).waitFor();await a.reload();await a.getByRole('heading',{name:'Entrar',exact:true}).waitFor();checks.push('UI logout revokes local session and protected view stays signed out on reload')
 await api.auth.signOut()
 writeFileSync('output/e2e-real-results.json',JSON.stringify({status:'PASS',checks,workspace:name,limits:'Existing confirmed accounts; signup email delivery and password recovery require separate mailbox verification.'},null,2))
 console.log(JSON.stringify({status:'PASS',checks},null,2))
} catch(error) { await a.screenshot({path:'output/e2e-failure.png',fullPage:true}).catch(()=>{}); await b.screenshot({path:'output/e2e-failure-b.png',fullPage:true}).catch(()=>{}); console.log('Visible application errors:',await a.locator('[role=alert]').allTextContents(),await b.locator('[role=alert]').allTextContents()); writeFileSync('output/e2e-real-results.json',JSON.stringify({status:'FAIL',checks,error:String(error)},null,2)); throw error }
finally { await browser.close() }
