import {colorGreen019} from '../appearance/visual-colors'
import { AppSelect } from '../appearance/AppSelect'
import {CompanyOnboarding} from '../identity/CompanyOnboarding'
import {identity} from '../identity/client'
import {useEffect,useState,type KeyboardEvent} from 'react'
import {Award,BriefcaseBusiness,Building2,MessageCircle,Pencil,RefreshCw,UserRound} from 'lucide-react'
import {EvergreenBrand} from '../../components/EvergreenBrand'
import {AppVersion} from '../../components/AppVersion'
import {checked,db,failure} from '../../collaboration/client'
import type {Member} from '../../collaboration/models'
import {MemberAvatar} from './Avatars'

type CompanyHonor={id:string;first_partner:boolean;first_founder:boolean}
type Relationship='founder'|'partner'|'ceo'|'leader'|'member'
type SystemLevel={code:string;name:string;updated_at:string}
type Company={id:string;name:string;relationship:Relationship|null;relationship_updated_at:string|null;system_level:SystemLevel|null;participation_bps:number|null}
type Executive={linked_companies:number;active_roles:number;assigned_projects:number;pending_decisions:number;administrative_responsibilities:number}
type TimelineItem={kind:'project'|'role'|'founder';title:string;description:string;happened_at:string}
type Profile={id:string;display_name:string;job_title:string;bio:string;username:string|null;custom_status:string;cover_path:string|null;specialties:string[];companies:Company[];original_founders:{name:string;declared_at:string}[];trajectory:TimelineItem[];executive:Executive|null}

export const relationshipLabel:Record<Relationship,string>={founder:'Fundador',partner:'Sócio',ceo:'CEO',leader:'Liderança',member:'Equipe'}
const levelNames:Record<string,string>={A0:'APEX',A1:'Principal',A2:'Executivo',A3:'Diretor',A4:'Gerente',A5:'Integrante',A6:'Convidado'}
const executiveLabels:Record<keyof Executive,string>={linked_companies:'Empresas vinculadas',active_roles:'Cargos ativos',assigned_projects:'Projetos sob responsabilidade',pending_decisions:'Decisões pendentes',administrative_responsibilities:'Responsabilidades administrativas'}

