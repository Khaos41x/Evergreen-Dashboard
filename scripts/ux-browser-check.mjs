import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'

export async function checkUx({page,width,fixture,workspaceId,channelId,go}) {
  const height=page.viewportSize().height
  const stage=process.env.UX_RECORD==='1'?'before':'after'
  const output='output/playwright/ux/'+stage
  mkdirSync(output,{recursive:true})
  const results=[]
  fixture.messages=Array.from({length:45},(_,index)=>({
    id:'ux-message-'+index,channel_id:channelId,parent_id:null,author_id:fixture.members[0].user_id,
    author_name:'Pessoa de teste',body:'Mensagem de teste '+index+' com conteúdo para verificar a rolagem da conversa.',
    created_at:new Date(Date.UTC(2026,10,11,12,index)).toISOString(),deleted:false,
  }))
  async function inspect(route,selector,keyboard=false) {
    const region=page.locator(selector)
    await region.waitFor()
    try { await page.waitForFunction(()=>document.scrollingElement.scrollHeight<=document.scrollingElement.clientHeight+1,null,{timeout:1200}) } catch {}
    const label=route+'-'+width+'x'+page.viewportSize().height+(keyboard?'-keyboard':'')
    const failures=[]
    const verify=(condition,message)=>{if(!condition)failures.push(message)}
    const bounds=await region.evaluate(element=>{
      const doc=document.scrollingElement
      const nav=document.querySelector('.collab-bottom')
      const style=getComputedStyle(element)
      return {
        documentHeight:doc.scrollHeight,documentClient:doc.clientHeight,documentTop:doc.scrollTop,
        inset:(()=>{try{return CSSNumericValue.parse(style.getPropertyValue('--bottom-inset')).to('px').value}catch{return 0}})(),
        scrollable:element.scrollHeight>element.clientHeight+1,
        height:element.clientHeight,overflow:style.overflowY,
        navTop:nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top:innerHeight,
        tabIndex:element.tabIndex,
      }
    })
    verify(bounds.documentHeight<=bounds.documentClient+1,'Documento ultrapassa o viewport')
    verify(Number.isFinite(bounds.inset)&&bounds.inset>=24,'--bottom-inset ausente ou menor que a folga')
    verify(bounds.tabIndex>=0,'Região principal não recebe foco pelo teclado')
    const ancestors=await region.evaluate(element=>{
      const extra=[]
      for(let p=element.parentElement;p;p=p.parentElement){
        if(p.scrollHeight>p.clientHeight+1&&/auto|scroll/.test(getComputedStyle(p).overflowY))extra.push(p.className||p.tagName)
      }
      return extra
    })
    verify(ancestors.length===0,'Há região rolável envolvendo o painel '+ancestors.join(','))
    if(bounds.scrollable){
      for(const key of ['wheel','PageDown','Space','touch']){
        await region.evaluate(element=>{element.scrollTop=0})
        await region.focus()
        if(key==='wheel'){await region.hover();await page.mouse.wheel(0,500)}
        else if(key==='touch'){
          const box=await region.boundingBox()
          const client=await page.context().newCDPSession(page)
          const x=Math.round(box.x+box.width/2),y=Math.floor(Math.min(box.y+box.height,bounds.navTop)-8)
          const distance=Math.max(20,Math.min(200,y-box.y-8))
          await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
          for(let step=1;step<=5;step++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*distance/5}]})
          await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
          await client.detach()
        }else await page.keyboard.press(key)
        try{await page.waitForFunction(selector=>document.querySelector(selector).scrollTop>0,selector,{timeout:1200})}
        catch{failures.push('Rolagem falhou '+key)}
      }
    }
    await region.evaluate(element=>{element.scrollTop=element.scrollHeight})
    const tail=await region.evaluate(element=>{
      const container=element.querySelector('.economy-container')??element
      const children=[...container.children].filter(child=>child.getBoundingClientRect().height>0)
      const last=children.at(-1)
      return {bottom:element.getBoundingClientRect().bottom,last:last?.getBoundingClientRect().bottom??0,
        padding:parseFloat(getComputedStyle(container).paddingBottom)}
    })
    verify(tail.padding>=bounds.inset,'Folga inferior insuficiente')
    verify(tail.last<=Math.min(tail.bottom,bounds.navTop)-24+1,'Último conteúdo encoberto')
    const controls=region.locator('button:visible,input:visible,textarea:visible,summary:visible,[tabindex="0"]:visible')
    if(await controls.count()){
      const last=controls.last()
      await last.focus()
      const box=await last.boundingBox()
      verify(box.y+box.height<=bounds.navTop+1,'Foco encoberto pela navegação')
    }
    await page.screenshot({path:output+'/'+label+'.png'})
    results.push({route,width,height:page.viewportSize().height,keyboard,failures})
    console.log(JSON.stringify(results.at(-1)))
  }
  async function inspectWithKeyboard(route,selector){
    await inspect(route,selector)
    if(width!==390)return
    const fields=page.locator(selector).locator('input:visible,textarea:visible')
    if(await fields.count())await fields.last().focus()
    await page.setViewportSize({width,height:Math.max(280,height-200)})
    await inspect(route,selector,true)
    if(route==='conversation'){
      const composer=await page.getByRole('textbox',{name:'Mensagem',exact:true}).boundingBox()
      if(composer.y+composer.height>page.viewportSize().height)results.at(-1).failures.push('Compositor fora do viewport reduzido')
    }
    await page.setViewportSize({width,height})
  }
  const navigate=async path=>page.evaluate(path=>{history.pushState(null,'',path);dispatchEvent(new PopStateEvent('popstate'))},path)
  await page.locator('.os-hub').waitFor()
  await inspectWithKeyboard('hub','.os-hub')
  await navigate('/economy')
  await page.getByRole('heading',{name:'Finanças',exact:true}).waitFor()
  await inspectWithKeyboard('economy','.economy-embedded')
  await navigate('/founders')
  await page.getByRole('heading',{name:'O grupo, em perspectiva.',exact:true}).waitFor()
  await page.getByRole('button',{name:'Governança',exact:true}).click()
  await page.getByRole('heading',{name:'Níveis da Evergreen',exact:true}).waitFor()
  await inspectWithKeyboard('founders','.founders-page')
  await navigate('/hub')
  await page.locator('.os-company-directory').waitFor()
  await page.locator('.os-company-directory article').first().getByRole('button',{name:'Entrar',exact:true}).click()
  await go('Mensagens')
  await page.locator('.collab-history').waitFor()
  await inspectWithKeyboard('conversation','.collab-history')
  writeFileSync(output+'/results-'+width+'x'+height+'.json',JSON.stringify(results,null,2))
  if(stage==='after')assert.deepEqual(results.flatMap(result=>result.failures),[])
  return {width,height,stage,failed:results.reduce((n,row)=>n+row.failures.length,0)}
}
