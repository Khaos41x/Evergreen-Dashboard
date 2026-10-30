import {PGlite} from '@electric-sql/pglite'
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const pg=new PGlite(),checks=[]
await pg.exec(`create role anon;create role authenticated;create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users,created_at timestamptz default now(),not_after timestamptz,user_agent text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
grant usage on schema auth to authenticated;grant execute on all functions in schema auth to authenticated;
create publication supabase_realtime;create schema realtime;create table realtime.messages(extension text);alter table realtime.messages enable row level security;
create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true)$$;grant usage on schema realtime to authenticated;grant select,insert on realtime.messages to authenticated;
create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`)
const migrations=readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort()
for(const m of migrations.filter(x=>x<'20261027160000'))await pg.exec(readFileSync('supabase/migrations/'+m,'utf8'))
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',c='00000000-0000-4000-8000-000000000003'
const sessions=new Map([[a,'10000000-0000-4000-8000-000000000001'],[b,'10000000-0000-4000-8000-000000000002'],[c,'10000000-0000-4000-8000-000000000003']])
for(const id of[a,b,c]){await pg.query('insert into auth.users(id,email,email_confirmed_at)values($1,$2,now())',[id,id+'@test.invalid']);await pg.query('insert into auth.sessions(id,user_id)values($1,$2)',[sessions.get(id),id])}
async function as(id,recent=true){await pg.exec('reset role');await pg.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id,JSON.stringify({sub:id,session_id:sessions.get(id),amr:[{method:'otp',timestamp:Math.floor(Date.now()/1000)-(recent?0:3600)}]})]);await pg.exec('set role authenticated')}
async function val(sql,args=[]){return(await pg.query(sql,args)).rows[0]?.value}
async function denied(sql,args=[]){await assert.rejects(()=>pg.query(sql,args))}
await as(a);await pg.query('insert into eg_profiles(id,display_name)values($1,$2)',[a,'Alice'])
const w=await val("select eg_create_workspace('Company A') value")
const inv=await val("insert into eg_invites(workspace_id,email)values($1,$2)returning token value",[w,b+'@test.invalid'])
await as(b);await pg.query('insert into eg_profiles(id,display_name)values($1,$2)',[b,'Bob']);await pg.query('select eg_accept_invite($1)',[inv])
await as(c);const other=await val("select eg_create_workspace('Other Company') value")
await pg.exec('reset role')
for(const m of migrations.filter(x=>x>='20261027160000')){await pg.exec(readFileSync('supabase/migrations/'+m,'utf8')).catch(e=>{throw new Error(m+': '+e.message)});checks.push('replay '+m)}
await as(a);let ctx=await val('select eg_identity_context() value');assert.equal(ctx.active,true);assert.equal(ctx.workspaces.length,1)
await pg.query("update eg_profiles set job_title='Fundador',display_name='Alice Cooper' where id=$1",[a])
await as(b);const profiles=await pg.query('select * from eg_public_profiles($1)',[w]);assert.equal(profiles.rows.find(x=>x.id===a).job_title,'Fundador')
const ownWorkspace=await val("select eg_create_workspace('Independent member space') value");
assert.equal(await val("select count(*)::int value from eg_members where workspace_id=$1 and user_id=$2 and role='owner'",[w,b]),0);
assert.equal(await val("select count(*)::int value from eg_members where workspace_id=$1 and user_id=$2 and role='owner'",[ownWorkspace,b]),1);
checks.push('profile name/job shared within company; job never grants role')
async function act(action,data,workspace=w){return val('select eg_economy_action($1,$2,$3::jsonb) value',[workspace,action,JSON.stringify(data)])}
await denied("select eg_economy_snapshot($1)",[other]);await denied("select eg_economy_action($1,'company','{\"name\":\"Attack\",\"currency\":\"BRL\"}')",[w])
await as(a);const ca=await act('company',{name:'First',currency:'BRL'}),cb=await act('company',{name:'Second',currency:'BRL'})
const ac=await act('account',{company_id:ca,name:'Checking'}),bc=await act('account',{company_id:cb,name:'Checking'})
const goal=await act('goal',{company_id:ca,name:'Reserve',target_cents:'50000',due_on:'2027-01-01'})
const rid=crypto.randomUUID(),post={account_id:ac,cents:'10001',description:'Income exact',request_id:rid}
const event=await act('income',post);assert.equal(await act('income',post),event)
await assert.rejects(()=>act('income',{...post,cents:'10002'}))
await act('transfer',{account_id:ac,to_account_id:bc,cents:'2501',description:'Internal',request_id:crypto.randomUUID()})
await act('transfer',{account_id:ac,to_account_id:goal,cents:'1000',description:'Reserve allocation',request_id:crypto.randomUUID()})
let snap=await val('select eg_economy_snapshot($1) value',[w])
assert.equal(snap.accounts.reduce((n,x)=>n+BigInt(x.balance),0n),10001n)
assert.equal(snap.flows.reduce((n,x)=>n+BigInt(x.income),0n),10001n)
assert.equal(snap.accounts.find(x=>x.id===goal).balance,'1000')
checks.push('exact cents, atomic two-leg transfer, reserve counted once, idempotent retry and changed-payload denial')
await act('grant',{company_id:ca,user_id:b,role:'viewer'})
await as(b);snap=await val('select eg_economy_snapshot($1) value',[w]);assert.equal(snap.companies.length,1);assert.equal(snap.accounts.reduce((n,x)=>n+BigInt(x.balance),0n),7500n)
await assert.rejects(()=>act('expense',{account_id:ac,cents:'1',description:'Forbidden',request_id:crypto.randomUUID()}))
await denied('update eg_fin_members set role=\'admin\'')
const hist=await val('select eg_economy_history($1) value',[w]);assert.ok(hist.some(x=>x.description.includes('restrita')));assert.ok(!hist.some(x=>x.description==='Internal'))
checks.push('viewer cannot write/escalate; one-company scope excludes counterpart metadata')
await as(a,false);await assert.rejects(()=>act('expense',{account_id:ac,cents:'1',description:'stale',request_id:crypto.randomUUID()}))
await as(a);await assert.rejects(()=>act('expense',{account_id:ac,cents:'999999999',description:'overdraft',request_id:crypto.randomUUID()}))
const exp=await act('expense',{account_id:ac,cents:'1',description:'Expense',request_id:crypto.randomUUID()})
await act('reversal',{event_id:exp,description:'Correction',request_id:crypto.randomUUID()})
await assert.rejects(()=>act('reversal',{event_id:exp,description:'duplicate',request_id:crypto.randomUUID()}))
await act('budget',{company_id:ca,month:'2026-10-01',income_cents:'50000',expense_cents:'20000'})
await assert.rejects(()=>act('budget',{company_id:ca,month:'2026-10-01',income_cents:'1',expense_cents:'2',version:0}))
checks.push('stale authentication, overdraft, duplicate reversal and stale budget denied')
// Founders grants are independent of ordinary workspace membership and job title.
await as(b);assert.equal(await val('select eg_founders_access() value'),false)
await denied("select eg_founders_snapshot(gen_random_uuid())")
await as(a)
async function founder(action,data,group){return val('select eg_founders_action($1,$2,$3::jsonb) value',[group||null,action,JSON.stringify(data)])}
const group=await founder('create',{name:'Test Group'})
await founder('link',{workspace_id:w},group)
await assert.rejects(()=>founder('link',{workspace_id:other},group))
await pg.exec('reset role')
await pg.query("insert into eg_members values($1,$2,'owner','Alice')",[other,a])
await as(a);await founder('link',{workspace_id:other},group)
const caps=['overview','companies','people','projects','intelligence','finance','decisions','documents','communication']
await founder('self_scope',{workspace_id:w,capabilities:caps.filter(x=>x!=='communication')},group)
await founder('grant',{user_id:b,role:'founder',capabilities:caps},group)
await founder('scope',{user_id:b,workspace_id:w,capabilities:caps.filter(x=>x!=='communication')},group)
const doc=await founder('document',{title:'Other company secret',workspace_id:other},group)
const pathOther='founders/'+group+'/'+doc+'/'+a+'/file'
await pg.query("insert into storage.objects values('eg-files',$1)",[pathOther])
const ownDoc=await founder('document',{title:'Group secret'},group)
const ownPath='founders/'+group+'/'+ownDoc+'/'+a+'/file'
await pg.query("insert into storage.objects values('eg-files',$1)",[ownPath])
const fs=await val('select eg_founders_snapshot($1) value',[group])
assert.equal(fs.companies.length,2);assert.equal(fs.finance.length,1)
assert.equal(fs.finance[0].data.accounts.reduce((n,x)=>n+BigInt(x.balance),0n),10001n)
const chat=fs.communication.channel_id,commWs=fs.communication.workspace_id
await pg.query("insert into eg_messages(channel_id,body)values($1,'Founders secret')",[chat])
await as(b);const bs=await val('select eg_founders_snapshot($1) value',[group])
assert.equal(bs.companies.length,1);assert.equal(bs.companies[0].id,w)
assert.equal(bs.finance[0].data.companies.length,1)
assert.equal(bs.documents.length,1);assert.equal(bs.documents[0].id,ownDoc)
assert.equal(await val("select count(*)::int value from storage.objects where name=$1",[pathOther]),0)
assert.equal(await val("select count(*)::int value from storage.objects where name=$1",[ownPath]),1)
await assert.rejects(()=>founder('self_scope',{workspace_id:other,capabilities:['finance']},group))
await denied("update eg_group_members set role='group_owner'")
await assert.rejects(()=>founder('grant',{user_id:c,role:'founder',capabilities:caps},group))
checks.push('founder explicit company denial, no role escalation, shared scoped Economy, private strategy documents and chat')
const proposal=await founder('propose',{title:'Approve plan',body:'Decision does not move money',quorum:2,deadline:'2027-01-01T00:00:00Z',workspace_id:w},group)
await founder('vote',{decision_id:proposal,approve:true},group)
await assert.rejects(()=>founder('close',{decision_id:proposal},group))
await as(a);await founder('vote',{decision_id:proposal,approve:true},group);await founder('close',{decision_id:proposal},group)
assert.equal((await val('select eg_founders_snapshot($1) value',[group])).decisions[0].status,'approved')
await founder('revoke',{user_id:b},group)
await as(b);assert.equal(await val('select eg_founders_access() value'),false)
await denied('select eg_founders_snapshot($1)',[group])
assert.equal(await val('select count(*)::int value from eg_messages where channel_id=$1',[chat]),0)
assert.equal(await val("select count(*)::int value from storage.objects where name=$1",[ownPath]),0)
checks.push('decision quorum and immutable closure; founder revocation immediately removes private chat, documents and strategic data')
await as(a);const bad=await val("insert into eg_invites(workspace_id,email)values($1,$2)returning token value",[commWs,c+'@test.invalid'])
await as(c);await denied('select eg_accept_invite($1)',[bad])
checks.push('ordinary workspace invite cannot bypass Founders-only chat membership')
await as(a)
const foreignCompany=await act('company',{name:'Other linked enterprise',currency:'BRL'},other)
const foreignAccount=await act('account',{company_id:foreignCompany,name:'Other account'},other)
const beforeAcross=await val('select eg_economy_snapshot($1) value',[w])
const usdCompany=await act('company',{name:'USD books',currency:'USD'}),usdAccount=await act('account',{company_id:usdCompany,name:'Dollar account'})
await assert.rejects(()=>act('transfer',{account_id:ac,to_account_id:usdAccount,cents:'10',description:'Invalid FX',request_id:crypto.randomUUID()}))
await act('transfer',{account_id:ac,to_account_id:foreignAccount,cents:'50',description:'Linked-company transfer',request_id:crypto.randomUUID()})
const afterAcross=await val('select eg_economy_snapshot($1) value',[w]),otherAcross=await val('select eg_economy_snapshot($1) value',[other])
assert.equal(afterAcross.accounts.filter(x=>x.currency==='BRL').reduce((n,x)=>n+BigInt(x.balance),0n)+otherAcross.accounts.reduce((n,x)=>n+BigInt(x.balance),0n),10001n)
await founder('self_scope',{workspace_id:other,capabilities:['overview','companies','finance']},group)
const consolidated=await val('select eg_founders_snapshot($1) value',[group])
assert.equal(consolidated.finance.flatMap(x=>x.data.accounts).filter(x=>x.currency==='BRL').reduce((n,x)=>n+BigInt(x.balance),0n),10001n)
const targets=await val('select eg_economy_targets($1) value',[w]);assert.ok(targets.some(x=>x.id===foreignAccount))
checks.push('formal linked-company cross-workspace transfer cancels in group balance; currencies never mixed')
for(let i=0;i<55;i++)await act('income',{account_id:ac,cents:'1',description:'Page fixture '+i,request_id:crypto.randomUUID()})
const page1=await val('select eg_economy_history($1) value',[w]);assert.equal(page1.length,50)
const last=page1.at(-1),page2=await val('select eg_economy_history($1,$2,$3) value',[w,last.created_at,last.id])
assert.ok(page2.length>0);assert.ok(page2.every(x=>!page1.some(y=>x.id===y.id)))
const allBalance=(await val('select eg_economy_snapshot($1) value',[w])).accounts.filter(x=>x.currency==='BRL').reduce((n,x)=>n+BigInt(x.balance),0n)
assert.equal(allBalance,10006n)
checks.push('history cursor pages without duplicates; snapshot balance covers all ledger rows beyond a history page')
const invited='00000000-0000-4000-8000-000000000088'
const newInvite=await val("insert into eg_invites(workspace_id,email)values($1,'invitee@test.invalid')returning token value",[w])
await pg.exec('reset role')
await pg.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)values($1,'invitee@test.invalid',now(),$2::jsonb)",[invited,JSON.stringify({full_name:'Invited Person',job_title:'Diretor',role:'group_owner'})])
const newSession='10000000-0000-4000-8000-000000000088';sessions.set(invited,newSession)
await pg.query('insert into auth.sessions(id,user_id)values($1,$2)',[newSession,invited])
await as(invited);await pg.query('select eg_identity_bootstrap($1)',[newInvite])
const invitedCtx=await val('select eg_identity_context() value')
assert.equal(invitedCtx.profile.display_name,'Invited Person');assert.equal(invitedCtx.profile.job_title,'Diretor');assert.equal(invitedCtx.workspaces[0].role,'member')
assert.equal(await val('select eg_founders_access() value'),false)
checks.push('OAuth-style invited account bootstrap persists name/job; forged role metadata grants no privileges')
// Self-registration and a first workspace never disclose an existing company.
const fresh='00000000-0000-4000-8000-000000000099',freshSession='10000000-0000-4000-8000-000000000099';
await pg.exec('reset role');await pg.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)values($1,'normal@test.invalid',now(),$2::jsonb)",[fresh,JSON.stringify({display_name:'Pessoa nova',role:'owner',job_title:'Fundador'})]);
await pg.query('insert into auth.sessions(id,user_id)values($1,$2)',[freshSession,fresh]);sessions.set(fresh,freshSession);
await as(fresh);await pg.query('select eg_identity_bootstrap()');assert.equal((await val('select eg_identity_context() value')).workspaces.length,0);
assert.equal(await val('select count(*)::int value from eg_records'),0);await denied('select eg_economy_snapshot($1)',[w]);assert.equal(await val('select eg_founders_access() value'),false);
const freshWorkspace=await val("select eg_create_workspace('Minha equipe') value");
assert.equal((await val('select eg_identity_context() value')).workspaces.length,1);assert.notEqual(freshWorkspace,w);
await denied("select eg_create_workspace('x')");
await pg.exec('reset role');await pg.query('update auth.users set email_confirmed_at=null where id=$1',[fresh]);await as(fresh);await denied("select eg_create_workspace('Unconfirmed email')");
await pg.exec('reset role');await pg.query('update auth.users set email_confirmed_at=now() where id=$1',[fresh]);await as(fresh);
await pg.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:fresh,session_id:freshSession,amr:[{method:'recovery',timestamp:Math.floor(Date.now()/1000)}]})]);
const recoveryContext=await val('select eg_identity_context() value');assert.equal(recoveryContext.password_recovery,true);assert.equal(recoveryContext.recent_auth,false);await as(fresh);
checks.push('normal registration without invitation, confirmed-email first workspace, no automatic holding membership or metadata escalation');
await as(a);
const due=await val("insert into eg_records(workspace_id,kind,title,assignee_id,due_date)values($1,'task','Prazo real',$2,current_date+1)returning id value",[w,b]);
await as(b);await pg.query('select eg_refresh_due_notifications($1)',[w]);await pg.query('select eg_refresh_due_notifications($1)',[w]);
assert.equal(await val("select count(*)::int value from eg_notifications where type='deadline' and resource_id=$1",[due]),1);
await as(fresh);await denied('select eg_refresh_due_notifications($1)',[w]);
await as(a);await pg.query("insert into eg_comments(record_id,body)values($1,'Comentário relevante')",[due]);
await as(b);assert.equal(await val("select count(*)::int value from eg_notifications where type='comment' and resource_id=$1",[due]),1);
await as(a);const optionalJob='00000000-0000-4000-8000-000000000097',optionalSession='10000000-0000-4000-8000-000000000097';
const optionalInvite=await val("insert into eg_invites(workspace_id,email)values($1,'optional-job@test.invalid')returning token value",[w]);
await pg.exec('reset role');await pg.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)values($1,'optional-job@test.invalid',now(),$2::jsonb)",[optionalJob,JSON.stringify({display_name:'Sem cargo'})]);await pg.query('insert into auth.sessions(id,user_id)values($1,$2)',[optionalSession,optionalJob]);sessions.set(optionalJob,optionalSession);
await as(optionalJob);await pg.query('select eg_identity_bootstrap($1)',[optionalInvite]);const optionalContext=await val('select eg_identity_context() value');assert.equal(optionalContext.profile.job_title,'');assert.equal(optionalContext.workspaces[0].role,'member');
checks.push('optional job title does not block explicit team access; confirmed email and invitation still bind membership');
checks.push('persistent due-date reminders deduplicate, relevant comments notify assignee, foreign workspaces denied');

await pg.exec('reset role');await pg.query('delete from auth.sessions where id=$1',[sessions.get(b)])
await as(b);assert.equal((await val('select eg_identity_context() value')).active,false)
assert.equal(await val('select count(*)::int value from eg_records'),0)
assert.equal(await val("with x as(update eg_profiles set job_title='attack' where id=$1 returning id) select count(*)::int value from x",[b]),0);await denied('select eg_economy_snapshot($1)',[w])
checks.push('revoked provider session denied by RLS, writes, and financial RPC')
mkdirSync('output/platform',{recursive:true});writeFileSync('output/platform/sql-results.json',JSON.stringify({environment:'PGlite Auth/session fixtures; NOT hosted Supabase',checks},null,2));console.log(JSON.stringify({passed:checks.length,checks},null,2));await pg.close()
