import { useCallback, useEffect, useState } from 'react'
import { db, failure, checked } from '../../collaboration/client'
export function Attachments({workspaceId,resourceId,userId,kind}:{workspaceId:string;resourceId:string;userId:string;kind:'record'|'channel'}){
 const prefix=`${kind}/${workspaceId}/${resourceId}`
 const [items,setItems]=useState<{name:string;path:string}[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const load=useCallback(async()=>{try{
  const folders=await checked(db().storage.from('eg-files').list(prefix,{limit:100}))
  const files=await Promise.all(folders.map(async folder=>{const files=await checked(db().storage.from('eg-files').list(`${prefix}/${folder.name}`,{limit:100}));return files.filter(f=>f.id).map(f=>({name:f.name,path:`${prefix}/${folder.name}/${f.name}`}))}))
  setItems(files.flat());setError('')
 }catch(e){setError(failure(e))}},[prefix])
 useEffect(()=>{void load()},[load])
 async function upload(file:File){setBusy(true);setError('');try{
  if(file.size>10485760)throw new Error('Máximo de 10 MB por arquivo.')
  if(!['image/png','image/jpeg','image/webp','application/pdf','text/plain','application/zip'].includes(file.type))throw new Error('Formato não permitido. Use PNG, JPEG, WebP, PDF, TXT ou ZIP.')
  const safe=file.name.replace(/[^\p{L}\p{N}._-]/gu,'_').slice(-100),path=`${prefix}/${userId}/${crypto.randomUUID()}-${safe}`
  await checked(db().storage.from('eg-files').upload(path,file,{contentType:file.type,upsert:false}));await load()
 }catch(e){setError(failure(e))}finally{setBusy(false)}}
 return <section><h3>Files</h3>{error&&<p role="alert" className="collab-error">{error}</p>}<label>Upload file (max 10 MB)<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,application/zip" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value=''}}/></label>{items.map(item=><div className="collab-actions" key={item.path}><button disabled={busy} onClick={async()=>{try{const data=await checked(db().storage.from('eg-files').createSignedUrl(item.path,60,{download:true}));const a=document.createElement('a');a.href=data.signedUrl;a.rel='noopener';a.target='_blank';a.click()}catch(e){setError(failure(e))}}}>{item.name.replace(/^[0-9a-f-]{36}-/,'')}</button>{item.path.startsWith(`${prefix}/${userId}/`)&&<button disabled={busy} onClick={async()=>{if(!window.confirm('Excluir arquivo?'))return;try{await checked(db().storage.from('eg-files').remove([item.path]));await load()}catch(e){setError(failure(e))}}}>Remove file</button>}</div>)}{!items.length&&!error&&<p>No files yet.</p>}<button onClick={()=>void load()}>Refresh files</button></section>
}
