import {useState} from 'react'
import {Dialog} from '../productivity/Dialog'
import {useOSResource,type OrganizationSnapshot} from '../organizations/model'
import {ActionScope,useSensitiveDraft} from './sensitiveScope'
import {useOperation} from '../holding/useOperation'

export function useScopedReview({workspace=null,group=null,userId,email}:{workspace?:string|null;group?:string|null;userId:string;email:string}){
 const [review,setReview]=useState<{label:string;summary:string;run:()=>Promise<void>;reversible:boolean}|null>(null)
 const resource=useOSResource<OrganizationSnapshot>('eg_os_snapshot',{p_workspace:workspace,p_group:group},!!review)
 const op=useOperation(email)
 const data=resource.data
 const person=data?.people?.find(row=>row.id===userId)
 const permission=person?.level?[person.level,person.level_name].filter(Boolean).join(' · '):person?.role||'Não informada pelo servidor'
 useSensitiveDraft(!!review,data?.name||'Contexto atual',()=>setReview(null),op.busy)
 function ask(label:string,summary:string,run:()=>Promise<void>,reversible=false){setReview({label,summary,run,reversible})}
 const dialog=review?<Dialog title="Revisar ação" onClose={()=>{if(!op.busy)setReview(null)}}>
  {resource.loading?<p role="status">Consultando o contexto autorizado…</p>:resource.error?<p role="alert">{resource.error} <button onClick={resource.refresh}>Tentar novamente</button></p>:<ActionScope name={data?.name||'Nome indisponível'} permission={permission} reversible={review.reversible}/>}
  <p>{review.summary}</p>{op.error&&<p role="alert">{op.error}</p>}
  <button disabled={op.busy||resource.loading||!!resource.error||!data?.name} onClick={()=>void op.run(async()=>{await review.run();setReview(null)})}>{review.label}</button>{op.dialog}
 </Dialog>:null
 return {ask,dialog}
}
