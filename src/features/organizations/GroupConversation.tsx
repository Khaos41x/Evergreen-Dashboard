import {checked,db} from '../../collaboration/client'
import {useOperation} from '../holding/useOperation'
import {useSubmissionId} from './model'
export function GroupConversation({workspace,userId,email,members,onCreated}:{workspace:string;userId:string;email:string;members:{user_id:string;display_name:string}[];onCreated:(channel:string)=>void}){
 const op=useOperation(email),request=useSubmissionId()
 return <details className="os-group-conversation"><summary>Criar conversa privada em grupo</summary><p>Somente os participantes escolhidos desta organização terão acesso.</p><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget),body={name:String(f.get('name')),people:f.getAll('people')};void op.run(async()=>{const channel=await checked(db().rpc('eg_os_group_chat',{p_workspace:workspace,p_name:body.name,p_people:body.people,p_request:request(body)}));onCreated(String(channel))})}}><label>Nome da conversa<input name="name" required minLength={2} maxLength={60}/></label><fieldset><legend>Participantes</legend>{members.filter(m=>m.user_id!==userId).map(m=><label className="collab-check" key={m.user_id}><input type="checkbox" name="people" value={m.user_id}/>{m.display_name}</label>)}</fieldset><button disabled={op.busy}>Abrir conversa em grupo</button>{op.error&&<p role="alert" className="collab-error">{op.error}</p>}</form>{op.dialog}</details>
}
