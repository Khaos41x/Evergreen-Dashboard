import {useEffect,useState} from 'react'
import {checked,db,failure} from '../../collaboration/client'
import {WorldEntry} from '../world/WorldEntry'
import type {WorldData} from '../world/model'
export default function HoldingOffice({group,name,userId,onBack,onEconomy,onFounders}:{group:string;name:string;userId:string;onBack:()=>void;onEconomy:()=>void;onFounders?:()=>void}){
 const [data,setData]=useState<WorldData>({scope:group,name,source:'workspace',userId,members:[],projects:[],tasks:[],activity:[],channels:[],loading:true})
 useEffect(()=>{let live=true;setData({scope:group,name,source:'workspace',userId,members:[],projects:[],tasks:[],activity:[],channels:[],loading:true});async function load(){try{const result=await checked(db().rpc('eg_holding_office',{p_group:group})) as Pick<WorldData,'members'|'tasks'>;if(live)setData({scope:group,name,source:'workspace',userId,...result,projects:[],activity:[],channels:[],presenceError:'Presença ao vivo da holding ainda não verificada. Sessões de foco vêm dos espaços autorizados.'})}catch(e){if(live)setData(v=>({...v,members:[],tasks:[],loading:false,error:failure(e)}))}}void load();const timer=setInterval(()=>void load(),30000);return()=>{live=false;clearInterval(timer)}},[group,name,userId])
 return <WorldEntry data={data} onExit={onBack} actions={{onOpenEconomy:onEconomy,onOpenFounders:onFounders,onOpenProject:()=>{},onOpenTask:()=>{window.alert('Abra as tarefas na empresa indicada no perfil para consultar ou editar este item.')}}}/>
}
