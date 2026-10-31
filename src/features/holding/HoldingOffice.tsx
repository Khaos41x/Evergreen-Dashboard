import {useEffect,useState} from 'react'
import {checked,db,failure} from '../../collaboration/client'
import {WorldEntry} from '../world/WorldEntry'
import type {WorldData} from '../world/model'
export default function HoldingOffice({group,name,userId,onBack,onEconomy,onFounders}:{group:string;name:string;userId:string;onBack:()=>void;onEconomy:()=>void;onFounders?:()=>void}){
 const [data,setData]=useState<WorldData>({scope:group,name,source:'workspace',userId,members:[],projects:[],tasks:[],activity:[],channels:[],loading:true})
 useEffect(()=>{let live=true;setData({scope:group,name,source:'workspace',userId,members:[],projects:[],tasks:[],activity:[],channels:[],loading:true});async function load(){if(!group){if(live)setData(v=>({...v,loading:false,error:'Sua conta não possui um assento de fundador autorizado nesta biblioteca.'}));return}try{const result=await checked(db().rpc('eg_founder_library',{p_group:group})) as Pick<WorldData,'members'|'tasks'>;if(live)setData({scope:group,name,source:'workspace',userId,...result,projects:[],activity:[],channels:[],scene:'founders-library',loading:false})}catch(e){if(live)setData(v=>({...v,members:[],tasks:[],loading:false,error:failure(e)}))}}void load();const timer=setInterval(()=>void load(),30000);return()=>{live=false;clearInterval(timer)}},[group,name,userId])
 if(data.error)return <section className="world-page"><h1>Biblioteca dos fundadores</h1><p role="alert">{data.error}</p><p>Acesso exclusivo dos titulares dos três assentos. Cargo na empresa ou acesso financeiro não liberam esta sala.</p><button onClick={onBack}>Voltar ao Trabalho</button></section>
 return <WorldEntry data={data} onExit={onBack} actions={{onOpenEconomy:onEconomy,onOpenFounders:onFounders,onOpenProject:()=>{},onOpenTask:()=>{window.alert('Abra as tarefas na empresa indicada no perfil para consultar ou editar este item.')}}}/>
}
