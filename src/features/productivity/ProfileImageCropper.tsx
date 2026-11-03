import {useEffect,useState} from 'react'

type ImageKind='avatar'|'cover'
interface Props {kind:ImageKind;onSave:(file:File)=>Promise<void>}

async function makeCrop(file:File,ratio:number,zoom:number,x:number,y:number):Promise<File>{
 const bitmap=await createImageBitmap(file)
 const baseWidth=Math.min(bitmap.width,bitmap.height*ratio)
 const sourceWidth=baseWidth/zoom
 const sourceHeight=sourceWidth/ratio
 const sourceX=(bitmap.width-sourceWidth)*x/100
 const sourceY=(bitmap.height-sourceHeight)*y/100
 const canvas=document.createElement('canvas')
 canvas.width=ratio===1?768:1800
 canvas.height=Math.round(canvas.width/ratio)
 const context=canvas.getContext('2d')
 if(!context){bitmap.close();throw new Error('Não foi possível preparar a imagem neste navegador.')}
 context.drawImage(bitmap,sourceX,sourceY,sourceWidth,sourceHeight,0,0,canvas.width,canvas.height)
 bitmap.close()
 const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.9))
 if(!blob)throw new Error('Não foi possível gerar o recorte. Tente outra imagem.')
 if(blob.size>2*1024*1024)throw new Error('A imagem ainda ficou maior que 2 MB. Reduza o zoom ou escolha outra foto.')
 const name=file.name.replace(/\.[^.]+$/,'')+'.webp'
 return new File([blob],name,{type:blob.type||'image/webp',lastModified:Date.now()})
}

export function ProfileImageCropper({kind,onSave}:Props){
 const [source,setSource]=useState(''),[file,setFile]=useState<File|null>(null),[zoom,setZoom]=useState(1),[x,setX]=useState(50),[y,setY]=useState(50)
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>()=>{if(source)URL.revokeObjectURL(source)},[source])
 const isAvatar=kind==='avatar',ratio=isAvatar?1:3

 function choose(next:File|undefined){
  setError('')
  if(!next)return
  if(!['image/png','image/jpeg','image/webp'].includes(next.type)){setError('Escolha uma imagem PNG, JPEG ou WebP.');return}
  if(next.size>10*1024*1024){setError('A imagem original deve ter até 10 MB.');return}
  setSource(URL.createObjectURL(next));setFile(next);setZoom(1);setX(50);setY(50)
 }

 async function save(){
  if(!file)return
  setBusy(true);setError('')
  try{await onSave(await makeCrop(file,ratio,zoom,x,y));setSource('');setFile(null)}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar esta imagem.')}finally{setBusy(false)}
 }

 return <section className="profile-image-editor" aria-labelledby={`profile-image-${kind}`}>
  <div className="profile-image-editor-heading"><div><h3 id={`profile-image-${kind}`}>{isAvatar?'Foto de perfil':'Capa pessoal'}</h3><p>{isAvatar?'Ajuste o enquadramento quadrado da sua foto.':'Escolha um recorte panorâmico para a capa.'}</p></div></div>
  {source&&<div className="profile-crop-controls">
   <div className={`profile-crop-preview ${isAvatar?'is-avatar':''}`} style={{aspectRatio:`${ratio}/1`}}><img src={source} alt="Prévia do enquadramento" style={{objectPosition:`${x}% ${y}%`,transform:`scale(${zoom})`}}/></div>
   <div className="profile-crop-sliders">
    <label>Zoom <output>{zoom.toFixed(1)}×</output><input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={event=>setZoom(Number(event.target.value))}/></label>
    <label>Horizontal <output>{x}%</output><input type="range" min="0" max="100" step="1" value={x} onChange={event=>setX(Number(event.target.value))}/></label>
    <label>Vertical <output>{y}%</output><input type="range" min="0" max="100" step="1" value={y} onChange={event=>setY(Number(event.target.value))}/></label>
   </div>
  </div>}
  <div className="profile-image-actions">
   <label className="profile-file-button">{source?'Escolher outra imagem':'Selecionar imagem'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{choose(event.target.files?.[0]);event.target.value=''}}/></label>
   {source&&<><button type="button" onClick={()=>{setSource('');setFile(null);setError('')}} disabled={busy}>Cancelar</button><button className="primary" type="button" onClick={()=>void save()} disabled={busy}>{busy?'Salvando…':isAvatar?'Salvar foto':'Salvar capa'}</button></>}
  </div>
  <small>PNG, JPEG ou WebP · até 10 MB antes do recorte.</small>
  {error&&<p className="profile-image-error" role="alert">{error}</p>}
 </section>
}
