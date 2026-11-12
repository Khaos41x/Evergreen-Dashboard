import {readdirSync,readFileSync} from 'node:fs'
import path from 'node:path'
import {parse} from '@babel/parser'
import postcss from 'postcss'
const color=/(?:#[\da-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(|\b(?:text|bg|border|ring|fill|stroke)-(?:red|green|blue|gray|slate|zinc|neutral|white|black|emerald|indigo|violet|amber|yellow|rose)(?:-\d{2,3})?\b)/i
const allowed=new Set(['src/features/appearance/themes.css','src/features/appearance/atlas.css','src/features/appearance/color-tokens.css','src/features/appearance/visual-colors.ts'])
function files(directory){return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)])}
const violations=[]
for(const filename of files('src')){
 const file=filename.replaceAll('\\','/');if(allowed.has(file))continue
 const source=readFileSync(filename,'utf8')
 const report=(value,start)=>{if(color.test(value.replace(/\btext-emerald(?!-)\b/g,'')))violations.push({file,line:source.slice(0,start).split('\n').length,value:value.slice(0,130)})}
 if(file.endsWith('.css'))postcss.parse(source,{from:file}).walkDecls(decl=>report(decl.value,decl.source?.start?.offset||0))
 if(/\.tsx?$/.test(file)){
  const ast=parse(source,{sourceType:'module',plugins:['typescript',...(file.endsWith('.tsx')?['jsx']:[])]})
  const walk=node=>{
   if(!node||typeof node!=='object')return
   if(node.type==='StringLiteral')report(node.value,node.start)
   if(node.type==='TemplateLiteral')for(const part of node.quasis)report(part.value.cooked||part.value.raw,part.start)
   for(const [key,value] of Object.entries(node)){if(['loc','comments','tokens'].includes(key))continue;if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value)}
  };walk(ast)

 }
}
console.log(JSON.stringify({checked:'src CSS declarations and TS/TSX string literals',violations:violations.length,examples:violations.slice(0,12)},null,2))
if(violations.length)process.exitCode=1
