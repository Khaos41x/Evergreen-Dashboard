import {useEffect} from 'react'
import {useOperation} from '../holding/useOperation'
import {money} from '../economy/money'
import {useOSResource} from './model'
type Authorization={id:string;status:string;deadline:string;consumed:boolean;payload:{action:string;transaction_kind:string;account_id:string;to_account_id?:string;cents:string;currency:string;description:string;request_id:string}}
export function LedgerApprovals({workspace,email,onRecord,onBoard}:{workspace:string;email:string;onRecord:(kind:string,payload:Record<string,unknown>)=>Promise<void>;onBoard?:()=>void}){
 const resource=useOSResource<{approvals:Authorization[]}>('eg_os_operations',{p_workspace:workspace}),op=useOperation(email)
 useEffect(()=>{const refresh=()=>{if(!document.hidden)resource.refresh()},timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}},[resource.refresh])
 const records=(resource.data?.approvals||[]).filter(p=>p.payload.action==='authorization'&&!p.consumed&&Date.parse(p.deadline)>Date.now())
 if(!records.length)return resource.error?<p role="alert">Não foi possível consultar aprovações: {resource.error}</p>:null
 return <section className="economy-section"><header><h2>Autorizações de lançamento</h2><button onClick={resource.refresh}>Atualizar autorizações</button>{onBoard&&<button onClick={onBoard}>Abrir conselho da empresa</button>}</header><p>O conselho autoriza; o registro no livro é uma ação financeira separada.</p>{op.error&&<p role="alert" className="collab-error">{op.error}</p>}{records.map(p=><article className="economy-entry" key={p.id}><div><strong>{p.payload.description}</strong><small>{p.status==='open'?'Em votação':'Autorizado; aguardando registro'}</small></div><b>{money(p.payload.cents,p.payload.currency||'BRL')}</b>{['approved','executed'].includes(p.status)&&<button disabled={op.busy} onClick={()=>void op.run(async()=>{await onRecord(p.payload.transaction_kind,{...p.payload,approval_id:p.id});resource.refresh()})}>Registrar lançamento autorizado</button>}</article>)}{op.dialog}</section>
}
