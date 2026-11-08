import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Download, FileText, Paperclip, RefreshCw, Search, Trash2 } from 'lucide-react'
import type { Channel, RecordItem } from '../../collaboration/models'
import { checked, db, failure } from '../../collaboration/client'
import { AppSelect } from '../appearance/AppSelect'
import { attachmentTypes, listCompanyFiles, uploadAttachment, type CompanyFile, type FileResource } from './attachmentStorage'

type Props={workspaceId:string;name:string;userId:string;channels:Channel[];records:RecordItem[];onChannel:(id:string)=>void;onRecord:(id:string)=>void}
const sizes=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1})
function fileSize(size:number|null){return size===null?'Tamanho não informado':size<1024?size+' B':size<1048576?sizes.format(size/1024)+' KB':sizes.format(size/1048576)+' MB'}
export function CompanyFiles({workspaceId,name,userId,channels,records,onChannel,onRecord}:Props) {
 const resources:FileResource[]=[
  ...channels.filter(channel=>channel.workspace_id===workspaceId).map(channel=>({id:channel.id,kind:'channel' as const,name:'# '+channel.name})),
  ...records.filter(record=>record.workspace_id===workspaceId).map(record=>({id:record.id,kind:'record' as const,name:record.title})),
 ]
 const signature=JSON.stringify(resources)
 const [rows,setRows]=useState<CompanyFile[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[limited,setLimited]=useState(false),[revision,setRevision]=useState(0)
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[target,setTarget]=useState(''),[uploading,setUploading]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
 const input=useRef<HTMLInputElement>(null)
 useEffect(()=>{
  let live=true;setRows([]);setError('');setLoading(true)
  void listCompanyFiles(workspaceId,JSON.parse(signature) as FileResource[]).then(result=>{if(live){setRows(result.files);setLimited(result.limited)}}).catch(e=>{if(live)setError(failure(e))}).finally(()=>{if(live)setLoading(false)})
  return()=>{live=false}
 },[workspaceId,signature,revision])
 const visible=rows.filter(row=>(filter==='all'||row.resource.kind===filter)&&(row.name+' '+row.resource.name).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
 const targetResource=resources.find(resource=>resource.kind+'/'+resource.id===target)
 async function upload(file:File){
  if(!targetResource||busy)return
  setBusy(true);setError('');setNotice('')
  try{await uploadAttachment(workspaceId,targetResource,userId,file);setRevision(v=>v+1);setNotice('Arquivo enviado para '+targetResource.name+'.');setUploading(false)}catch(e){setError(failure(e))}finally{setBusy(false)}
 }
 async function download(row:CompanyFile){
  if(busy)return
  setBusy(true);setError('')
  try{const blob=await checked(db().storage.from('eg-files').download(row.path)),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=row.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){setError(failure(e))}finally{setBusy(false)}
 }
 async function remove(row:CompanyFile){
  if(busy||!window.confirm('Excluir permanentemente “'+row.name+'” de '+name+'?'))return
  setBusy(true);setError('');setNotice('')
  try{await checked(db().storage.from('eg-files').remove([row.path]));setRevision(v=>v+1);setNotice('Arquivo removido.')}catch(e){setError(failure(e))}finally{setBusy(false)}
 }
 return <section className="collab-content company-files">
  <header className="directory-heading"><div><h1>Arquivos</h1><p>{name} · Documentos e anexos disponíveis para sua conta.</p></div><div><button aria-label="Atualizar arquivos da empresa" disabled={loading||busy} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={17}/></button><button className="primary" disabled={!resources.length||busy} onClick={()=>{setTarget(resources[0]?resources[0].kind+'/'+resources[0].id:'');setUploading(v=>!v)}}><Paperclip size={17}/>Enviar arquivo</button></div></header>
  {uploading&&<section className="company-file-upload" aria-label="Enviar arquivo da empresa"><h2>Onde este arquivo será compartilhado?</h2><p>O arquivo segue o acesso do canal ou da tarefa escolhida.</p><label>Vincular a<AppSelect value={target} onChange={e=>setTarget(e.target.value)}>{resources.map(resource=><option key={resource.kind+'/'+resource.id} value={resource.kind+'/'+resource.id}>{resource.name}</option>)}</AppSelect></label><input ref={input} className="sr-only" type="file" accept={attachmentTypes.join(',')} disabled={busy} aria-label="Selecionar arquivo da empresa" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value=''}}/><div className="collab-actions"><button disabled={busy||!targetResource} onClick={()=>input.current?.click()}>{busy?'Enviando…':'Escolher arquivo'}</button><button disabled={busy} onClick={()=>setUploading(false)}>Cancelar</button><small>PNG, JPEG, WebP, PDF, TXT ou ZIP · até 4 MB</small></div></section>}
  <div className="company-file-controls"><label className="directory-search"><Search size={17} aria-hidden="true"/><span className="sr-only">Buscar arquivos</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nome, canal ou tarefa"/></label><label>Origem<AppSelect value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos os arquivos</option><option value="channel">Canais</option><option value="record">Tarefas e projetos</option></AppSelect></label></div>
  {notice&&<p role="status" className="collab-notice">{notice}</p>}
  {error&&<div role="alert" className="collab-error"><p>Não foi possível concluir a operação: {error}</p><button onClick={()=>setRevision(v=>v+1)}>Tentar novamente</button></div>}
  {loading?<p role="status">Consultando arquivos autorizados…</p>:!error&&<>
   <div className="directory-list-heading"><h2>Arquivos da empresa</h2><span>{visible.length} {visible.length===1?'arquivo':'arquivos'}</span></div>
   {limited&&<p role="status">Esta é uma listagem parcial: até 500 arquivos, 100 itens por pasta e 100 consultas. Abra o canal ou tarefa para consultar seus demais anexos.</p>}
   {visible.length?<ul className="company-file-list">{visible.map(row=><li key={row.path}><FileText size={22} aria-hidden="true"/><div className="company-file-copy"><strong>{row.name}</strong><button onClick={()=>row.resource.kind==='channel'?onChannel(row.resource.id):onRecord(row.resource.id)}>{row.resource.name}<ArrowUpRight size={13}/></button><small>{fileSize(row.size)}{row.updatedAt?' · '+new Date(row.updatedAt).toLocaleDateString('pt-BR'):''}</small></div><div className="company-file-actions"><button disabled={busy} aria-label={'Baixar '+row.name} onClick={()=>void download(row)}><Download size={17}/></button>{row.ownerId===userId&&<button disabled={busy} aria-label={'Excluir '+row.name} onClick={()=>void remove(row)}><Trash2 size={17}/></button>}</div></li>)}</ul>:<div className="directory-empty"><h3>{rows.length?'Nenhum arquivo corresponde à busca':'Seus arquivos ficam aqui'}</h3><p>{rows.length?'Tente outro nome ou outra origem.':'Envie um arquivo para um canal ou tarefa. A lista reúne somente os anexos aos quais você tem acesso.'}</p>{(query||filter!=='all')&&<button onClick={()=>{setQuery('');setFilter('all')}}>Limpar filtros</button>}</div>}
  </>}
 </section>
}
