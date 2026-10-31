import {useEffect,useState} from 'react'
import {native} from './transport'
import {enablePush,disablePush} from './push'
export function NativePushSettings(){
 const [message,setMessage]=useState('As notificações dependem da configuração Firebase/APNs.'),[busy,setBusy]=useState(false)
 useEffect(()=>{const status=(event:Event)=>setMessage(String((event as CustomEvent).detail));window.addEventListener('evergreen:push-status',status);return()=>window.removeEventListener('evergreen:push-status',status)},[])
 if(!native)return null
 async function run(action:()=>Promise<void>){setBusy(true);try{await action()}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível configurar notificações.')}finally{setBusy(false)}}
 return <section className="native-push-settings"><h3>Notificações neste aparelho</h3><p role="status">{message}</p><div className="collab-actions"><button disabled={busy} onClick={()=>void run(enablePush)}>Ativar notificações</button><button disabled={busy} onClick={()=>void run(disablePush)}>Desativar neste aparelho</button></div></section>
}
