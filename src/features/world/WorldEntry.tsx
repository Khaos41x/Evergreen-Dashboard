import { lazy, Suspense } from 'react'
import { WorldBoundary } from './WorldBoundary'
import type { WorldActions, WorldData } from './model'
const WorldPane=lazy(()=>import('./WorldPane'))
export function WorldEntry({data,actions,onExit}:{data:WorldData;actions:WorldActions;onExit:()=>void}){
 return <WorldBoundary onError={()=>{}} fallback={<section className="world-page" role="alert"><h1>Não foi possível abrir o Vision</h1><p>O módulo não carregou. Seus dados estão preservados e o Work continua disponível.</p><div className="world-view-switch"><button onClick={onExit}>Voltar ao Work</button><button onClick={()=>window.location.reload()}>Recarregar página</button></div></section>}><Suspense fallback={<div className="world-loading" role="status">Abrindo Evergreen Vision…</div>}><WorldPane data={data} actions={actions}/></Suspense></WorldBoundary>
}
