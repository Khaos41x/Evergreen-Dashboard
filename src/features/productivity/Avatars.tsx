import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { checked,db } from '../../collaboration/client'
interface PublicProfile{id:string;display_name:string;avatar_path:string|null;job_title?:string}
const Profiles=createContext<Record<string,{name:string;url?:string;jobTitle?:string}>>({})
export function ProfilesProvider({workspaceId,enabled,children}:{workspaceId:string;enabled:boolean;children:ReactNode}){
 const [state,setState]=useState<{workspace:string;values:Record<string,{name:string;url?:string;jobTitle?:string}>}>({workspace:'',values:{}})
 useEffect(()=>{
  if(!workspaceId||!enabled){setState({workspace:'',values:{}});return}
  setState({workspace:workspaceId,values:{}})
  let active=true,pending=false,queued=false,paused=false,revision=0,expiry:ReturnType<typeof setTimeout>|undefined
  const visible=()=>!document.hidden&&!paused
  const refresh=async()=>{
   if(!active)return
   if(!visible()||pending){queued=true;return}
   pending=true;queued=false;const requested=revision,started=Date.now()
   try{
    const rows=await checked(db().rpc('eg_public_profiles',{p_workspace:workspaceId})) as PublicProfile[]
    if(!active||requested!==revision)return
    const signed=await Promise.all(rows.map(async p=>{
     let url:string|undefined
     if(p.avatar_path){const result=await db().storage.from('eg-avatars').createSignedUrl(p.avatar_path,120);url=result.data?.signedUrl}
     return [p.id,{name:p.display_name,url,jobTitle:p.job_title}] as const
    }))
    if(!active||requested!==revision)return
    if(!visible()){queued=true;return}
    clearTimeout(expiry)
    // Expire the projection before the shortest signed URL can become invalid.
    const remaining=Math.max(0,110000-(Date.now()-started))
    const values=Object.fromEntries(signed.map(([id,p])=>[id,{...p,url:remaining?p.url:undefined}]))
    setState({workspace:workspaceId,values})
    if(remaining&&signed.some(([,p])=>p.url))expiry=setTimeout(()=>{
     if(active)setState(current=>current.workspace===workspaceId?{workspace:workspaceId,values:Object.fromEntries(Object.entries(current.values).map(([id,p])=>[id,{...p,url:undefined}]))}:current)
    },remaining)
   }catch{if(active&&requested===revision)setState({workspace:workspaceId,values:{}})}
   finally{pending=false;if(active&&queued&&visible())void refresh()}
  }
  const update=()=>{revision++;void refresh()}
  const resume=()=>{paused=false;void refresh()}
  const pause=()=>{paused=true}
  const visibility=()=>{if(!document.hidden)void refresh()}
  void refresh()
  window.addEventListener('evergreen:profile-updated',update);window.addEventListener('evergreen:resume',resume);window.addEventListener('evergreen:pause',pause);document.addEventListener('visibilitychange',visibility)
  const timer=setInterval(()=>{if(visible())void refresh()},60000)
  return()=>{active=false;clearInterval(timer);clearTimeout(expiry);window.removeEventListener('evergreen:profile-updated',update);window.removeEventListener('evergreen:resume',resume);window.removeEventListener('evergreen:pause',pause);document.removeEventListener('visibilitychange',visibility)}
 },[workspaceId,enabled])
 const profiles=enabled&&state.workspace===workspaceId?state.values:{}
 return <Profiles.Provider value={profiles}>{children}</Profiles.Provider>
}
export function MemberAvatar({userId,name,size=28}:{userId:string;name:string;size?:number}){
 const profile=useContext(Profiles)[userId]
 return profile?.url?<img src={profile.url} alt={profile.name} width={size} height={size} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>:<span aria-label={profile?.name??name} className="domain-member-avatar" style={{width:size,height:size}}>{(profile?.name??name).slice(0,2).toUpperCase()}</span>
}

export function usePublicProfiles(){return useContext(Profiles)}
