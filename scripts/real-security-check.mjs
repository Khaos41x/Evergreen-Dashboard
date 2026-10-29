import {createClient} from '@supabase/supabase-js'
import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
process.loadEnvFile('.env.local')
const state=JSON.parse(readFileSync(`${process.argv[2]}/test-accounts.json`,'utf8'))
const make=()=>createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const a=make(),b=make(),c=make(),anon=make(),checks=[]
try {
 for(const [client,letter] of [[a,'A'],[b,'B'],[c,'C']]){const u=state.accounts[letter];const result=await client.auth.signInWithPassword({email:u.email,password:u.password});if(result.error)throw result.error}
 const result=JSON.parse(readFileSync('output/e2e-real-results.json','utf8'))
 const all=await a.from('eg_workspaces').select('id,name').order('created_at',{ascending:false});if(all.error)throw all.error
 const w=all.data.find(w=>w.name===result.workspace)??all.data[0]
 const privateResult=await a.from('eg_channels').select('id').eq('workspace_id',w.id).eq('is_private',true).single();if(privateResult.error)throw privateResult.error
 const privateId=privateResult.data.id
 const anonymous=await anon.from('eg_messages').select('id');assert.ok(anonymous.error);checks.push('anonymous messages access denied')
 const outside=await c.from('eg_workspaces').select('id').eq('id',w.id);assert.equal(outside.data.length,0)
 const outsideWrite=await c.from('eg_records').insert({workspace_id:w.id,kind:'task',title:'unauthorized test must not persist'});assert.ok(outsideWrite.error);checks.push('outsider cannot read workspace or create records')
 const sameWorkspace=await b.from('eg_members').select('user_id').eq('workspace_id',w.id).eq('user_id',state.accounts.B.id);assert.equal(sameWorkspace.data.length,1)
 const privateRead=await b.from('eg_channels').select('id').eq('id',privateId);assert.equal(privateRead.data.length,0)
 const privateWrite=await b.from('eg_messages').insert({channel_id:privateId,body:'unauthorized private test must not persist'});assert.ok(privateWrite.error)
 const privateJoin=await b.rpc('eg_channel_membership',{p_channel:privateId,p_user:state.accounts.B.id,p_join:true});assert.ok(privateJoin.error);checks.push('workspace member cannot read/write/self-join private channel')
 const role=await b.from('eg_members').update({role:'owner'}).eq('workspace_id',w.id).eq('user_id',state.accounts.B.id);assert.ok(role.error);checks.push('direct role escalation denied')
 const general=await a.from('eg_channels').select('id').eq('workspace_id',w.id).eq('name','geral').single();if(general.error)throw general.error
 const own=await a.from('eg_messages').select('id').eq('channel_id',general.data.id).eq('author_id',state.accounts.A.id).limit(1).single();if(own.error)throw own.error
 const edit=await b.from('eg_messages').update({body:'unauthorized edit must not persist'}).eq('id',own.data.id).select('id');assert.equal(edit.data.length,0);checks.push('another author cannot edit a message')
 const immutable=await a.from('eg_profiles').update({id:state.accounts.C.id}).eq('id',state.accounts.A.id);assert.ok(immutable.error);checks.push('profile id remains immutable after frontend save correction')
 const record=await a.from('eg_records').select('id').eq('workspace_id',w.id).limit(1).maybeSingle()
 if(record.data){const update=await c.from('eg_records').update({title:'unauthorized cross-workspace edit'}).eq('id',record.data.id).select('id');assert.equal(update.data.length,0);checks.push('cross-workspace record edit denied')}
 writeFileSync('output/real-security-results.json',JSON.stringify({status:'PASS',environment:'real Supabase Auth + public Data API; no admin credential',checks},null,2));console.log(JSON.stringify({status:'PASS',checks},null,2))
}finally{for(const client of [a,b,c])await client.auth.signOut()}
