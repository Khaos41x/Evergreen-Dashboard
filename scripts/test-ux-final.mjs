import {spawnSync} from 'node:child_process'
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
const base=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('UX_')&&!key.startsWith('COLLAB_')))
const jobs=[
 ['features','scripts/test-ux-features.mjs',{}],
 ['extras','scripts/collaboration-ui-check.mjs',{UX_ITEM:'P2-extras',COLLAB_SURFACES:'1',COLLAB_ATLAS:'1',COLLAB_WIDTHS:'390,734'}],
 ['accessibility','scripts/test-ux-accessibility.mjs',{}],
 ['matrix','scripts/test-ux.mjs',{}],
 ['regression','scripts/collaboration-ui-check.mjs',{COLLAB_SURFACES:'1',COLLAB_ATLAS:'1',COLLAB_WIDTHS:'390,734,1440'}],
]
const only=process.argv.find(value=>value.startsWith('--only='))?.slice(7).split(',')
mkdirSync('output',{recursive:true})
const results=only&&existsSync('output/ux-final-results.json')?JSON.parse(readFileSync('output/ux-final-results.json','utf8')):[]
for(const [name,script,env] of jobs){
 if(only&&!only.includes(name))continue
 console.log('RUN '+name)
 const result=spawnSync(process.execPath,[script],{env:{...base,...env},encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024})
 writeFileSync('output/ux-final-'+name+'.log',(result.stdout||'')+(result.stderr||''))
 const previous=results.findIndex(row=>row.name===name);if(previous>=0)results.splice(previous,1)
 results.push({name,exit:result.status})
 writeFileSync('output/ux-final-results.json',JSON.stringify(results,null,2))
 console.log(JSON.stringify(results.at(-1)))
 if(result.status!==0){console.log((result.stdout||'').slice(-2500)+(result.stderr||'').slice(-3500));process.exit(result.status??1)}
}
console.log('PASS: all UX suites')
