import {readFileSync,writeFileSync} from 'node:fs'
import {PNG} from 'pngjs'
import assert from 'node:assert/strict'
const results=[]
for(const theme of ['atlas','evergreen','black','electric','light'])for(const route of ['hub','economy','founders']){
 const filename='theme-'+theme+'-'+route+'.png'
 const before=PNG.sync.read(readFileSync('output/playwright/ux/before/'+filename)),after=PNG.sync.read(readFileSync('output/playwright/ux/migration/'+filename))
 assert.equal(before.width,after.width);assert.equal(before.height,after.height)
 let changed=0,maxDelta=0,overOne=0,minX=before.width,minY=before.height,maxX=0,maxY=0
 for(let index=0;index<before.data.length;index+=4)if([0,1,2,3].some(offset=>before.data[index+offset]!==after.data[index+offset])){changed++;const delta=Math.max(...[0,1,2,3].map(offset=>Math.abs(before.data[index+offset]-after.data[index+offset])));maxDelta=Math.max(maxDelta,delta);if(delta>1)overOne++;const x=(index/4)%before.width,y=Math.floor(index/4/before.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
 results.push({theme,route,changedPixels:changed,maxDelta,overOne,bounds:changed?[minX,minY,maxX,maxY]:null,totalPixels:before.width*before.height})
}
console.log(JSON.stringify(results,null,2));writeFileSync('output/ux-token-pixels.json',JSON.stringify(results,null,2))
assert.ok(results.every(row=>row.overOne===0&&row.changedPixels<=row.totalPixels*.0001),'A migração excedeu a tolerância de rasterização: 1/255 em menos de 0,01% dos pixels')