function dateLabel(value:string){return new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium'}).format(new Date(value))}
function levelLabel(level:SystemLevel){
 const canonical=level.name.trim().toUpperCase()
 const englishDefaults:Record<string,string>={APEX:'APEX',PRINCIPAL:'Principal',EXECUTIVE:'Executivo',DIRECTOR:'Diretor',MANAGER:'Gerente',MEMBER:'Integrante',GUEST:'Convidado'}
 return levelNames[level.code]&&englishDefaults[canonical]===levelNames[level.code]?levelNames[level.code]:level.name
}
function companySubtitle(company:Company){
 const role=company.relationship?relationshipLabel[company.relationship]:'Integrante da empresa'
 return role
}
function companyDetails(company:Company){
 const level=company.system_level?`Nível ${levelLabel(company.system_level)}`:null
 const share=company.participation_bps===null?null:`Participação ${new Intl.NumberFormat('pt-BR',{style:'percent',maximumFractionDigits:2}).format(company.participation_bps/10000)}`
 return [companySubtitle(company),level,share].filter(Boolean).join(' · ')
}

export function ProfessionalProfile({userId,selfId,workspaceId,workspaceName,members,admin,onEdit,onMessage,onOpenCompany}:{userId:string;selfId:string;workspaceId:string;workspaceName:string;members:Member[];admin:boolean;onEdit:()=>void;onMessage:(id:string)=>void;onOpenCompany:(id:string)=>void}){
 const [data,setData]=useState<Profile|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[coverUrl,setCoverUrl]=useState(''),[honors,setHonors]=useState<CompanyHonor[]>([]),[firstFounderDraft,setFirstFounderDraft]=useState(false),[firstPartner,setFirstPartner]=useState(false),[firstPartnerDraft,setFirstPartnerDraft]=useState(false),[roleDraft,setRoleDraft]=useState<Relationship>('member')
 useEffect(()=>{let live=true;setData(null);setError('');void checked(db().rpc('eg_professional_profile',{p_workspace:workspaceId,p_user:userId})).then(value=>{if(live)setData(value as Profile)}).catch(e=>{if(live)setError(failure(e))});return()=>{live=false}},[workspaceId,userId,revision])
 useEffect(()=>{let live=true;setHonors([]);setFirstPartner(false);setFirstPartnerDraft(false);setFirstFounderDraft(false);void checked(db().rpc('eg_profile_honors',{p_workspace:workspaceId,p_user:userId})).then(value=>{if(!live)return;const result=value as {first_partner?:boolean;first_founder?:boolean;companies?:CompanyHonor[]}|null;const entries=result?.companies||[{id:workspaceId,first_partner:Boolean(result?.first_partner),first_founder:Boolean(result?.first_founder)}];setHonors(entries);setFirstPartner(Boolean(result?.first_partner));setFirstPartnerDraft(Boolean(result?.first_partner));setFirstFounderDraft(Boolean(result?.first_founder))}).catch(()=>{});return()=>{live=false}},[workspaceId,userId,revision])
 useEffect(()=>{const refresh=()=>setRevision(value=>value+1);window.addEventListener('evergreen:profile-updated',refresh);return()=>window.removeEventListener('evergreen:profile-updated',refresh)},[])
 useEffect(()=>{let live=true;setCoverUrl('');if(!data?.cover_path)return()=>{live=false};void checked(db().storage.from('eg-avatars').createSignedUrl(data.cover_path,300)).then(result=>{if(live)setCoverUrl(result.signedUrl)}).catch(()=>{if(live)setCoverUrl('')});return()=>{live=false}},[data?.cover_path])

 const name=data?.display_name||members.find(member=>member.user_id===userId)?.display_name||'Perfil',self=userId===selfId
 const workspaceCompany=data?.companies.find(company=>company.id===workspaceId)
 useEffect(()=>setRoleDraft(workspaceCompany?.relationship||'member'),[workspaceCompany?.relationship])
 const originalFounders=data?.original_founders||[]
 const hasExecutiveMetrics=Boolean(data?.executive)
 const medals=(data?.companies||[]).flatMap(company=>{
  const honor=honors.find(item=>item.id===company.id),items:{key:string;label:string;company:string;apex:boolean}[]=[]
  if(honor?.first_founder&&company.relationship==='founder')items.push({key:company.id+'-first-founder',label:'Primeiro fundador',company:company.name,apex:false})
  if(company.relationship==='founder'&&company.system_level?.code==='A0')items.push({key:company.id+'-apex',label:'APEX · Fundador da empresa',company:company.name,apex:true})
  if(honor?.first_partner&&company.relationship==='partner')items.push({key:company.id+'-first-partner',label:company.system_level?.code==='A0'?'APEX · Primeiro sócio':'Primeiro sócio',company:company.name,apex:company.system_level?.code==='A0'})
  return items
 })

 function openCompany(companyId:string){onOpenCompany(companyId)}
 function handleCompanyKey(event:KeyboardEvent<HTMLElement>,companyId:string){if(event.key==='Enter'||event.key===' '){event.preventDefault();openCompany(companyId)}}

 return <section className="professional-profile collab-content">
  <header className="professional-page-heading"><h1>{self?'Meu perfil':'Perfil da equipe'}</h1><button type="button" onClick={()=>setRevision(value=>value+1)} aria-label="Atualizar perfil"><RefreshCw size={17}/></button></header>
  {error&&!data?<div role="alert" className="collab-error"><p>Não foi possível carregar este perfil: {error}</p><button type="button" onClick={()=>setRevision(value=>value+1)}>Tentar novamente</button>{self&&<button type="button" onClick={onEdit}>Editar meu perfil</button>}</div>:!data?<div className="professional-loading" role="status" aria-label="Carregando perfil"><span/><span/><span/></div>:<>
   {error&&<p role="alert" className="collab-error">{error}</p>}
   <div className={`professional-cover ${coverUrl?'has-personal-cover':''}`}>
    {coverUrl&&<img className="professional-cover-photo" src={coverUrl} alt="Capa pessoal"/>}
    <div className="professional-cover-watermark professional-brazil-watermark" aria-hidden="true"><svg viewBox="0 0 200 140" fill="none"><path d="M100 15 182 70 100 125 18 70Z" stroke="currentColor" strokeWidth="5"/><circle cx="100" cy="70" r="34" fill="currentColor"/><path d="M69 58Q100 53 132 78" stroke={colorGreen019} strokeWidth="7"/><g fill={colorGreen019}><circle cx="88" cy="80" r="2"/><circle cx="103" cy="88" r="2"/><circle cx="114" cy="78" r="1.7"/><circle cx="93" cy="93" r="1.6"/><circle cx="108" cy="98" r="1.6"/><circle cx="100" cy="48" r="1.7"/></g></svg></div>
    <div className="professional-cover-brand"><EvergreenBrand compact symbol/><div className="professional-cover-copy"><span>{workspaceName||'Evergreen Holdings'}</span><small>Perfil profissional · Espaço autorizado</small></div></div>
   </div>
   <div className="professional-identity">
    <MemberAvatar userId={userId} name={name} size={96}/>
    <div className="professional-profile-actions">{self?<button type="button" onClick={onEdit}><Pencil size={16}/>Editar perfil e foto</button>:<button type="button" className="primary" onClick={()=>onMessage(userId)}><MessageCircle size={17}/>Enviar mensagem</button>}</div>
    <h2>{name}</h2>
    {data.username&&<span className="professional-username">@{data.username}</span>}
    <p className="professional-headline">{data.job_title||'Membro da equipe'}{workspaceName&&<span> · {workspaceName}</span>}</p>
    {workspaceCompany?.relationship&&<p className="professional-current-role">{relationshipLabel[workspaceCompany.relationship]} nesta empresa</p>}

    {originalFounders.map(founder=><span key={founder.name} className="professional-founder-badge"><Award size={17}/>Chairman · Fundador original · {founder.name}</span>)}
    {medals.length>0&&<div className="professional-medals" aria-label="Medalhas por empresa">{medals.map(medal=><span key={medal.key} className={`professional-medal ${medal.apex?'is-apex':''}`}><span className="professional-medal-emblem" aria-hidden="true"><Award size={24}/></span><span><strong>{medal.label}</strong><small>{medal.company}</small></span></span>)}</div>}
    {data.custom_status&&<p className="professional-status"><span aria-hidden="true"/> {data.custom_status}</p>}
   </div>

   <section className="professional-about"><h3>Sobre</h3><p>{data.bio||'Nenhuma apresentação adicionada.'}</p>{data.specialties?.length>0&&<div className="professional-specialties" aria-label="Especializações">{data.specialties.map(specialty=><span key={specialty}>{specialty}</span>)}</div>}{self&&<button className="professional-inline-edit" type="button" onClick={onEdit}><Pencil size={15}/>Editar apresentação</button>}</section>

   {/* This list retains its existing row structure and spacing; only the content and accessible activation are enhanced. */}
   <section className="professional-experience"><h3>Empresas e atuação</h3>{data.companies.map(company=><article key={company.id} role="link" tabIndex={0} aria-label={`Abrir o espaço de trabalho ${company.name} · ${companyDetails(company)}`} aria-description={companyDetails(company)} title={companyDetails(company)} onClick={()=>openCompany(company.id)} onKeyDown={event=>handleCompanyKey(event,company.id)}><div className="professional-company-icon"><Building2 size={23}/></div><div><h4>{company.name}</h4><p>{companySubtitle(company)}</p></div><BriefcaseBusiness size={18}/></article>)}{!data.companies.length&&<p>Nenhum vínculo visível neste contexto.</p>}</section>

   {self&&<details><summary>Informar ou atualizar minhas empresas</summary><CompanyOnboarding onRefresh={()=>identity.refresh()}/></details>}
   <section className="professional-history"><h3>Experiência profissional</h3><p className="professional-history-intro">Cargos e vínculos confirmados nas empresas que você pode consultar.</p>{data.companies.map(company=>{const current=company.id===workspaceId,primary=current&&firstPartner&&company.relationship==='partner'?'Primeiro sócio':company.relationship?relationshipLabel[company.relationship]:'Integrante da empresa';return <article key={company.id}><div className="professional-history-icon"><Building2 size={22}/></div><div className="professional-history-copy"><h4>{primary}</h4><p>{company.name}</p><small>{company.system_level?`Nível ${levelLabel(company.system_level)} · `:''}{company.relationship_updated_at?`Vínculo atualizado em ${dateLabel(company.relationship_updated_at)}`:'Vínculo profissional atual'}</small></div>{current&&company.system_level?.code==='A0'&&(company.relationship==='founder'||company.relationship==='partner'&&firstPartner)&&<span className="professional-history-apex">APEX</span>}</article>})}{!data.companies.length&&<p>Nenhuma experiência profissional visível neste contexto.</p>}</section>

   {self&&<section className="professional-executive"><h3>Visão executiva</h3>{hasExecutiveMetrics? <dl>{(Object.keys(executiveLabels) as (keyof Executive)[]).map(key=><div key={key}><dt>{executiveLabels[key]}</dt><dd>{data.executive?.[key]??0}</dd></div>)}</dl>:<p>Os indicadores executivos aparecerão após a atualização das regras de perfil.</p>}<p className="professional-data-note">Indicadores calculados a partir dos vínculos, tarefas e permissões atuais. Nenhuma informação financeira é exibida aqui.</p></section>}

   <section className="professional-trajectory"><h3>Trajetória no Evergreen</h3>{data.trajectory?.length?<ol>{data.trajectory.map((item,index)=><li key={`${item.kind}-${item.happened_at}-${index}`}><span className="professional-timeline-mark" aria-hidden="true"/><div><h4>{item.title}</h4><p>{item.description}</p><time dateTime={item.happened_at}>{dateLabel(item.happened_at)}</time></div></li>)}</ol>:<p>Os vínculos anteriores ainda não estão registrados. A trajetória mostra apenas marcos confirmados no Evergreen.</p>}</section>

   {admin&&members.some(member=>member.user_id===userId)&&<form className="professional-manage" onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');setNotice('');try{await checked(db().rpc('eg_profile_relationship_medals',{p_workspace:workspaceId,p_user:userId,p_relationship:roleDraft,p_first_partner:roleDraft==='partner'&&firstPartnerDraft,p_first_founder:roleDraft==='founder'&&firstFounderDraft}));setNotice('Vínculo profissional salvo. As permissões de acesso permanecem sob a gestão da empresa.');setRevision(value=>value+1)}catch(e){setError(failure(e))}finally{setBusy(false)}}}><h3>Vínculo nesta empresa</h3><p>O vínculo descreve a atuação profissional. Permissões são administradas em Membros.</p><label>Atuação<AppSelect name="relationship" value={roleDraft} onChange={event=>{setRoleDraft(event.target.value as Relationship);if(event.target.value!=='partner')setFirstPartnerDraft(false);if(event.target.value!=='founder')setFirstFounderDraft(false)}}>{Object.entries(relationshipLabel).map(([id,label])=><option key={id} value={id}>{label}</option>)}</AppSelect></label>{roleDraft==='founder'&&<label className="professional-first-founder"><span><input type="checkbox" checked={firstFounderDraft} onChange={event=>setFirstFounderDraft(event.target.checked)}/>Designar como primeiro fundador desta empresa</span><small>Uma pessoa por empresa. Outros cofundadores mantêm seu vínculo de fundador e seu nível.</small></label>}{roleDraft==='partner'&&<label className="professional-first-partner"><span><input type="checkbox" checked={firstPartnerDraft} onChange={event=>setFirstPartnerDraft(event.target.checked)}/>Designar como primeiro sócio desta empresa</span><small>Essa distinção não altera permissões. A medalha de primeiro sócio independe do nível; APEX só aparece quando esse nível também estiver concedido pela empresa.</small></label>}<button type="submit" disabled={busy}><UserRound size={17}/>{busy?'Salvando…':'Salvar vínculo profissional'}</button></form>}{notice&&<p role="status" className="professional-notice">{notice}</p>}
  </>}{self&&<AppVersion/>}</section>
}
