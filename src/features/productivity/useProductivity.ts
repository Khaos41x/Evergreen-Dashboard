import { useCallback, useEffect, useRef, useState } from 'react'
import { db, failure } from '../../collaboration/client'
import { domainTables, loadProductivity } from './repository'
const empty = {checklist:[],comments:[],inbox:[],suggestions:[],handoffs:[],notifications:[],activity:[],focus:[],areas:[],goals:[],links:[],profile:null}
export function useProductivity(workspaceId:string,recordIds:string[],enabled=true) {
  const [data,setData]=useState<Awaited<ReturnType<typeof loadProductivity>>>(empty)
  const [loaded,setLoaded]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const generation=useRef(0), scope=useRef(workspaceId); scope.current=workspaceId
  const ids=recordIds.join(',')
  const refresh=useCallback(async()=>{
    const attempt=++generation.current
    if(!enabled||!workspaceId || scope.current!==workspaceId)return
    try {const next=await loadProductivity(workspaceId,ids?ids.split(','):[]);if(attempt===generation.current&&scope.current===workspaceId){setData(next);setLoaded(workspaceId);setError('')}}
    catch(e){if(attempt===generation.current&&scope.current===workspaceId)setError(failure(e))}
    finally{if(attempt===generation.current)setLoading(false)}
  },[workspaceId,ids,enabled])
  useEffect(()=>{
    if(!enabled)return
    setLoading(true);void refresh()
    const channel=db().channel(`productivity-${workspaceId}`)
    for(const table of domainTables)channel.on('postgres_changes',{event:'*',schema:'public',table},()=>void refresh())
    channel.subscribe(status=>{if(status==='SUBSCRIBED')void refresh()})
    const timer=setInterval(()=>void refresh(),15000)
    window.addEventListener('focus',refresh)
    return()=>{generation.current++;clearInterval(timer);window.removeEventListener('focus',refresh);void db().removeChannel(channel)}
  },[refresh,workspaceId,enabled])
  return {...(loaded===workspaceId?data:empty),initialLoading:!!workspaceId&&loaded!==workspaceId,loading:loading||!!workspaceId&&loaded!==workspaceId,error,refresh}
}
