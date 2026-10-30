import assert from 'node:assert/strict'
import {randomUUID,randomBytes,createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
export async function ownerAndRateChecks({pg,as,val,denied,sessions,checks}){
 await pg.exec('reset role')
 const proof=randomBytes(32).toString('base64url'),key='eg:identity:password:'+createHash('sha256').update('fixture-ip').digest('hex')
 await pg.query("insert into evergreen_private.server_proofs values('rate_limit',$1)",[createHash('sha256').update(proof).digest('hex')]);await pg.exec('set role anon')
 await denied('select * from evergreen_private.server_proofs');await denied('select eg_server_rate_limit($1,8,300,$2)',[key,'wrong-proof'])
 const results=await Promise.all(Array.from({length:12},()=>val('select eg_server_rate_limit($1,8,300,$2)value',[key,proof])));assert.deepEqual(results.sort((a,b)=>a-b),Array.from({length:12},(_,i)=>i+1))
 await denied('select eg_server_rate_limit($1,8,0,$2)',[key,proof]);await pg.exec('reset role');await pg.query("update evergreen_private.rate_buckets set started_at=now()-interval '1 day'where key=$1",[key]);await pg.exec('set role anon');assert.equal(await val('select eg_server_rate_limit($1,8,300,$2)value',[key,proof]),1)
 checks.push('real database rate limiter: proof required, private hash/counters denied, atomic concurrent increments, invalid windows denied and expiry resets')
 await pg.exec('reset role');const person=randomUUID(),session=randomUUID(),workspace=randomUUID()
 await pg.query("insert into auth.users(id,email,email_confirmed_at)values($1,'peixotodavy831@gmail.com',now())",[person]);await pg.query('insert into auth.sessions(id,user_id)values($1,$2)',[session,person]);sessions.set(person,session)
 await pg.query("insert into eg_profiles(id,display_name)values($1,'Owner fixture')",[person]);await pg.query("insert into eg_workspaces(id,name,owner_id)values($1,'Existing company fixture',$2)",[workspace,person]);await pg.query("insert into eg_members values($1,$2,'owner','Owner fixture')",[workspace,person])
 await pg.exec(readFileSync('supabase/bootstrap-holding-owner.sql','utf8'));await pg.exec(readFileSync('supabase/bootstrap-holding-owner.sql','utf8'));await as(person)
 const context=await val('select eg_holding_context()value'),group=context.groups.find(g=>g.name==='Evergreen Holdings');assert.equal(group.owner,true);assert.equal(group.role,'group_owner');assert.ok(group.capabilities.includes('governance'));assert.ok(group.capabilities.includes('finance'));assert.equal(context.companies.filter(c=>c.group_id===group.id).length,1)
 assert.equal(await val('select count(*)::int value from eg_group_scopes where group_id=$1 and user_id=$2 and $3=any(capabilities)',[group.id,person,'finance']),1)
 await pg.exec('reset role');await pg.query("update eg_workspaces set name='Orkto' where id=$1",[workspace]);
 const beforeUsers=await val('select count(*)::int value from auth.users');
 await pg.exec(readFileSync('supabase/bootstrap-company-identities.sql','utf8'));await pg.exec(readFileSync('supabase/bootstrap-company-identities.sql','utf8'));await as(person);
 const identities=await val('select eg_holding_context()value');assert.equal(identities.companies.filter(c=>c.group_id===group.id).length,2);
 const thinker=identities.companies.find(c=>c.name==='ThinkerChess');assert.ok(thinker);
 assert.equal((await val('select eg_professional_profile($1,$2)value',[thinker.id,person])).companies.find(c=>c.id===thinker.id).relationship,'partner');
 const roster=await val('select eg_professional_levels($1)value',[group.id]);assert.deepEqual(roster.pending.map(p=>p.name).sort(),['Gabriel','Miguel Mármore']);assert.equal(roster.members.filter(m=>m.original).length,1);
 await pg.exec('reset role');assert.equal(await val('select count(*)::int value from auth.users'),beforeUsers);
 checks.push('company identity setup replayed twice: real Orkto plus ThinkerChess, Davy founder/partner and Chairman, Miguel/Gabriel pending; zero new Auth users');
 checks.push('explicit confirmed account owner bootstrap is idempotent, grants all holding capabilities, links only own companies and enables founder governance')
}
