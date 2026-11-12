import {mkdirSync} from 'node:fs'
export async function checkPreserved({page,width}){
 const output=process.env.UX_EVIDENCE_ROOT+'/output/playwright/ux/'+(process.env.UX_BASELINE==='1'?'before':'after')
 mkdirSync(output,{recursive:true})
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.locator('.os-company-directory article').first().getByRole('button',{name:'Entrar',exact:true}).click()
 await page.locator('.hero-tree-geometry[data-points]').waitFor()
 const tree=await page.locator('.hero-tree-geometry').evaluate(element=>({filter:getComputedStyle(element).filter,points:element.dataset.points,opacity:getComputedStyle(element.closest('.hero-art')).opacity}))
 await page.locator('.collab-top').getByRole('button',{name:'Meu perfil',exact:true}).click()
 await page.locator('.professional-experience article').first().waitFor()
 await page.evaluate(()=>document.fonts.ready)
 await page.locator('.professional-experience').screenshot({path:output+'/professional-preserved-'+width+'.png',animations:'disabled'})
 return {width,tree}
}
