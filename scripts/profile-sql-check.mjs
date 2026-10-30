import assert from 'node:assert/strict'
export async function profileChecks({pg,as,val,denied,a,b,c,w,other,group,checks}){
 await as(a)
 await pg.query("select eg_profile_relationship($1,$2,'founder')",[w,a])
 await pg.query("select eg_profile_relationship($1,$2,'partner')",[w,b])
 await pg.query('select eg_profile_original_founder($1,$2,true)',[group,a])
 let p=await val('select eg_professional_profile($1,$2) value',[w,a])
 assert.ok(p.original_founders.length===1)
 assert.equal(p.companies.find(x=>x.id===w).relationship,'founder')
 assert.equal('real_name' in p,false);assert.equal('preferences' in p,false);assert.equal('email' in p,false)
 await pg.query("select eg_founder_nominee($1,'Miguel Mármore')",[group]);
 await pg.query("select eg_founder_nominee($1,'Miguel Mármore')",[group]);
 let levels=await val('select eg_professional_levels($1) value',[group]);assert.equal(levels.pending.filter(p=>p.name==='Miguel Mármore').length,1);assert.ok(levels.members.some(m=>m.id===a&&m.original));
 await as(a,false);await denied("select eg_founder_nominee($1,'Gabriel')",[group]);await as(a);
 await pg.query("select eg_profile_relationship($1,$2,'ceo')",[w,b]);
 await as(b);p=await val('select eg_professional_profile($1,$2) value',[w,a]);assert.equal(p.companies.some(x=>x.id===other),false)
 await denied("select eg_founder_nominee($1,'Attack')",[group]);await denied('select eg_professional_levels($1)',[group]);
 await denied("select eg_profile_relationship($1,$2,'founder')",[w,b])
 await denied('select eg_profile_original_founder($1,$2,true)',[group,b])
 await denied("update eg_professional_roles set relationship='founder' where workspace_id=$1",[w])
 assert.equal(await val("select count(*)::int value from eg_members where workspace_id=$1 and user_id=$2 and role in ('owner','admin')",[w,b]),0)
 await as(c);await denied('select eg_professional_profile($1,$2)',[w,a]);assert.equal(await val('select count(*)::int value from eg_professional_roles where workspace_id=$1',[w]),0)
 await as(a);await denied("select eg_profile_relationship($1,$2,'founder')",[w,c]);await denied("select eg_profile_relationship($1,$2,'invalid')",[w,a])
 await as(a,false);await denied('select eg_profile_original_founder($1,$2,false)',[group,a]);await as(a)
 checks.push('professional identity: scoped projection, private fields omitted, admin-only company relationships, explicit recent owner attestation, unrelated companies denied, no privilege escalation')
}
