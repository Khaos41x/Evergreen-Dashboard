import {professionalLevels} from '../founders/levelVocabulary'
import {useState} from 'react'
import {Building2,ChevronDown} from 'lucide-react'
import type {HoldingCompany,HoldingGroup,HoldingScope} from '../holding/context'
import {useOSResource,type OrganizationSnapshot} from '../organizations/model'
import './access-context.css'

type Profile={companies:{id:string;participation_bps:number|null}[]}
export function AccessChip({workspaceId,userId,companies,groups,scope,onChange}:{workspaceId:string;userId:string;companies:HoldingCompany[];groups:HoldingGroup[];scope:HoldingScope;onChange:(scope:HoldingScope)=>void}){
 const [open,setOpen]=useState(false)
 const company=companies.find(row=>row.id===(scope.workspace||workspaceId))
 const group=groups.find(row=>row.id===(scope.group||company?.group_id))
 const snapshot=useOSResource<OrganizationSnapshot>('eg_os_snapshot',{p_workspace:company?.id},!!company&&!scope.group)
 const profile=useOSResource<Profile>('eg_professional_profile',{p_workspace:company?.id,p_user:userId},!!company&&!scope.group)
 const current=!scope.group&&snapshot.data?.workspace_id===company?.id?snapshot.data:null
 const person=current?.people?.find(row=>row.id===userId)
 const level=current?.levels?.find(row=>row.code===person?.level)
 const share=profile.data?.companies?.find(row=>row.id===company?.id)?.participation_bps
 const loading=snapshot.loading||profile.loading
 return <div className="access-context" data-current-company={scope.group?'group:'+scope.group:company?.id||workspaceId} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);event.currentTarget.querySelector<HTMLButtonElement>('.access-trigger')?.focus()}}}>
  <button className="access-trigger" aria-label={'Seu acesso aqui · '+(scope.group?group?.name:company?.name||'Empresa ativa')} aria-expanded={open} aria-controls="access-context-panel" onClick={()=>setOpen(value=>!value)}>
   <span className="access-initials" aria-hidden="true">{(scope.group?group?.name:company?.name)?.slice(0,2).toUpperCase()||<Building2 size={18}/>}</span>
   <span><small>{group?.name||'Evergreen'}</small><strong>{scope.group?'Todas as empresas':company?.name||'Empresa ativa'}</strong></span><ChevronDown size={14} aria-hidden="true"/>
  </button>
  {open&&<section id="access-context-panel" role="region" aria-label="Seu acesso aqui" className="access-popover">
   <h2>Seu acesso aqui</h2>
   {loading&&<p role="status">Consultando seu acesso…</p>}
   {(snapshot.error||profile.error)&&<p role="alert">Não foi possível consultar todo o acesso. <button onClick={()=>{snapshot.refresh();profile.refresh()}}>Tentar novamente</button></p>}
   <dl><div><dt>Cargo exibido</dt><dd>{person?.job_title||'Não informado'}</dd></div>
    <div><dt>Participação societária</dt><dd>{share==null?'Não informada':new Intl.NumberFormat('pt-BR',{style:'percent',maximumFractionDigits:2}).format(share/10000)}</dd></div>
    <div><dt>Permissão operacional</dt><dd>{person?.level?person.level+' · '+(level?.name||person.level_name||'Nível sem descrição'):'Não informada neste contexto'}</dd></div></dl>
   {level&&<p>{level.permissions.length?level.permissions.join(' · '):'Sem capacidades adicionais informadas.'}</p>}
   <p>Cargo e participação não concedem permissões. Cada operação é validada pelo servidor.</p>
   <details className="access-vocabulary"><summary>Entender os níveis</summary><dl>{professionalLevels.map(level=><div key={level.name}><dt>{level.name}</dt><dd>{level.who}</dd></div>)}</dl></details>
   <h3>Trocar empresa</h3>
   <div className="access-companies">{companies.map(row=><button key={row.id} aria-label={'Abrir empresa '+row.name} aria-current={!scope.group&&company?.id===row.id?'page':undefined} onClick={()=>{onChange({group:null,workspace:row.id});setOpen(false)}}>{row.name}</button>)}{groups.map(row=><button key={row.id} onClick={()=>{onChange({group:row.id,workspace:null});setOpen(false)}}>{row.name} · Todas as empresas</button>)}</div>
  </section>}
 </div>
}
