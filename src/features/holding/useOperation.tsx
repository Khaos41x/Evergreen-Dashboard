import {useRef,useState} from 'react'
import {failure} from '../../collaboration/client'
import {Reauthenticate} from '../identity/Reauthenticate'
export function useOperation(email:string){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[reauth,setReauth]=useState(false),retry=useRef<(()=>Promise<void>)|null>(null),lock=useRef(false)
 async function run(fn:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await fn()}catch(e){if(failure(e).includes('REAUTH_REQUIRED')||typeof e==='object'&&e&&(('code'in e&&e.code==='REAUTH_REQUIRED')||('status'in e&&e.status===428))){retry.current=fn;setReauth(true)}else setError(failure(e))}finally{lock.current=false;setBusy(false)}}
 const dialog=reauth?<Reauthenticate email={email} onClose={()=>{retry.current=null;setReauth(false)}} onDone={()=>{const fn=retry.current;retry.current=null;setReauth(false);if(fn)void run(fn)}}/>:null
 return{busy,error,run,dialog}
}
