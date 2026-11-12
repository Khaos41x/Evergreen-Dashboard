// One-time migration: preserve rendered values while centralizing palette primitives.
// Semantic theme aliases remain in themes.css and atlas.css.
import {existsSync,readdirSync,readFileSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {parse} from '@babel/parser'
import postcss from 'postcss'
import valueParser from 'postcss-value-parser'
if(existsSync('src/features/appearance/color-tokens.css'))throw new Error('Color token migration already applied. Review its report; do not overwrite the palette.')
const excluded=new Set(['src/features/appearance/themes.css','src/features/appearance/atlas.css','src/features/appearance/color-tokens.css','src/features/appearance/visual-colors.ts'])
const literal=/(#[\da-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/i
const hex=/^#[\da-f]{3,8}$/i
const tokens=new Map(),counts={},sources=[]
function family(value){
 if(!hex.test(value))return /^(rgba?|hsla?)\(/i.test(value)?'overlay':'art'
 let raw=value.slice(1);if(raw.length===3||raw.length===4)raw=[...raw].map(char=>char+char).join('')
 const [r,g,b]=[0,2,4].map(index=>parseInt(raw.slice(index,index+2),16))
 if(Math.max(r,g,b)-Math.min(r,g,b)<22)return 'neutral'
 return g>r&&g>b?'green':b>r&&b>g?'blue':r>b&&g>b?'warm':'accent'
}
function register(value,file){
 const normalized=value.toLowerCase()
 if(!tokens.has(normalized)){const group=family(value),index=String(counts[group]=(counts[group]||0)+1).padStart(3,'0');tokens.set(normalized,{name:'palette-'+group+'-'+index,js:'color'+group[0].toUpperCase()+group.slice(1)+index,value,uses:0,files:new Set()})}
 const token=tokens.get(normalized);token.uses++;token.files.add(file);return token
}
function files(directory){return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)])}
for(const filename of files('src')){
 const file=filename.replaceAll('\\','/');if(excluded.has(file))continue
 const original=readFileSync(file,'utf8')
 let result=original
 if(file.endsWith('.css')){
  const ast=postcss.parse(original,{from:file})
  ast.walkDecls(decl=>{
   if(!literal.test(decl.value))return
   if(/url\(/i.test(decl.value)){decl.value='var(--'+register(decl.value,file).name+')';return}
   const value=valueParser(decl.value)
   value.walk(node=>{
    if(node.type==='function'&&/^(rgba?|hsla?)$/i.test(node.value)){
     const token=register(valueParser.stringify(node),file);node.type='word';node.value='var(--'+token.name+')';delete node.nodes;return false
    }
    if(node.type==='word'&&hex.test(node.value))node.value='var(--'+register(node.value,file).name+')'
   })
   decl.value=value.toString()
  })
  result=ast.toString()
 }
 if(/\.tsx?$/.test(file)){
  const ast=parse(original,{sourceType:'module',plugins:['typescript',...(file.endsWith('.tsx')?['jsx']:[])]})
  const edits=[],imports=new Set()
  function walk(node,parent){
   if(!node||typeof node!=='object')return
   const text=node.type==='StringLiteral'?node.value:node.type==='TemplateLiteral'&&node.expressions.length===0?node.quasis[0].value.cooked:null
   if(text&&literal.test(text)){
    const token=register(text,file);imports.add(token.js)
    const expression=parent?.type==='JSXAttribute'?'{'+token.js+'}':token.js
    edits.push({start:node.start,end:node.end,text:expression});return
   }
   for(const [key,value] of Object.entries(node)){
    if(['loc','comments','tokens'].includes(key))continue
    if(Array.isArray(value))value.forEach(child=>walk(child,node));else if(value&&typeof value==='object')walk(value,node)
   }
  }
  walk(ast,null)
  for(const edit of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,edit.start)+edit.text+result.slice(edit.end)
  if(imports.size){
   let relative=path.relative(path.dirname(file),'src/features/appearance/visual-colors').replaceAll('\\','/');if(!relative.startsWith('.'))relative='./'+relative
   result="import {"+[...imports].sort().join(',')+"} from '"+relative+"'\n"+result
  }
 }
 if(result!==original){writeFileSync(file,result);sources.push(file)}
}
writeFileSync('src/features/appearance/color-tokens.css','/* Palette primitives extracted without changing rendered values. Use semantic theme aliases for new UI. */\n:root {\n'+[...tokens.values()].map(token=>'  --'+token.name+': '+token.value+';').join('\n')+'\n}\n')
writeFileSync('src/features/appearance/visual-colors.ts','// Fixed illustration/chart primitives. Themeable interface surfaces use CSS semantic tokens.\n'+[...tokens.values()].filter(token=>[...token.files].some(file=>/\.tsx?$/.test(file))).map(token=>'export const '+token.js+' = '+JSON.stringify(token.value)).join('\n')+'\n')
let style=readFileSync('src/styles.css','utf8');if(!style.includes('@import "./features/appearance/color-tokens.css"'))style='@import "./features/appearance/color-tokens.css";\n'+style;writeFileSync('src/styles.css',style)
writeFileSync('output/ux-token-migration.json',JSON.stringify({changed:sources,tokens:[...tokens.values()].map(token=>({...token,files:[...token.files]}))},null,2))
console.log(JSON.stringify({changedFiles:sources.length,primitives:tokens.size,uses:[...tokens.values()].reduce((sum,token)=>sum+token.uses,0)}))
