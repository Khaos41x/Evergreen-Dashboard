import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
export async function checkAccessibility({page,width,fixture}){
 const before=process.env.UX_RECORD==='1',stage=process.env.UX_CAPTURE_STAGE||(before?'before':'after'),results=[]
 const output='output/playwright/ux/'+stage;mkdirSync(output,{recursive:true})
 const navigate=path=>page.evaluate(path=>{history.pushState(null,'',path);dispatchEvent(new PopStateEvent('popstate'))},path)
 await page.waitForFunction(()=>document.querySelectorAll('.os-company-directory article').length>0)
 for(const theme of ['atlas','evergreen','black','electric','light']){
  await page.evaluate(async theme=>{const {selectTheme}=await import('/src/features/appearance/theme.ts');selectTheme(theme)},theme)
  for(const route of ['hub','economy','founders']){
   await navigate('/'+route)
   if(route==='hub')await page.locator('.os-hub').waitFor()
   if(route==='economy'){await page.getByRole('heading',{name:'Finanças',exact:true}).waitFor();await page.locator('.economy-kpis').waitFor()}
   if(route==='founders'){await page.getByRole('button',{name:'Governança',exact:true}).click();await page.getByRole('table',{name:'Níveis da Evergreen'}).waitFor()}
   await page.evaluate(()=>document.fonts.ready)
   await page.screenshot({path:output+'/theme-'+theme+'-'+route+'.png',animations:'disabled'})
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()
   const serious=axe.violations.filter(row=>['critical','serious'].includes(row.impact)).map(row=>({id:row.id,impact:row.impact,nodes:row.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}))
   if(!before&&route==='economy'){
    fixture.financeDenied=true
    await page.getByRole('button',{name:'Atualizar registros',exact:true}).click()
    await page.getByRole('alert').filter({hasText:'Acesso financeiro restrito'}).waitFor()
    await page.screenshot({path:output+'/theme-'+theme+'-economy-error.png',animations:'disabled'})
    const errorAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()
    serious.push(...errorAxe.violations.filter(row=>['critical','serious'].includes(row.impact)).map(row=>({id:row.id,impact:row.impact,nodes:row.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})))
    fixture.financeDenied=false
    await page.getByRole('button',{name:'Tentar novamente',exact:true}).first().click()
    await page.getByRole('region',{name:'Saldo disponível',exact:true}).waitFor()
   }
   const styles=await page.evaluate(()=>{
    const root=getComputedStyle(document.documentElement)
    const smallSerif=[...document.querySelectorAll('body *')].filter(element=>{const style=getComputedStyle(element),box=element.getBoundingClientRect();return box.width&&box.height&&style.fontFamily.includes('Libre Caslon')&&parseFloat(style.fontSize)<20&&element.textContent.trim()}).slice(0,10).map(element=>element.className||element.tagName)
    const resolve=name=>{const probe=document.createElement('span');probe.style.cssText='position:fixed;width:0;height:0;color:var('+name+')';document.body.append(probe);const color=getComputedStyle(probe).color;probe.remove();const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3)}
    const luminance=rgb=>rgb.map(value=>{const channel=value/255;return channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0)
    const contrast=(left,right)=>{const a=luminance(resolve(left)),b=luminance(resolve(right));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}
    const contrasts={text:contrast('--text','--bg'),muted:contrast('--muted','--bg'),soft:contrast('--soft','--bg'),control:contrast('--control-border','--panel'),focus:contrast('--focus-ring','--bg')}
    const controls=[...document.querySelectorAll('button,input,textarea,select,summary,[role="button"],[role="combobox"]')].filter(element=>{const style=getComputedStyle(element),box=element.getBoundingClientRect();return box.width&&box.height&&style.visibility!=='hidden'&&style.opacity!=='0'&&!element.closest('[inert],[aria-hidden="true"]')&&!element.disabled})
    const targets=controls.map(element=>{const label=element.matches('input[type="checkbox"],input[type="radio"]')?element.closest('label'):null;const box=(label||element).getBoundingClientRect();return {name:element.getAttribute('aria-label')||element.textContent.trim().slice(0,70)||element.name||element.tagName,width:box.width,height:box.height}})
    const smallTargets=targets.filter(row=>row.width<24||row.height<24)
    const mobileGoal=innerWidth<=600?targets.filter(row=>row.width<44||row.height<44):[]
    return {contrasts,smallTargets,mobileGoal,scheme:root.colorScheme,bg:root.getPropertyValue('--bg').trim(),smallSerif,overflow:document.documentElement.scrollWidth>innerWidth}
   })
   results.push({theme,route,width,serious,...styles})
   console.log(JSON.stringify({theme,route,serious:serious.map(row=>row.id),smallSerif:styles.smallSerif.length,overflow:styles.overflow,scheme:styles.scheme,smallTargets:styles.smallTargets,contrast:styles.contrasts,mobileUnder44:styles.mobileGoal.length}))
  }
 }
 writeFileSync(output+'/accessibility-'+width+'.json',JSON.stringify(results,null,2))
 if(!before){
  assert.deepEqual(results.flatMap(row=>row.serious),[])
  assert.deepEqual(results.flatMap(row=>row.smallSerif),[])
  assert.equal(results.some(row=>row.overflow),false)
  assert.deepEqual(results.flatMap(row=>row.smallTargets),[])
  assert.deepEqual(results.flatMap(row=>row.mobileGoal),[])
  assert.ok(results.every(row=>row.contrasts.text>=4.5&&row.contrasts.muted>=4.5&&row.contrasts.soft>=4.5&&row.contrasts.control>=3&&row.contrasts.focus>=3),JSON.stringify(results.map(row=>({theme:row.theme,contrast:row.contrasts}))))
  assert.ok(results.every(row=>row.scheme===(row.theme==='light'?'light':'dark')))
 }
 if(!before){
  await page.evaluate(async()=>{const {selectTheme}=await import('/src/features/appearance/theme.ts');selectTheme('atlas')})
  await navigate('/hub')
  for(const selector of ['.workspace-rail','.collab-sidebar','.collab-main']){
   const region=page.locator(selector)
   if(await region.isVisible()){
    await region.locator('button:visible:not(:disabled)').first().focus()
    await page.keyboard.press('Tab')
    const focus=await page.evaluate(()=>{const element=document.activeElement,box=element.getBoundingClientRect(),style=getComputedStyle(element);return {width:parseFloat(style.outlineWidth),style:style.outlineStyle,right:box.right,bottom:box.bottom}})
    assert.ok(focus.width>=2&&focus.style!=='none'&&focus.right<=page.viewportSize().width+1&&focus.bottom<=page.viewportSize().height+1,JSON.stringify(focus))
   }
  }
  await page.emulateMedia({reducedMotion:'reduce'})
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll('button')].some(element=>getComputedStyle(element).transitionDuration.split(',').some(value=>parseFloat(value)>.01))),false)
  if(width===320){
   await page.setViewportSize({width:320,height:180})
   const client=await page.context().newCDPSession(page)
   await client.send('Emulation.setDeviceMetricsOverride',{width:320,height:180,deviceScaleFactor:4,mobile:false})
   await page.waitForFunction(()=>document.scrollingElement.scrollHeight<=document.scrollingElement.clientHeight+1)
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   console.log(JSON.stringify({reflowMetrics:await page.evaluate(()=>({cssWidth:innerWidth,cssHeight:innerHeight,dpr:devicePixelRatio,visualScale:visualViewport.scale}))}))
   await page.screenshot({path:output+'/reflow-400-equivalent.png',animations:'disabled',scale:'css'})
   await client.send('Emulation.clearDeviceMetricsOverride');await client.detach()
   await page.setViewportSize({width,height:715})
  }
 }
 console.log(JSON.stringify({width,keyboardRegions:true,reducedMotion:true,reflow400Equivalent:width===320}))
 return {item:'P2',width,screens:results.length,axeScans:results.length+(before?0:5),serious:results.reduce((sum,row)=>sum+row.serious.length,0)}
}
