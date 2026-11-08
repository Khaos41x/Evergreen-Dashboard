import { AppSelect } from '../appearance/AppSelect'
import {useEffect,useState} from 'react'
import {checked,db,failure} from '../../collaboration/client'
export type HoldingCompany={id:string;name:string;group_id:string|null;description:string;logo_url:string|null;responsible_id:string|null;admin:boolean;operational:boolean;information:boolean}
export type HoldingGroup={id:string;name:string;workspace_id?:string;owner?:boolean}
export type HoldingScope={group:string|null;workspace:string|null}
export function useHolding(userId:string){
 const [companies,setCompanies]=useState<HoldingCompany[]>([]),[groups,setGroups]=useState<HoldingGroup[]>([]),[error,setError]=useState(''),[ready,setReady]=useState(false)
 const [revision,setRevision]=useState(0)
 useEffect(()=>{let live=true;void checked(db().rpc('eg_holding_context')).then((value)=>{if(!live)return;const v=value as {companies:HoldingCompany[];groups:HoldingGroup[]};if(!v||!Array.isArray(v.companies)||!Array.isArray(v.groups))throw new Error('A estrutura da holding ainda não está disponível.');setCompanies(v.companies);setGroups(v.groups);setReady(true);setError('')}).catch(e=>{if(live){setReady(false);setCompanies([]);setGroups([]);setError(failure(e))}});return()=>{live=false}},[userId,revision])
 return{companies,groups,ready,error,refresh:()=>setRevision(v=>v+1)}
}
export function CompanyContext({companies,groups,value,onChange}:{companies:HoldingCompany[];groups:HoldingGroup[];value:HoldingScope;onChange:(scope:HoldingScope)=>void}){
 const selection=value.workspace?'company:'+value.workspace:value.group?'group:'+value.group:''
 return <div className="holding-context"><label>Contexto da Evergreen<AppSelect aria-label="Contexto da Evergreen" value={selection} onChange={e=>{const [kind,id]=e.target.value.split(':');onChange(kind==='group'?{group:id,workspace:null}:{group:null,workspace:id})}}><option value="" disabled>Selecione uma empresa</option>{groups.map(g=><option key={g.id} value={'group:'+g.id}>Todas as empresas · {g.name}</option>)}{companies.map(c=><option key={c.id} value={'company:'+c.id}>{c.name}</option>)}</AppSelect></label><span>{value.group?'Consolidado dos dados autorizados':'Empresa selecionada'}</span></div>
}
