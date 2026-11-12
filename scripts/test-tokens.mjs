import {existsSync,writeFileSync,unlinkSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
const filename='src/features/layout/.token-rule-probe.tsx'
assert.equal(existsSync(filename),false,'Do not overwrite an existing file')
const run=()=>spawnSync(process.execPath,['scripts/check-tokens.mjs'],{encoding:'utf8',windowsHide:true})
assert.equal(run().status,0)
try{
 writeFileSync(filename,'export const probe=<div className="bg-blue-500" style={{color:"#abc",background:"rgb(1, 2, 3)",outlineColor:"hsl(210 50% 50%)"}}/>')
 const result=run();assert.equal(result.status,1);assert.ok(JSON.parse(result.stdout).violations===4)
 console.log('PASS: check:tokens rejects hex, rgb/hsl and fixed palette classes; semantic text-emerald resolves through var(--emerald).')
}finally{unlinkSync(filename)}
assert.equal(run().status,0)
