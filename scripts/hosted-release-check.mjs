// Anonymous read-only checks. Never extract a user session or impersonate an account.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const local=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>/^VITE_SUPABASE_(URL|PUBLISHABLE_KEY)=/.test(line)).map(line=>{const index=line.indexOf('=');return [line.slice(0,index),line.slice(index+1).replace(/^["']|["']$/g,'')]}))
const url=process.env.VITE_SUPABASE_URL||local.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY||local.VITE_SUPABASE_PUBLISHABLE_KEY
assert.equal(new URL(url).hostname,'dlxsakabwtpdimolsmgd.supabase.co')
const results=[]
for(const rpc of ['eg_company_people','eg_company_invites_snapshot']){
 const response=await fetch(url+'/rest/v1/rpc/'+rpc,{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify({p_workspace:'00000000-0000-4000-8000-000000000000'})}),data=await response.json()
 assert.notEqual(data.code,'PGRST202','RPC absent from hosted schema cache: '+rpc)
 assert.ok([401,403].includes(response.status),rpc+' must require authentication')
 assert.equal(data.code,'42501')
 results.push({rpc,status:response.status,code:data.code,schemaResolved:true,anonymousDenied:true})
}
mkdirSync('output/releases/1.2.0',{recursive:true});writeFileSync('output/releases/1.2.0/hosted-rpc-anonymous.json',JSON.stringify({environment:'Real Supabase REST; public key only; no signed-in workflow',results},null,2));console.log(JSON.stringify(results,null,2))
