import assert from 'node:assert/strict'
export async function checkFinance({page,width,fixture}){
 await page.locator('.os-company-directory article').first().getByRole('button',{name:'Entrar',exact:true}).click()
 const navigate=path=>page.evaluate(path=>{history.pushState(null,'',path);dispatchEvent(new PopStateEvent('popstate'))},path)
 fixture.financeDelay=500
 await navigate('/economy')
 await page.getByRole('status',{name:'Carregando indicadores'}).waitFor()
 fixture.financeDelay=0
 await page.getByRole('heading',{name:'Finanças',exact:true}).waitFor()
 await page.getByText('Receita autorizada QA',{exact:true}).waitFor()
 await page.screenshot({path:'output/playwright/ux/'+(process.env.UX_RECORD==='1'?'before':'after')+'/finance-decision-'+width+'.png'})
 assert.equal(await page.locator('.collab-top').getByRole('button',{name:'Finanças',exact:true}).count(),0,'Finanças duplicado no cabeçalho')
 assert.equal(await page.locator('.collab-top').getByRole('button',{name:'Fundadores',exact:true}).count(),0,'Fundadores duplicado no cabeçalho')
 await page.getByRole('button',{name:'Mapa',exact:true}).waitFor()
 assert.ok(await page.locator('.economy-kpi').count()>=3)
 if(width===734){
 const bounds=await page.locator('.economy-embedded').evaluate(region=>{
  const rect=region.getBoundingClientRect(),data=[...region.querySelectorAll('.economy-kpis,.economy-recent-ledger')].map(el=>el.getBoundingClientRect())
  return {height:rect.height,visible:data.reduce((sum,box)=>sum+Math.max(0,Math.min(box.bottom,rect.bottom)-Math.max(box.top,rect.top)),0),bottom:rect.bottom}
 })
 console.log(JSON.stringify({width,dataHeight:bounds.visible,panelHeight:bounds.height,ratio:bounds.visible/bounds.height}))
 assert.ok(bounds.visible>=bounds.height*.5,JSON.stringify(bounds))
 for(const locator of [page.getByRole('button',{name:'Preparar transferência',exact:true}),page.locator('.economy-recent-list>li').first()]){
  const box=await locator.boundingBox();assert.ok(box.y+box.height<=bounds.bottom,'Ação/movimento abaixo da dobra')
 }
 }
 await page.keyboard.press('Meta+k')
 await page.getByRole('dialog',{name:'Buscar na Evergreen'}).waitFor()
 await page.getByRole('dialog').getByRole('button',{name:'Fechar diálogo'}).click()
 await page.keyboard.press('Control+k')
 await page.getByRole('dialog',{name:'Buscar na Evergreen'}).waitFor()
 await page.getByRole('dialog').getByRole('button',{name:'Fechar diálogo'}).click()
 await page.locator('.workspace-top-search').click()
 const palette=page.getByRole('dialog',{name:'Buscar na Evergreen'})
 await palette.getByText(fixture.workspaces[0].name,{exact:true}).first().waitFor()
 await palette.getByRole('button',{name:'Fechar diálogo'}).click()
 await page.getByRole('button',{name:'Ver todas as movimentações',exact:true}).click()
 await page.getByRole('heading',{name:'Livro de movimentações',exact:true}).waitFor()
 await navigate('/economy')
 await page.getByRole('button',{name:'Visão Geral',exact:true}).click()
 fixture.operationsReadOnly=true
 await page.getByRole('button',{name:'Visão Geral',exact:true}).click()
 await page.getByRole('button',{name:'Movimentações',exact:true}).click()
 await page.getByRole('button',{name:'Visão Geral',exact:true}).click()
 await page.getByRole('region',{name:'Vencimentos · 7 dias',exact:true}).getByText('BRL 700,00',{exact:true}).waitFor({timeout:3000})
 await page.getByRole('button',{name:'1 pendência · Compromissos e aprovações',exact:true}).waitFor()
 fixture.operationsReadOnly=false
 fixture.financeEmpty=true
 await page.getByRole('button',{name:'Atualizar registros',exact:true}).click()
 await page.getByRole('heading',{name:'Seu financeiro começa aqui',exact:true}).waitFor()
 await page.getByRole('button',{name:'Cadastrar primeira conta',exact:true}).waitFor()
 fixture.financeEmpty=false;fixture.financeDenied=true
 await page.getByRole('button',{name:'Atualizar registros',exact:true}).click()
 await page.getByRole('alert').filter({hasText:'Acesso financeiro restrito'}).waitFor()
 fixture.financeDenied=false
 await page.getByRole('button',{name:'Tentar novamente',exact:true}).first().click()
 await page.getByText('Receita autorizada QA',{exact:true}).waitFor()
 return {item:'P1-1',width,checks:16}
}
