import {useEffect,useRef,useState} from 'react'
import {checked,db,failure} from '../../collaboration/client'
import {WorldEntry} from '../world/WorldEntry'
import type {WorldData} from '../world/model'

export default function HoldingOffice({group,name,userId,onBack,onEconomy,onFounders}:{group:string;name:string;userId:string;onBack:()=>void;onEconomy:()=>void;onFounders?:()=>void}){
 const empty: WorldData = {scope:group,name,source:'workspace',userId,members:[],projects:[],tasks:[],activity:[],channels:[],scene:'founders-library',loading:true}
 const [snapshot,setSnapshot]=useState<WorldData>(empty)
 const generation=useRef(0)
 const refresh=useRef<()=>Promise<void>>(async()=>{})
 const data=snapshot.scope===group&&snapshot.userId===userId?snapshot:empty
 useEffect(()=>{
  let live=true,request=0,loaded=false
  const scopeGeneration=++generation.current
  const base: WorldData={scope:group,name,source:'workspace',userId,members:[],projects:[],tasks:[],activity:[],channels:[],scene:'founders-library',loading:true}
  setSnapshot(base)
  async function load(){
   if(!group){
    setSnapshot({...base,loading:false,error:'Sua conta não possui um assento de fundador autorizado nesta biblioteca.'})
    return
   }
   const attempt=++request
   loaded=false
   try{
    const result=await checked(db().rpc('eg_founder_library',{p_group:group})) as Pick<WorldData,'members'|'tasks'>
    if(live&&attempt===request)setSnapshot({...base,...result,loading:false})
   }catch(e){
    if(live&&attempt===request)setSnapshot({...base,loading:false,error:failure(e)})
   }finally{
    if(attempt===request)loaded=true
   }
  }
  refresh.current=load
  void load()
  const check=()=>{if(live&&loaded&&!document.hidden)void load()}
  const timer=setInterval(check,30000)
  document.addEventListener('visibilitychange',check)
  return()=>{
   live=false
   if(generation.current===scopeGeneration)generation.current++
   clearInterval(timer)
   document.removeEventListener('visibilitychange',check)
  }
 },[group,name,userId])
 async function renameOwnOffice(officeName:string){
  const scopeGeneration=generation.current
  await checked(db().rpc('eg_founder_office_rename',{p_group:group,p_name:officeName}))
  if(scopeGeneration===generation.current)await refresh.current()
 }
 if(data.error)return <section className="world-page"><h1>Biblioteca dos fundadores</h1><p role="alert">{data.error}</p><p>Acesso exclusivo dos titulares dos três assentos. Cargo na empresa ou acesso financeiro não liberam esta sala.</p><button onClick={onBack}>Voltar ao Trabalho</button></section>
 return <WorldEntry data={data} onExit={onBack} actions={{onOpenEconomy:onEconomy,onOpenFounders:onFounders,onOpenProject:()=>{},onOpenTask:()=>{window.alert('Abra as tarefas na empresa indicada no perfil para consultar ou editar este item.')},onRenameOffice:renameOwnOffice}}/>
}
