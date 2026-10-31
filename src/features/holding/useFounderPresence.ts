import {useEffect} from 'react'
import {db} from '../../collaboration/client'
// Server time/active provider session governs expiry; never store authentication here.
export function useFounderPresence(groups:string[]){
 const signature=JSON.stringify(groups)
 useEffect(()=>{
  const ids=JSON.parse(signature) as string[];if(!ids.length)return
  let lastActivity=Date.now(),stopped=false,inFlight=false
  async function heartbeat(){if(stopped||inFlight)return;inFlight=true;try{await Promise.all(ids.map(p_group=>db().rpc('eg_library_heartbeat',{p_group,p_state:document.hidden||Date.now()-lastActivity>300000?'away':'online'})))}catch{/* The server read expires stale presence; never manufacture online state. */}finally{inFlight=false}}
  const activity=()=>{const wasAway=Date.now()-lastActivity>300000;lastActivity=Date.now();if(wasAway)void heartbeat()},visibility=()=>void heartbeat()
  void heartbeat();const timer=setInterval(()=>void heartbeat(),30000)
  window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);document.addEventListener('visibilitychange',visibility)
  return()=>{stopped=true;clearInterval(timer);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);document.removeEventListener('visibilitychange',visibility)}
 },[signature])
}
