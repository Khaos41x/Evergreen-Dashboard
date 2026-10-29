import {useEffect,useRef} from 'react'
export function useModalFocus(open:boolean,onClose:()=>void,locked=false){
 const panel=useRef<HTMLDivElement>(null),close=useRef(onClose),pending=useRef(locked)
 close.current=onClose;pending.current=locked
 useEffect(()=>{
  if(!open)return
  const opener=document.activeElement as HTMLElement|null
  const elements=()=>[...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]')??[])].filter(e=>e.getClientRects().length)
  const timer=setTimeout(()=>elements()[0]?.focus(),0)
  const keyboard=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(!pending.current)close.current()}if(e.key==='Tab'){const controls=elements(),first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}
  document.addEventListener('keydown',keyboard)
  return()=>{clearTimeout(timer);document.removeEventListener('keydown',keyboard);opener?.focus()}
 },[open])
 return panel
}
