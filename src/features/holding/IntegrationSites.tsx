import {useState,type FormEvent} from 'react'
import {Plus,ExternalLink} from 'lucide-react'
import {checked,db} from '../../collaboration/client'
import {useOperation} from './useOperation'
import type {Application} from './Integrations'

export function IntegrationSites({workspace,apps,email,refresh}:{workspace:string;apps:Application[];email:string;refresh:()=>Promise<void>}){
 const [adding,setAdding]=useState(false),[notice,setNotice]=useState(''),op=useOperation(email)
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault()
  const form=event.currentTarget,fields=new FormData(form),name=String(fields.get('name')||'').trim(),raw=String(fields.get('url')||'').trim()
  await op.run(async()=>{
   const url=new URL(raw)
   if(url.protocol!=='https:'||url.username||url.password)throw Error('Use um endereço HTTPS público, sem usuário, senha ou chave na URL.')
   const payload={name,url:url.href,description:String(fields.get('description')||'').trim()}
   await checked(db().rpc('eg_holding_action',{p_workspace:workspace,p_action:'application',p_data:payload}))
   setAdding(false);await refresh();setNotice('Site cadastrado nesta empresa. Escolha abaixo a fonte dos dados para concluir a integração.')
  })
 }
 return <section className="holding-section integration-sites" aria-label="Sites e aplicações da empresa">
  <header className="holding-heading"><div><h2>Sites e aplicações</h2><p>Cadastre o endereço agora e conecte a fonte quando estiver pronto.</p></div><button onClick={()=>{setAdding(true);setNotice('')}} disabled={op.busy}><Plus size={17}/>Adicionar site</button></header>
  {apps.length?<ul className="integration-site-list">{apps.map(app=><li key={app.id}><strong>{app.name}</strong>{app.url?<a href={app.url} target="_blank" rel="noopener noreferrer"><span>{app.url}</span><ExternalLink size={15}/><span className="sr-only">Abrir site em nova aba</span></a>:<small>Endereço ainda não informado.</small>}</li>)}</ul>:<p>Nenhum site cadastrado nesta empresa.</p>}
  {adding&&<form className="holding-form" onSubmit={event=>void save(event)}><fieldset disabled={op.busy}><legend>Novo site ou aplicação</legend><label>Nome do site<input name="name" required maxLength={100}/></label><label>Endereço do site<input name="url" type="url" required pattern="https://.*" placeholder="https://seusite.com.br" maxLength={2000}/></label><label>Descrição · opcional<textarea name="description" maxLength={2000}/></label><div className="collab-actions"><button className="primary">{op.busy?'Salvando…':'Salvar site'}</button><button type="button" onClick={()=>setAdding(false)}>Cancelar</button></div></fieldset></form>}
  <p>O endereço identifica a aplicação. Métricas e informações privadas vêm da API autorizada do serviço que você conectar abaixo.</p>
  {op.error&&<p role="alert">{op.error}</p>}{notice&&<p role="status">{notice}</p>}{op.dialog}
 </section>
}
