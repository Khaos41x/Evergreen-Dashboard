import {useEffect,useRef} from 'react'
import type {WorkspaceScreen} from '../../collaboration/WorkspaceNavigation'
type Section={screen:WorkspaceScreen;channelId:string;surface:'hub'|'economy'}
const localSections=['home','chat','conversations','tasks','records','objectives','issues','work','files','members','settings','administration','focus-room','help','notifications']
export function useCompanySections({userId,workspaceId,screen,channelId,surface,enabled}:{userId:string;workspaceId:string;screen:WorkspaceScreen;channelId:string;surface:string;enabled:boolean}){
 const key='evergreen.company-sections.'+userId
 const remembered=useRef<Record<string,Section>>({})
 const initialized=useRef('')
 if(initialized.current!==key){
  initialized.current=key;remembered.current={}
  try{const value=JSON.parse(sessionStorage.getItem(key)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))remembered.current=value}catch{/* Optional navigation preference. */}
 }
 useEffect(()=>{
  if(!enabled||!workspaceId||!localSections.includes(screen)||!['hub','economy'].includes(surface))return
  remembered.current[workspaceId]={screen,channelId,surface:surface as Section['surface']}
  try{sessionStorage.setItem(key,JSON.stringify(remembered.current))}catch{/* Never operational data. */}
 },[enabled,workspaceId,screen,channelId,surface,key])
 return (id:string):Section|undefined=>{
  const value=remembered.current[id]
  return value&&localSections.includes(value.screen)&&['hub','economy'].includes(value.surface)&&typeof value.channelId==='string'?value:undefined
 }
}
