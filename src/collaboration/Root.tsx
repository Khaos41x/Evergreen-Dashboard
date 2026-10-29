import { lazy, Suspense, useState } from 'react'
import { downloadLocal } from './backup'
import './collaboration.css'
import '../features/identity/identity.css'
const App=lazy(()=>import('../App').then(m=>({default:m.App})))
const Auth = lazy(() => import('./Auth').then(m => ({ default: m.Auth })))
const Collaboration = lazy(() => import('./Collaboration').then(m => ({ default: m.Collaboration })))
export function Root() {
 const [local,setLocal]=useState(()=>location.pathname==='/'&&sessionStorage.getItem('evergreen.local-mode')==='yes')
 const chooseLocal=()=>{sessionStorage.setItem('evergreen.local-mode','yes');history.replaceState(null,'','/');setLocal(true)}
 return <Suspense fallback={<main className="collab-auth" role="status">Carregando Evergreen…</main>}>{local?<><div className="local-mode-banner"><span>Modo pessoal · sem sincronização</span><button onClick={downloadLocal}>Backup</button><button aria-label="Abrir colaboração" onClick={()=>{sessionStorage.removeItem('evergreen.local-mode');setLocal(false)}}>Colaboração</button></div><div className="local-mode-app"><App/></div></>:<Auth onLocal={chooseLocal}>{session=><Collaboration key={session.user.id} session={session} onLocal={chooseLocal}/>}</Auth>}</Suspense>
}
