// Administrative SQL fixture, not hosted Auth provisioning.
import { PGlite } from '@electric-sql/pglite'
import {readFileSync,mkdirSync,writeFileSync}from'node:fs'
import assert from 'node:assert/strict'
const pg=new PGlite(),sql=readFileSync('supabase/bootstrap-owner.sql','utf8')
try{
 await pg.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create publication supabase_realtime;`)
 await pg.exec(readFileSync('supabase/migrations/20261026171401_collaboration_core.sql','utf8'))
 const other='00000000-0000-4000-8000-000000000001',owner='00000000-0000-4000-8000-000000000002'
 await pg.query('insert into auth.users values($1,$2,now())',[other,'other@fixture.invalid'])
 await pg.exec(`set request.jwt.claim.sub='${other}'`)
 const old=(await pg.query("select eg_create_workspace('Existing preserved workspace') as id")).rows[0].id
 async function blocked(){let failed=false;try{await pg.exec(sql)}catch{failed=true;await pg.exec('rollback')}assert.ok(failed);assert.equal((await pg.query('select count(*)::int as n from eg_workspaces')).rows[0].n,1)}
 await blocked()
 await pg.query('insert into auth.users values($1,$2,null)',[owner,'peixotodavy831@gmail.com'])
 await blocked()
 await pg.query('update auth.users set email_confirmed_at=now() where id=$1',[owner])
 await pg.exec(sql);await pg.exec(sql)
 assert.equal((await pg.query('select count(*)::int as n from eg_workspaces')).rows[0].n,2)
 assert.equal((await pg.query('select owner_id from eg_workspaces where id=$1',[old])).rows[0].owner_id,other)
 const holding=(await pg.query("select id from eg_workspaces where name='Holding'")).rows[0].id
 assert.equal((await pg.query('select role from eg_members where workspace_id=$1 and user_id=$2',[holding,owner])).rows[0].role,'owner')
 assert.equal((await pg.query('select count(*)::int as n from eg_channels where workspace_id=$1',[holding])).rows[0].n,1)
 const result={environment:'PGlite administrative fixture only; not applied remotely',absentUserBlocked:true,unconfirmedUserBlocked:true,confirmedResponsibleProvisioned:true,idempotent:true,existingWorkspacePreserved:true}
 mkdirSync('output',{recursive:true});writeFileSync('output/bootstrap-owner-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))
}finally{await pg.close()}
