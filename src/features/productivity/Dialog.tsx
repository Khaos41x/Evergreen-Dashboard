import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
export function Dialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
  const panel=useRef<HTMLElement>(null)
  const close=useRef(onClose);close.current=onClose
  useEffect(()=>{
    const opener=document.activeElement as HTMLElement|null
    const elements=()=>[...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea,select,a[href]')??[])]
    const timer=setTimeout(()=>elements()[1]?.focus(),0)
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close.current()}if(e.key==='Tab'){const items=elements(),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}
    document.addEventListener('keydown',key)
    return()=>{clearTimeout(timer);document.removeEventListener('keydown',key);opener?.focus()}
  },[])
  return <div className="collab-modal"><section ref={panel} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button type="button" aria-label="Fechar diálogo" onClick={onClose}><X/></button></header>{children}</section></div>
}
