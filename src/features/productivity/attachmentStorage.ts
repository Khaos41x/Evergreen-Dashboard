import { checked, db } from '../../collaboration/client'
export type FileResource = {id:string;kind:'channel'|'record';name:string}
export type CompanyFile = {path:string;name:string;resource:FileResource;size:number|null;updatedAt:string|null;ownerId:string}
export const attachmentTypes=['image/png','image/jpeg','image/webp','application/pdf','text/plain','application/zip']
export async function uploadAttachment(workspaceId:string,resource:FileResource,userId:string,file:File) {
 if(file.size>4194304)throw new Error('Máximo de 4 MB por arquivo.')
 if(!attachmentTypes.includes(file.type))throw new Error('Formato não permitido. Use PNG, JPEG, WebP, PDF, TXT ou ZIP.')
 const safe=file.name.replace(/[^\p{L}\p{N}._-]/gu,'_').slice(-100)||'arquivo'
 const path=[resource.kind,workspaceId,resource.id,userId,crypto.randomUUID()+'-'+safe].join('/')
 await checked(db().storage.from('eg-files').upload(path,file,{contentType:file.type,upsert:false}))
 return path
}
export async function listCompanyFiles(workspaceId:string,resources:FileResource[]) {
 const files:CompanyFile[]=[]
 const resourcesByKey=new Map(resources.map(resource=>[resource.kind+'/'+resource.id,resource]))
 let limited=false,requests=0
 async function list(prefix:string) {
  if(++requests>100){limited=true;return []}
  const rows=await checked(db().storage.from('eg-files').list(prefix,{limit:100,sortBy:{column:'name',order:'asc'}}))
  if(rows.length===100)limited=true
  return rows
 }
 const roots=await Promise.all((['channel','record'] as const).map(async kind=>{
  const rows=await list(kind+'/'+workspaceId)
  return rows.filter(row=>!row.id&&resourcesByKey.has(kind+'/'+row.name)).map(row=>resourcesByKey.get(kind+'/'+row.name)!)
 }))
 const queue=roots.flat()
 // Bound parallel Storage requests; access is rechecked by Storage RLS on every call.
 await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{
  while(queue.length&&files.length<500) {
   const resource=queue.shift()!,prefix=[resource.kind,workspaceId,resource.id].join('/')
   const owners=await list(prefix)
   for(const owner of owners.filter(row=>!row.id)){
    const rows=await list(prefix+'/'+owner.name)
    for(const row of rows.filter(row=>!!row.id)){
     if(files.length>=500){limited=true;break}
     files.push({path:prefix+'/'+owner.name+'/'+row.name,name:row.name.replace(/^[0-9a-f-]{36}-/i,''),resource,size:typeof row.metadata?.size==='number'?row.metadata.size:null,updatedAt:row.updated_at||null,ownerId:owner.name})
    }
   }
  }
 }))
 if(queue.length)limited=true
 return {files:files.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')||a.name.localeCompare(b.name,'pt-BR')),limited}
}
