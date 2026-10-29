import {writeFileSync,mkdirSync}from'node:fs'
import {pathToFileURL}from'node:url'
import {resolve}from'node:path'
import assert from 'node:assert/strict'
mkdirSync('output/world/model',{recursive:true})
const {completion,layoutWorld,tasksFor}=await import(pathToFileURL(resolve('src/features/world/model.ts')))
const {cloudWorldData,localWorldData}=await import(pathToFileURL(resolve('src/features/world/adapters.ts')))
const input={workspaceId:'allowed',name:'Test fixture',userId:'alice',members:[{workspace_id:'allowed',user_id:'alice',display_name:'Alice QA',role:'member'},{workspace_id:'other',user_id:'mallory',display_name:'Other',role:'owner'}],records:[{id:'one',workspace_id:'allowed',kind:'task',title:'First',status:'done',assignee_id:'alice',project_id:'project',progress:100},{id:'two',workspace_id:'allowed',kind:'task',title:'Second',status:'todo',assignee_id:'alice',project_id:'project',progress:30},{id:'project',workspace_id:'allowed',kind:'project',title:'Real project',description:''},{id:'hidden',workspace_id:'other',kind:'task',title:'Foreign secret'},{id:'archived',workspace_id:'allowed',kind:'task',title:'Archived',archived_at:'now'}],channels:[{id:'channel',workspace_id:'allowed',name:'Allowed'},{id:'private-other',workspace_id:'other',name:'Other'}],focus:[{workspace_id:'allowed',user_id:'alice',status:'running'}],activity:[{id:'a',workspace_id:'other',title:'Foreign activity'}],online:{},presenceError:'',error:'',loading:false,canMutate:false}
const snapshot=cloudWorldData(input)
assert.deepEqual(snapshot.tasks.map(t=>t.id),['one','two']);assert.deepEqual(snapshot.members.map(m=>m.id),['alice']);assert.equal(snapshot.channels.length,1);assert.equal(snapshot.activity.length,0)
assert.equal(snapshot.members[0].presence,'unknown');assert.equal(snapshot.tasks[1].canComplete,false)
assert.equal(completion(tasksFor(snapshot,{kind:'project',id:'project'})),50);assert.equal(completion([]),null)
assert.equal(cloudWorldData({...input,online:{alice:'online'}}).members[0].presence,'focusing')
assert.equal(cloudWorldData({...input,focus:[],online:{alice:'away'}}).members[0].presence,'away')
for(const count of[0,1,4,12]){const layout=layoutWorld(count,6);assert.equal(layout.stations.length,count);assert.equal(new Set(layout.stations.map(p=>JSON.stringify(p))).size,count);for(const[x,,z]of layout.stations){assert.ok(Math.abs(x)+1.2<layout.width/2);assert.ok(Math.abs(z)+1.5<layout.depth/2)}assert.equal(layout.rooms.length,6)}
const local=localWorldData({tasks:[],projects:[],activities:[],focus:{status:'idle'},userId:'local-id'})
assert.equal(local.source,'local');assert.equal(local.members.length,1);assert.equal(local.members[0].name,'Você · local');assert.equal(local.members[0].presence,'local');assert.equal(local.channels.length,0)
const result={environment:'Pure model checks with labeled fixtures; not hosted authorization',scopeFiltering:true,archivedExcluded:true,noInventedPresence:true,permissionsDoNotBroaden:true,taskDerivedProgress:true,uniqueBoundedLayout:true,localIdentityExplicit:true}
writeFileSync('output/world/model-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))
