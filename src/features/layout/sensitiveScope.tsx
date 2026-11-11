import {useEffect} from 'react'
const eventName='evergreen:context-request'
export function requestContextChange(target:string){
 return window.dispatchEvent(new CustomEvent(eventName,{cancelable:true,detail:{target}}))
}
export function useSensitiveDraft(active:boolean,scope:string,discard:()=>void,busy=false){
 useEffect(()=>{
  if(!active&&!busy)return
  const guard=(event:Event)=>{
   if(busy||!window.confirm('Há uma ação em andamento em '+scope+'. Trocar o contexto descarta o rascunho. Você precisará revisar e confirmar novamente. Descartar e trocar?'))event.preventDefault()
   else discard()
  }
  window.addEventListener(eventName,guard)
  return()=>window.removeEventListener(eventName,guard)
 },[active,scope,discard,busy])
}
export function ActionScope({name,permission,reversible=false}:{name:string;permission:string;reversible?:boolean}){
 return <div className="action-scope"><p>Em: <strong>{name}</strong></p><p>Você age como: <strong>{permission||'Permissão não informada'}</strong></p><p>{reversible?'Reversível mediante nova alteração autorizada e auditada.':'Registro irreversível. Uma correção exige novo evento autorizado e auditado.'}</p></div>
}
