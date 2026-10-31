import assert from 'node:assert/strict'
export async function nativePushChecks({pg,as,val,denied,a,b,w,sessions,checks}){
 await pg.exec('reset role')
 const device=await val("insert into eg_mobile_devices(user_id,token_hash,token_cipher,platform,session_id)values($1,'fixture-hash','ENCRYPTED_FIXTURE','android',$2)returning id value",[a,sessions.get(a)])
 const notification=await val("insert into eg_notifications(workspace_id,recipient_id,type,title)values($1,$2,'mention','Synthetic push notification')returning id value",[w,a])
 assert.equal(await val('select count(*)::int value from eg_push_deliveries where notification_id=$1 and device_id=$2',[notification,device]),1)
 await as(a);await denied('select token_cipher from eg_mobile_devices');await denied('select * from eg_push_deliveries');await denied('select eg_claim_mobile_push(10)');await denied('select eg_push_session_active($1,$2)',[sessions.get(a),a]);
 await as(b);await denied("insert into eg_mobile_devices(user_id,token_hash,token_cipher,platform,session_id)values($1,'attack','attack','android',$2)",[b,sessions.get(b)])
 await pg.exec('reset role');const claimed=await val('select eg_claim_mobile_push(20)value');assert.ok(claimed.some(j=>j.device_id===device));const second=await val('select eg_claim_mobile_push(20)value');assert.equal(second.some(j=>j.device_id===device),false)
 assert.equal(await val('select eg_push_session_active($1,$2)value',[sessions.get(a),a]),true);assert.equal(await val('select eg_push_session_active($1,$2)value',[sessions.get(a),b]),false)
 await pg.query('update eg_mobile_devices set enabled=false where id=$1',[device]);await pg.query("insert into eg_notifications(workspace_id,recipient_id,type,title)values($1,$2,'mention','Disabled device fixture')",[w,a]);assert.equal(await val('select count(*)::int value from eg_push_deliveries where device_id=$1',[device]),1)
 checks.push('native push: private RLS devices/outbox, authenticated access denied, notification enqueue, atomic claim/no double claim, session-user binding and disabled-device exclusion')
 await as(a)
}
