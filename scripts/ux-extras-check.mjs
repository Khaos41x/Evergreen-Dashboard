import assert from 'node:assert/strict'
export async function checkExtras({page,width,fixture,workspaceId,userId}){
 const now=new Date().toISOString()
 fixture.records.push({id:'accessible-task-qa',workspace_id:workspaceId,kind:'task',title:'Mover sem arrastar QA',description:'Fixture explícita para teclado',status:'todo',assignee_id:userId,project_id:null,objective_id:null,progress:0,version:1,priority:'normal',due_date:null,archived_at:null,completed_at:null,created_at:now,updated_at:now})
 console.log(JSON.stringify({extrasStart:width}))
 await page.locator('.os-company-directory article').first().getByRole('button',{name:'Entrar',exact:true}).click()
 await page.locator('.domain-home').waitFor()
 await page.locator('.domain-home').getByText('Mover sem arrastar QA',{exact:true}).first().waitFor()
 await page.evaluate(()=>{window.__uxClicks=[];for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,event=>{const button=event.target.closest?.('button');if(button)window.__uxClicks.push({type,text:button.textContent,open:document.querySelector('#workspace-sidebar')?.dataset.open})},true)})
 if(width<=600){await page.getByRole('navigation',{name:'Navegação mobile'}).getByRole('button',{name:'Tarefas',exact:true}).click()}
 else await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Trabalho',exact:true}).click()
 console.log(JSON.stringify({width,clicks:await page.evaluate(()=>window.__uxClicks)}))
 try{await page.getByRole('button',{name:'Quadro',exact:true}).click({timeout:5000})}catch(error){console.log(JSON.stringify({width,headings:await page.getByRole('heading').allTextContents(),active:await page.locator('.domain-nav [aria-current]').allTextContents()}));await page.screenshot({path:'output/playwright/ux/extra-failure-'+width+'.png'});throw error}
 const move=page.getByRole('combobox',{name:'Mover Mover sem arrastar QA',exact:true})
 await move.focus();await page.keyboard.press('Space');await page.getByRole('listbox').waitFor();await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='option');await page.keyboard.press('End');await page.getByRole('option',{name:'Concluído',exact:true}).and(page.locator('[data-highlighted]')).waitFor();await page.keyboard.press('ArrowUp');await page.getByRole('option',{name:'Em andamento',exact:true}).and(page.locator('[data-highlighted]')).waitFor()
 const saved=page.waitForResponse(response=>response.request().method()==='PATCH'&&decodeURIComponent(response.url()).includes('eg_records'))
 await page.keyboard.press('Enter');await saved
 assert.equal(fixture.records.find(row=>row.id==='accessible-task-qa').status,'in-progress')
 await move.getByText('Em andamento',{exact:true}).waitFor()
 await page.screenshot({path:'output/playwright/ux/after/keyboard-board-'+width+'.png'})
 fixture.financeDelay=600
 const oldResponse=page.waitForResponse(response=>{if(!decodeURIComponent(response.url()).includes('eg_economy_snapshot'))return false;return response.request().postDataJSON()?.p_workspace===workspaceId})
 await page.evaluate(()=>{history.pushState(null,'','/economy');dispatchEvent(new PopStateEvent('popstate'))})
 await page.getByRole('button',{name:'Atualizar registros',exact:true}).waitFor()
 await page.waitForFunction(()=>document.querySelector('button[aria-label="Atualizar registros"]')?.disabled)
 fixture.financeDelay=0
 const dialogs=[];const onDialog=dialog=>{dialogs.push(dialog.message());void dialog.dismiss()};page.on('dialog',onDialog)
 const chip=page.locator('[data-current-company]'),other=fixture.workspaces.find(row=>row.id!==workspaceId)
 await chip.getByRole('button',{name:/Seu acesso aqui/}).click()
 await page.getByRole('region',{name:'Seu acesso aqui'}).getByRole('button',{name:'Abrir empresa '+other.name,exact:true}).click()
 await page.waitForFunction(id=>document.querySelector('[data-current-company]')?.dataset.currentCompany===id,other.id)
 await page.getByRole('region',{name:'Saldo disponível',exact:true}).getByText('BRL 500,00',{exact:true}).waitFor()
 await oldResponse
 assert.equal(await page.getByRole('region',{name:'Saldo disponível',exact:true}).getByText('BRL 8.750,99',{exact:true}).count(),0)
 assert.deepEqual(dialogs,[],'Leitura em andamento não é rascunho sensível')
 page.off('dialog',onDialog)
 return {item:'P2-extras',width,keyboardMoveWithoutDrag:true,readCanSwitch:true,staleCompanyResponseIgnored:true}
}
