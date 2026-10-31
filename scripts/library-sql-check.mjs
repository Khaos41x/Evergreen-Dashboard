import assert from 'node:assert/strict'
export async function libraryChecks(pg,{as,val,denied,users,checks}){
 const [a,b,c]=users;await as(a)
 const group=await val("select eg_founders_action(null,'create',$1)value",[{name:'Library security fixture'}])
 let room=await val('select eg_founder_library($1)value',[group]);assert.equal(room.members.length,3);assert.equal(room.members.filter(m=>m.vacant).length,2);assert.equal(room.members.find(m=>m.id===a).presence,'offline');assert.equal(room.scene,'founders-library')
 await denied('insert into eg_founder_presence(group_id,user_id,state,session_id)values($1,$2,$3,$4)',[group,a,'online','10000000-0000-4000-8000-000000000001'])
 await pg.query("select eg_library_heartbeat($1,'online')",[group]);room=await val('select eg_founder_library($1)value',[group]);assert.equal(room.members.find(m=>m.id===a).presence,'online')
 await pg.query("select eg_library_heartbeat($1,'away')",[group]);assert.equal((await val('select eg_founder_library($1)value',[group])).members.find(m=>m.id===a).presence,'away')
 await denied("select eg_library_heartbeat($1,'invented')",[group]);
 await pg.exec('reset role');await pg.query("update eg_founder_presence set last_seen=now()-interval '91 seconds' where group_id=$1",[group]);await as(a);assert.equal((await val('select eg_founder_library($1)value',[group])).members.find(m=>m.id===a).presence,'offline')
 const company=await val("select eg_create_workspace('Library company fixture')value"),invitation=await val('insert into eg_invites(workspace_id,email)values($1,$2)returning token value',[company,b+'@test.invalid']);await pg.query("select eg_founders_action($1,'link',$2)",[group,{workspace_id:company}]);await as(b);await pg.query('select eg_accept_invite($1)',[invitation]);await as(a);
 await pg.query("select eg_founders_action($1,'grant',$2)",[group,{user_id:b,role:'founder',capabilities:['overview','communication','governance']}]);
 await as(b);await denied('select eg_founder_library($1)',[group]);await denied('select eg_holding_office($1)',[group]);await denied("select eg_library_heartbeat($1,'online')",[group]);
 await as(a);const council=await val('select eg_os_council($1)value',[group]);await pg.query("select eg_os_seat($1,'designate',$2,$3)",[group,council.seats[1].id,b]);
 await as(b);await pg.query("select eg_library_heartbeat($1,'online')",[group]);assert.equal((await val('select eg_os_context()value')).groups.find(g=>g.id===group).library_access,true)
 await as(c);await denied('select eg_founder_library($1)',[group]);await denied('select * from eg_founder_presence where group_id=$1',[group])
 await as(a);room=await val('select eg_founder_library($1)value',[group]);assert.equal(room.members.find(m=>m.id===b).presence,'online');assert.equal(room.members.filter(m=>m.vacant).length,1)
 await pg.exec('reset role');await pg.query("update auth.sessions set not_after=now()-interval '1 second' where id=$1",['10000000-0000-4000-8000-000000000002']);await as(a);assert.equal((await val('select eg_founder_library($1)value',[group])).members.find(m=>m.id===b).presence,'offline');await pg.exec('reset role');await pg.query('update auth.sessions set not_after=null where id=$1',['10000000-0000-4000-8000-000000000002']);await as(a)
 checks.push('Founder library: exactly three permanent desks, seat-holder-only RPCs including legacy office, honest vacant seats, server-timed online/away/offline heartbeat, session revocation and private presence table')
}
