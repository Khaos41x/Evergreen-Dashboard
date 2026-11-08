// Real application and browser input; auth responses are isolated doubles. No emails sent.
import {chromium} from 'playwright-core'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const record=process.argv.includes('--record-only'), results=[],origin='http://127.0.0.1:5231'
const vite=await createServer({configFile:false,plugins:[react()],server:{host:'127.0.0.1',port:5231,strictPort:true}})
await vite.listen()
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true})
mkdirSync('output/auth-scroll',{recursive:true})
try{
 for(const native of [false,true])for(const width of [320,390,567,1440]){
  const context=await browser.newContext({viewport:{width,height:640},hasTouch:width<700}),page=await context.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  let mailFailure=false
  await page.route('**/api/**',async route=>{
   const action=new URL(route.request().url()).pathname.split('/').pop()
   const body=action==='config'?{google:false,passkeys:false}:action==='session'?{error:{code:'AUTH_REQUIRED',message:'Entre na sua conta.'}}:mailFailure?{error:{code:'unexpected_failure',message:'Não foi possível enviar o e-mail de acesso. O responsável precisa verificar o provedor de envio.'}}:{pendingConfirmation:true,session:null}
   await route.fulfill({status:action==='session'?401:mailFailure&&action!=='config'?503:200,contentType:'application/json',body:JSON.stringify(body)})
  })
  await page.goto(origin+'/login');await page.getByRole('heading',{name:'Entrar na Evergreen'}).waitFor()
  if(!record){
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'atlas')
   await page.keyboard.press('Tab')
   const skip=page.getByRole('link',{name:'Pular para o conteúdo',exact:true})
   assert.ok(await skip.evaluate(el=>document.activeElement===el))
   await page.keyboard.press('Enter')
   assert.ok(await page.locator('main.identity-auth').evaluate(el=>document.activeElement===el))
  }
  if(native)await page.evaluate(()=>{document.documentElement.dataset.native='true';document.documentElement.style.setProperty('--safe-area-inset-top','24px');document.documentElement.style.setProperty('--safe-area-inset-bottom','20px')})
  async function scrollCheck(mode){
   await page.locator('.identity-auth').evaluate(el=>el.scrollTop=0)
   const before=await page.locator('.identity-auth').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight,top:el.scrollTop}))
   await page.mouse.move(width/2,Math.min(200,640/2));await page.mouse.wheel(0,12000)
   await page.waitForTimeout(200)
   const after=await page.locator('.identity-auth').evaluate(el=>el.scrollTop)
   const footer=await page.getByTestId('auth-revision').boundingBox()
   const bottomVisible=!!footer&&footer.y>=0&&footer.y+footer.height<=640
   await page.mouse.wheel(0,-12000);await page.waitForTimeout(200)
   const top=await page.locator('.identity-auth').evaluate(el=>el.scrollTop)
   const passed=bottomVisible&&top===0&&(before.content<=before.height||after>0)
   results.push({width,native,mode,...before,after,returnedTop:top,bottomVisible,passed})
   if(!record)assert.ok(passed,JSON.stringify(results.at(-1)))
  }
  await scrollCheck('login')
  await page.getByRole('button',{name:'Criar uma conta',exact:true}).click();await scrollCheck('signup')
  await page.getByLabel('E-mail',{exact:true}).fill('scroll@example.invalid');await page.getByLabel('Seu nome',{exact:true}).fill('Teste local');await page.getByLabel('Senha',{exact:true}).fill('Fixture-password-123');await page.getByLabel('Confirmar senha',{exact:true}).fill('Fixture-password-123')
  await page.getByRole('button',{name:'Criar conta',exact:true}).click();await page.getByRole('heading',{name:'Confirme seu e-mail'}).waitFor();await scrollCheck('confirmation')
  await page.screenshot({path:`output/auth-scroll/${record?'before':'after'}-${native?'native':'web'}-${width}.png`})
  if(!record){
   assert.doesNotMatch(await page.getByRole('status').innerText(),/enviamos|enviado|foi enviado/i)
   mailFailure=true;await page.getByRole('button',{name:'Reenviar confirmação',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('status').count(),0);await scrollCheck('mail-error')
   await page.getByRole('button',{name:'Já tenho conta · entrar',exact:true}).click();await page.getByRole('button',{name:'Esqueci minha senha',exact:true}).click();await scrollCheck('recovery')
   assert.deepEqual(errors,[])
  }
  await context.close()
 }
}finally{await browser.close();await vite.close();writeFileSync(`output/auth-scroll/${record?'before':'after'}.json`,JSON.stringify({scope:'Real React Root and Chromium wheel input. API doubles; no hosted delivery or physical mobile verification.',results},null,2))}
console.log(JSON.stringify({checks:results.length,passed:results.filter(x=>x.passed).length,recordOnly:record}))
