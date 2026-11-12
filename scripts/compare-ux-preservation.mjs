import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {PNG} from 'pngjs'
const before=JSON.parse(readFileSync('output/ux-preservation-before.log','utf8'))
const after=JSON.parse(readFileSync('output/ux-preservation-after.log','utf8'))
assert.deepEqual(after,before,'Atributos da árvore alterados')
for(const file of ['evergreen-symbol.png','evergreen-holdings-logo.png'])assert.ok(readFileSync('public/'+file).equals(readFileSync('output/ux-baseline-P1/public/'+file)),'Ativo original alterado')
const results=[]
for(const width of [390,1440]){
 const before=PNG.sync.read(readFileSync('output/playwright/ux/before/professional-preserved-'+width+'.png'))
 const after=PNG.sync.read(readFileSync('output/playwright/ux/after/professional-preserved-'+width+'.png'))
 assert.equal(before.width,after.width);assert.equal(before.height,after.height)
 let changed=0,maxDelta=0
 for(let index=0;index<before.data.length;index+=4){
  const delta=Math.max(...[0,1,2,3].map(offset=>Math.abs(before.data[index+offset]-after.data[index+offset])))
  if(delta){changed++;maxDelta=Math.max(maxDelta,delta)}
 }
 results.push({width,pixels:before.width*before.height,changedPixels:changed,maxDelta})
}
console.log(JSON.stringify({tree:after,originalAssetsIdentical:true,professional:results},null,2))
writeFileSync('output/ux-preservation-result.json',JSON.stringify(results,null,2))
assert.ok(results.every(row=>row.maxDelta<=1&&row.changedPixels<=row.pixels*.0001),'A seção profissional mudou; inspecione as capturas')
