import {useEffect,useState} from 'react'
import {usePublicProfiles} from '../productivity/Avatars'
import {checked,db} from '../../collaboration/client'
import { lazy, Suspense } from 'react'
import { WorldBoundary } from './WorldBoundary'
import type { WorldActions, WorldData } from './model'
const WorldPane=lazy(()=>import('./WorldPane'))
export function WorldEntry({data,actions,onExit}:{data:WorldData;actions:WorldActions;onExit:()=>void}){
 const profiles=usePublicProfiles(),[seats,setSeats]=useState<{scope:string;values:Record<string,number>}|null>(null)
 useEffect(()=>{let live=true;setSeats(null);if(data.source!=='workspace')return;void checked(db().from('eg_office_seats').select('user_id,seat').eq('workspace_id',data.scope)).then(rows=>{if(live)setSeats({scope:data.scope,values:Object.fromEntries((rows as {user_id:string;seat:number}[]).map(r=>[r.user_id,r.seat]))})}).catch(()=>{});return()=>{live=false}},[data.scope,data.source])
 const enriched={...data,members:data.members.map(m=>({...m,seat:m.seat??(seats?.scope===data.scope?seats.values[m.id]:undefined),jobTitle:m.jobTitle||profiles[m.id]?.jobTitle,avatarUrl:profiles[m.id]?.url||m.avatarUrl}))}
 return <WorldBoundary onError={()=>{}} fallback={<section className="world-page" role="alert"><h1>Não foi possível abrir a Visão</h1><p>O módulo não carregou. Seus dados estão preservados e o Trabalho continua disponível.</p><div className="world-view-switch"><button onClick={onExit}>Voltar ao Trabalho</button><button onClick={()=>window.location.reload()}>Recarregar página</button></div></section>}><Suspense fallback={<div className="world-loading" role="status">Abrindo Evergreen Visão…</div>}><WorldPane data={enriched} actions={actions}/></Suspense></WorldBoundary>
}
