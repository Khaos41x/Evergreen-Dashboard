import {emailLinkState} from '../features/identity/email-link'
import { lazy, Suspense, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { downloadLocal } from './backup'
import { UpdateNotice } from '../mobile/UpdateNotice'
import './collaboration.css'
import '../features/identity/identity.css'
const App=lazy(()=>import('../App').then(m=>({default:m.App})))
const Auth = lazy(() => import('./Auth').then(m => ({ default: m.Auth })))
const Collaboration = lazy(() => import('./Collaboration').then(m => ({ default: m.Collaboration })))
export function Root() {
 const content = useRef<HTMLDivElement>(null)
 const skipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault()
  const main = content.current?.querySelector<HTMLElement>('main') ?? content.current
  if (!main) return
  main.tabIndex = -1
  main.focus({ preventScroll: true })
 }
 const [local,setLocal]=useState(()=>!emailLinkState().link&&!emailLinkState().error&&!new URLSearchParams(location.search).has('code')&&location.pathname==='/'&&sessionStorage.getItem('evergreen.local-mode')==='yes')
 const chooseLocal=()=>{sessionStorage.setItem('evergreen.local-mode','yes');history.replaceState(null,'','/');setLocal(true)}
 return <div className="mobile-app-shell"><a href="#evergreen-content" className="evergreen-skip-link" onClick={skipToContent}>Pular para o conteúdo</a><UpdateNotice/><div className="mobile-app-content" id="evergreen-content" ref={content}><Suspense fallback={<main className="collab-auth" role="status">Carregando Evergreen…</main>}>{local?<><div className="local-mode-banner"><span>Modo pessoal · sem sincronização</span><button onClick={downloadLocal}>Backup</button><button aria-label="Abrir colaboração" onClick={()=>{sessionStorage.removeItem('evergreen.local-mode');setLocal(false)}}>Colaboração</button></div><div className="local-mode-app"><App/></div></>:<Auth onLocal={chooseLocal}>{session=><Collaboration key={session.user.id} session={session} onLocal={chooseLocal}/>}</Auth>}</Suspense></div></div>
}
