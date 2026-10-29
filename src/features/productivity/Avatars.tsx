import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { checked,db } from '../../collaboration/client'
interface PublicProfile{id:string;display_name:string;avatar_path:string|null}
const Profiles=createContext<Record<string,{name:string;url?:string}>>({})
export function ProfilesProvider({workspaceId,enabled,children}:{workspaceId:string;enabled:boolean;children:ReactNode}){
 const [profiles,setProfiles]=useState<Record<string,{name:string;url?:string}>>({})
 useEffect(()=>{
  if(!workspaceId||!enabled){setProfiles({});return}
  let active=true
  const refresh=async()=>{try{const rows=await checked(db().rpc('eg_public_profiles',{p_workspace:workspaceId})) as PublicProfile[];const signed=await Promise.all(rows.map(async p=>{let url:string|undefined;if(p.avatar_path){const result=await db().storage.from('eg-avatars').createSignedUrl(p.avatar_path,120);url=result.data?.signedUrl}return [p.id,{name:p.display_name,url}] as const}));if(active)setProfiles(Object.fromEntries(signed))}catch{if(active)setProfiles({})}}
  setProfiles({});void refresh();const timer=setInterval(()=>void refresh(),60000)
  return()=>{active=false;clearInterval(timer)}
 },[workspaceId,enabled])
 return <Profiles.Provider value={profiles}>{children}</Profiles.Provider>
}
export function MemberAvatar({userId,name,size=28}:{userId:string;name:string;size?:number}){
 const profile=useContext(Profiles)[userId]
 return profile?.url?<img src={profile.url} alt={profile.name} width={size} height={size} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>:<span aria-label={profile?.name??name} className="domain-member-avatar" style={{width:size,height:size}}>{(profile?.name??name).slice(0,2).toUpperCase()}</span>
}
