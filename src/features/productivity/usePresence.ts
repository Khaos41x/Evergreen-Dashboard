import { useEffect, useState } from 'react'
import { db } from '../../collaboration/client'
export function usePresence(workspaceId:string,userId:string,focusing:boolean,enabled=true){
 const [online,setOnline]=useState<Record<string,'online'|'away'>>({}),[error,setError]=useState('')
 useEffect(()=>{
  if(!workspaceId||!enabled)return
  let subscribed=false,lastActivity=Date.now(),previous=''
  const channel=db().channel(`eg-presence:${workspaceId}`,{config:{private:true,presence:{key:userId}}})
  const track=()=>{if(!subscribed)return;const state=document.hidden||Date.now()-lastActivity>300000?'away':'online';const payload=JSON.stringify({user_id:userId,state,focusing});if(payload!==previous){previous=payload;void channel.track({user_id:userId,state,focusing}).then(result=>{if(result!=='ok')setError('Não foi possível publicar presença.')})}}
  const activity=()=>{lastActivity=Date.now();track()}
  channel.on('presence',{event:'sync'},()=>{const next:Record<string,'online'|'away'>={};for(const [key,entries] of Object.entries(channel.presenceState<{state:string}>()))next[key]=entries.some(e=>e.state==='online')?'online':'away';setOnline(next)})
  channel.subscribe(status=>{subscribed=status==='SUBSCRIBED';if(subscribed){setError('');previous='';track()}else{setOnline({});if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setError('Presença desconectada. Tentando reconectar.')}})
  const timer=setInterval(track,30000)
  window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);document.addEventListener('visibilitychange',track)
  return()=>{subscribed=false;clearInterval(timer);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);document.removeEventListener('visibilitychange',track);void channel.untrack();void db().removeChannel(channel);setOnline({})}
 },[workspaceId,userId,focusing,enabled])
 return {online,error}
}
