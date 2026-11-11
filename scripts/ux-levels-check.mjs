import assert from 'node:assert/strict'
export async function checkLevels({page,width}){
 await page.locator('.os-company-directory article').first().getByRole('button',{name:'Entrar',exact:true}).click()
 await page.evaluate(()=>{history.pushState(null,'','/founders');dispatchEvent(new PopStateEvent('popstate'))})
 await page.getByRole('button',{name:'Governança',exact:true}).click()
 await page.getByRole('heading',{name:'Níveis da Evergreen',exact:true}).waitFor()
 await page.screenshot({path:'output/playwright/ux/'+(process.env.UX_RECORD==='1'?'before':'after')+'/levels-'+width+'.png'})
 const table=page.getByRole('table',{name:'Níveis da Evergreen'})
 await table.waitFor({timeout:3000})
 for(const label of ['Nível','Quem é','O que pode fazer','Onde vale'])await table.getByRole('columnheader',{name:label,exact:true}).waitFor()
 const meanings={Chairman:'Fundadores originais da Evergreen',APEX:'Fundadores de empresas','NÍVELO':'CEOs das empresas'}
 for(const [name,meaning] of Object.entries(meanings)){
  const row=table.getByRole('row').filter({has:page.getByRole('rowheader',{name,exact:true})})
  await row.getByText(meaning,{exact:true}).waitFor()
 }
 const confirmed=page.locator('.professional-level-person').filter({hasText:'Fixture Alice'})
 await confirmed.getByText('Confirmado',{exact:true}).waitFor()
 const pending=page.locator('.professional-level-person').filter({hasText:'Pessoa pendente QA'})
 await pending.getByText('Convite pendente',{exact:true}).waitFor()
 assert.equal(await pending.getByText('Confirmado',{exact:true}).count(),0)
 const chip=page.locator('[data-current-company]')
 await chip.getByRole('button',{name:/Seu acesso aqui/}).click()
 await page.getByText('Entender os níveis',{exact:true}).click()
 const vocabulary=page.getByRole('region',{name:'Seu acesso aqui'})
 for(const meaning of Object.values(meanings))await vocabulary.getByText(meaning,{exact:true}).waitFor()
 await page.screenshot({path:'output/playwright/ux/after/levels-access-'+width+'.png'})
 return {item:'P1-2',width,checks:8}
}
