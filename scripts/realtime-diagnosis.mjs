import {createClient} from '@supabase/supabase-js'
import {readFileSync} from 'node:fs'
process.loadEnvFile('.env.local')
const state=JSON.parse(readFileSync(`${process.argv[2]}/test-accounts.json`,'utf8'))
const make=()=>createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const a=make(),b=make()
try {
 for(const [client,letter] of [[a,'A'],[b,'B']]){const u=state.accounts[letter];const result=await client.auth.signInWithPassword({email:u.email,password:u.password});if(result.error)throw result.error}
 const aw=await a.from('eg_workspaces').select('id'),bw=await b.from('eg_workspaces').select('id');const common=aw.data.filter(w=>bw.data.some(v=>v.id===w.id));if(!common.length)throw new Error('No common workspace')
 const channels=await b.from('eg_channels').select('id').eq('workspace_id',common[0].id).eq('name','geral');const id=channels.data[0].id
 const events=[]
 const sub=b.channel('diagnosis').on('postgres_changes',{event:'*',schema:'public',table:'eg_messages',filter:`channel_id=eq.${id}`},payload=>{events.push(payload.eventType);console.log('EVENT',payload.eventType)})
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Subscribe timeout')),12000);sub.subscribe((status,error)=>{console.log('Subscription:',status,error?.message??'');if(status==='SUBSCRIBED'){clearTimeout(timer);resolve()}if(status==='CHANNEL_ERROR'){clearTimeout(timer);reject(error??new Error(status))}})})
 const inserted=await a.from('eg_messages').insert({channel_id:id,body:`Realtime diagnostic ${Date.now()}`}).select('id').single();if(inserted.error)throw inserted.error
 await new Promise(resolve=>setTimeout(resolve,8000))
 const read=await b.from('eg_messages').select('id').eq('id',inserted.data.id)
 console.log(JSON.stringify({events,recipientCanRead:read.data?.length===1,readError:read.error}))
}finally{await a.removeAllChannels();await b.removeAllChannels();await a.auth.signOut();await b.auth.signOut()}
