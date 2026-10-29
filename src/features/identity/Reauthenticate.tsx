import {useState,useRef,useEffect} from 'react'
import {identity} from './client'
export function Reauthenticate({email,onDone,onClose}:{email:string;onDone:()=>void;onClose:()=>void}){
 const [passkeys,setPasskeys]=useState(false)
 useEffect(()=>{void identity.config().then(c=>setPasskeys(c.passkeys)).catch(()=>{})},[])
 const [sent,setSent]=useState(false),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const previous=document.activeElement as HTMLElement;ref.current?.showModal();return()=>{ref.current?.close();previous?.focus()}},[])
 async function run(fn:()=>Promise<unknown>){setBusy(true);setError('');try{await fn()}catch(e){setError(e instanceof Error?e.message:'Falha ao confirmar identidade.')}finally{setBusy(false)}}
 return <dialog className="identity-stepup" ref={ref} onCancel={e=>{e.preventDefault();if(!busy)onClose()}} aria-labelledby="stepup-title"><form onSubmit={e=>{e.preventDefault();void run(async()=>{if(!sent){await identity.sendEmail({email,reauth:true});setSent(true)}else{await identity.verifyEmail({email,code,reauth:true});onDone()}})}}><h2 id="stepup-title">Proteja esta operação.</h2><p>Confirme o acesso à sua conta {email}. A confirmação vale por cinco minutos.</p>{sent&&<label>Código do e-mail<input autoFocus value={code} onChange={e=>setCode(e.target.value)} required pattern="[0-9]{6,10}" autoComplete="one-time-code" inputMode="numeric"/></label>}{error&&<p role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'Aguarde…':sent?'Confirmar identidade':'Receber código'}</button><button type="button" disabled={busy||!passkeys} onClick={()=>void run(async()=>{await identity.passkey(true);onDone()})}>Confirmar com passkey</button><button type="button" disabled={busy} onClick={onClose}>Cancelar operação</button></form></dialog>
}
