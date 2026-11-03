import {useEffect,useState} from 'react'
import type {Member} from '../../collaboration/models'
import {checked,db,failure} from '../../collaboration/client'
import {NativePushSettings} from '../../mobile/NativePushSettings'
import {ProfileImageCropper} from './ProfileImageCropper'

type Visibility='workspace'|'selected'|'private'
interface ProfessionalPreferences {visibility:Visibility;allowed_users:string[];specialties:string[];show_custom_status:boolean}
interface Profile {job_title:string;display_name:string;real_name:string;username:string|null;bio:string;timezone:string;avatar_path:string|null;cover_path:string|null;custom_status:string;preferences:Record<string,unknown>}

function professionalPreferences(profile:Profile):ProfessionalPreferences{
 const stored=profile.preferences.professional_profile as Partial<ProfessionalPreferences>|undefined
 return {visibility:stored?.visibility==='private'||stored?.visibility==='selected'?stored.visibility:'workspace',allowed_users:Array.isArray(stored?.allowed_users)?stored.allowed_users:[],specialties:Array.isArray(stored?.specialties)?stored.specialties:[],show_custom_status:stored?.show_custom_status===true}
}

export function ProfileSettings({userId,workspaceId,members,onName}:{userId:string;workspaceId:string;members:Member[];onName:(name:string)=>void}){
 const [profile,setProfile]=useState<Profile|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 const [avatar,setAvatar]=useState(''),[cover,setCover]=useState(''),[visibility,setVisibility]=useState<Visibility>('workspace'),[allowedUsers,setAllowedUsers]=useState<string[]>([]),[showStatus,setShowStatus]=useState(false)

 useEffect(()=>{let active=true;setProfile(null);setError('');void checked(db().from('eg_profiles').select('*').eq('id',userId).single()).then(row=>{if(!active)return;const next=row as Profile;setProfile(next);const professional=professionalPreferences(next);setVisibility(professional.visibility);setAllowedUsers(professional.allowed_users);setShowStatus(professional.show_custom_status)}).catch(e=>{if(active)setError(failure(e))});return()=>{active=false}},[userId])

 useEffect(()=>{
  let active=true
  setAvatar('');setCover('')
  const requests=[profile?.avatar_path?db().storage.from('eg-avatars').createSignedUrl(profile.avatar_path,300):Promise.resolve(null),profile?.cover_path?db().storage.from('eg-avatars').createSignedUrl(profile.cover_path,300):Promise.resolve(null)]
  void Promise.all(requests).then(([avatarResult,coverResult])=>{
   if(!active)return
   if(avatarResult&&'data'in avatarResult&&avatarResult.data)setAvatar(avatarResult.data.signedUrl)
   if(coverResult&&'data'in coverResult&&coverResult.data)setCover(coverResult.data.signedUrl)
  }).catch(e=>{if(active)setError(failure(e))})
  return()=>{active=false}
 },[profile?.avatar_path,profile?.cover_path])

 async function saveImage(kind:'avatar'|'cover',file:File){
  if(!profile)throw new Error('Carregue seu perfil antes de enviar uma imagem.')
  setError('');setNotice('')
  const path=`${userId}/${kind==='cover'?'covers/':''}${crypto.randomUUID()}.webp`
  try{
   await checked(db().storage.from('eg-avatars').upload(path,file,{contentType:'image/webp',upsert:false}))
   const column=kind==='avatar'?'avatar_path':'cover_path'
   await checked(db().from('eg_profiles').update({[column]:path}).eq('id',userId).select(column).single())
   setProfile(current=>current?{...current,[column]:path}:current)
   setNotice(kind==='avatar'?'Foto de perfil salva.':'Capa pessoal salva.')
   window.dispatchEvent(new Event('evergreen:profile-updated'))
  }catch(e){const message=failure(e);setError(message);throw new Error(message)}
 }

 async function saveProfile(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!profile)return
  const form=new FormData(event.currentTarget),display_name=String(form.get('display_name')||'').trim()
  const specialties=String(form.get('specialties')||'').split(',').map(value=>value.trim()).filter(Boolean).filter((value,index,array)=>array.findIndex(item=>item.toLocaleLowerCase('pt-BR')===value.toLocaleLowerCase('pt-BR'))===index)
  if(specialties.length>20||specialties.some(value=>value.length>50)){setError('Informe até 20 especializações, com no máximo 50 caracteres cada.');return}
  const previous=professionalPreferences(profile),currentMemberIds=new Set(members.map(member=>member.user_id))
  const allowed=[...new Set([...previous.allowed_users.filter(id=>!currentMemberIds.has(id)),...allowedUsers.filter(id=>currentMemberIds.has(id))])]
  const update={
   display_name,job_title:String(form.get('job_title')||'').trim(),real_name:String(form.get('real_name')||'').trim(),
   username:String(form.get('username')||'').trim()||null,bio:String(form.get('bio')||'').trim(),timezone:String(form.get('timezone')||'UTC'),
   custom_status:String(form.get('custom_status')||'').trim(),
   preferences:{...profile.preferences,focus_minutes:Number(form.get('focus_minutes')),daily_goal_minutes:Number(form.get('daily_goal_minutes')),
    notify_assignments:form.get('notify_assignments')==='on',notify_mentions:form.get('notify_mentions')==='on',
    professional_profile:{...previous,visibility,allowed_users:allowed,specialties,show_custom_status:showStatus}}
  }
  setBusy(true);setError('');setNotice('')
  try{
   const saved=await checked(db().from('eg_profiles').update(update).eq('id',userId).select().single())
   setProfile(saved as Profile);setAllowedUsers(allowed);onName(display_name)
   window.dispatchEvent(new Event('evergreen:profile-updated'));setNotice('Perfil e preferências salvos.')
  }catch(e){setError(failure(e))}finally{setBusy(false)}
 }

 const selectedCount=members.filter(member=>member.user_id!==userId&&allowedUsers.includes(member.user_id)).length
 return <section className="profile-settings-v2" aria-labelledby="profile-settings-title">
  <h2 id="profile-settings-title">Seu perfil</h2>
  {error&&<p role="alert" className="collab-error">{error}</p>}{notice&&<p role="status" className="profile-save-notice">{notice}</p>}
  {!profile?<p role="status">Carregando seu perfil…</p>:<>
   <form className="profile-settings-form" onSubmit={event=>void saveProfile(event)}>
    <div className="profile-settings-grid">
     <label>Nome de exibição<input name="display_name" defaultValue={profile.display_name} required maxLength={80}/></label>
     <label>Cargo profissional<input name="job_title" defaultValue={profile.job_title} maxLength={100}/></label>
     <label>Nome completo <span>(privado)</span><input name="real_name" defaultValue={profile.real_name} maxLength={100}/></label>
     <label>Nome de usuário<input name="username" defaultValue={profile.username??''} pattern="[a-z0-9_]{3,30}" maxLength={30}/><small>3–30 caracteres: letras minúsculas, números e sublinhado.</small></label>
    </div>
    <label>Apresentação profissional<textarea name="bio" defaultValue={profile.bio} maxLength={280} rows={4} placeholder="Conte brevemente sobre sua atuação."/><small>Até 280 caracteres.</small></label>
    <label>Especializações <span>(separadas por vírgula)</span><input name="specialties" defaultValue={professionalPreferences(profile).specialties.join(', ')} maxLength={1100} placeholder="Estratégia, tecnologia, operações"/><small>Até 20 áreas, 50 caracteres cada.</small></label>
    <label>Fuso horário<select name="timezone" defaultValue={profile.timezone}>{[...new Set(['UTC',profile.timezone,...Intl.supportedValuesOf('timeZone')])].map(timezone=><option key={timezone} value={timezone}>{timezone}</option>)}</select></label>
    <label>Status personalizado<input name="custom_status" defaultValue={profile.custom_status} maxLength={80} placeholder="Ex.: Em reunião até 15h"/></label>
    <label className="profile-check-row"><input type="checkbox" checked={showStatus} onChange={event=>setShowStatus(event.target.checked)}/>Exibir meu status personalizado no perfil</label>

    <fieldset className="profile-privacy-fieldset">
     <legend>Privacidade do perfil</legend>
     <label>Quem pode ver suas informações?<select value={visibility} onChange={event=>setVisibility(event.target.value as Visibility)}>
      <option value="workspace">Membros das mesmas organizações</option><option value="selected">Pessoas escolhidas</option><option value="private">Somente eu</option>
     </select></label>
     <p>O acesso exige que a pessoa também pertença à organização em questão. Dados de outras empresas independentes não são compartilhados automaticamente.</p>
     {visibility==='selected'&&<div className="profile-reader-list"><h3>Pessoas autorizadas neste espaço</h3>{members.filter(member=>member.user_id!==userId).map(member=><label key={member.user_id} className="profile-check-row"><input type="checkbox" checked={allowedUsers.includes(member.user_id)} onChange={event=>setAllowedUsers(current=>event.target.checked?[...new Set([...current,member.user_id])]:current.filter(id=>id!==member.user_id))}/>{member.display_name}</label>)}{members.filter(member=>member.user_id!==userId).length===0&&<p>Nenhum outro membro disponível neste espaço.</p>}<small>{selectedCount} pessoa(s) selecionada(s) neste espaço.</small></div>}
     {visibility==='private'&&<p>Somente você verá a apresentação, os vínculos e as imagens do perfil.</p>}
     {visibility==='workspace'&&<p>Seu perfil aparece apenas para pessoas com quem você compartilha o mesmo espaço de trabalho.</p>}
    </fieldset>

    <h3>Preferências de foco</h3>
    <div className="profile-settings-grid"><label>Temporizador padrão <span>(minutos)</span><input name="focus_minutes" type="number" min="1" max="480" defaultValue={Number(profile.preferences.focus_minutes??25)} required/></label><label>Meta diária <span>(minutos; 0 = sem meta)</span><input name="daily_goal_minutes" type="number" min="0" max="1440" defaultValue={Number(profile.preferences.daily_goal_minutes??0)} required/></label></div>
    <h3>Notificações</h3>
    <label className="profile-check-row"><input type="checkbox" name="notify_assignments" defaultChecked={profile.preferences.notify_assignments!==false}/>Atribuições e transferências</label>
    <label className="profile-check-row"><input type="checkbox" name="notify_mentions" defaultChecked={profile.preferences.notify_mentions!==false}/>Menções e respostas</label>
    <button className="primary profile-save-button" disabled={busy}>{busy?'Salvando…':'Salvar alterações'}</button>
   </form>
   <div className="profile-image-settings">
    <div className="profile-current-images">
     {avatar&&<figure><img className="profile-current-avatar" src={avatar} alt="Foto de perfil atual"/><figcaption>Foto atual</figcaption></figure>}
     {cover&&<figure><img className="profile-current-cover" src={cover} alt="Capa pessoal atual"/><figcaption>Capa atual</figcaption></figure>}
    </div>
    <ProfileImageCropper kind="avatar" onSave={file=>saveImage('avatar',file)}/>
    <ProfileImageCropper kind="cover" onSave={file=>saveImage('cover',file)}/>
   </div>
  </>}
  <NativePushSettings/>
 </section>
}
