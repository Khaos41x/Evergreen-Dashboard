import {ProjectsModule} from '../features/productivity/ProjectsModule'
import {CompanyContext,useHolding,type HoldingScope} from '../features/holding/context'
import '../features/holding/holding.css'
const HoldingCenter=lazy(()=>import('../features/holding/HoldingCenter'))
const FinancialAnalysis=lazy(()=>import('../features/holding/FinancialAnalysis'))
const HoldingOffice=lazy(()=>import('../features/holding/HoldingOffice'))
import {FocusRoom} from '../features/productivity/FocusRoom'
import {GettingStarted} from '../features/productivity/GettingStarted'
import {codeLabel} from '../i18n/pt-BR'
import {EvergreenBrand} from '../components/EvergreenBrand'
import {useSurface} from '../features/navigation'
import {SecuritySettings} from '../features/identity/SecuritySettings'
const Economy=lazy(()=>import('../features/economy/Economy'))
const Founders=lazy(()=>import('../features/founders/Founders'))
const GroupSetup=lazy(()=>import('../features/founders/Founders').then(m=>({default:m.GroupSetup})))
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import type { IdentitySession as Session } from '../features/identity/client'
import { Hash, LayoutList, Menu, Settings, Users, X, Search, Landmark, Shield, UserRound } from 'lucide-react'
import {WorkspaceNavigation,type WorkspaceScreen} from './WorkspaceNavigation'
import {ProfessionalProfile} from '../features/productivity/ProfessionalProfile'
import './workspace.css'
import { checked, db, failure } from './client'
import { useLiveData } from './useLiveData'
import { Chat } from './Chat'
import { downloadLocal } from './backup'
import type { RecordItem } from './models'
import { useProductivity } from '../features/productivity/useProductivity'
import { TasksModule } from '../features/productivity/TasksModule'
import { FocusHome } from '../features/productivity/FocusHome'
import { WorkModule } from '../features/productivity/WorkModule'
import { usePresence } from '../features/productivity/usePresence'
import '../features/productivity/productivity.css'
import { ProfilesProvider, MemberAvatar } from '../features/productivity/Avatars'
import { GlobalSearch } from '../features/productivity/GlobalSearch'
import { TaskEditor } from '../features/productivity/TaskEditor'
import { ProfileSettings } from '../features/productivity/ProfileSettings'
import { ObjectivesModule } from '../features/productivity/ObjectivesModule'

import { WorldModeSwitch } from '../features/world/WorldModeSwitch'
import { cloudWorldData } from '../features/world/adapters'
import { productivityRepository } from '../features/productivity/repository'
import '../features/world/world.css'
import { WorldEntry } from "../features/world/WorldEntry"

type Screen = WorkspaceScreen
const value = (form: FormData, name: string) => String(form.get(name) ?? '').trim()

export function Collaboration({ session, onLocal }: { session: Session; onLocal: () => void }) {
  const [surface,navigateSurface]=useSurface()
  const world=surface==='vision',setWorld=(value:boolean)=>navigateSurface(value?'vision':'hub')
  const [foundersAccess,setFoundersAccess]=useState(false)
  const checkFounders=()=>{void checked(db().rpc('eg_founders_access')).then(v=>setFoundersAccess(!!v)).catch(()=>setFoundersAccess(false))}
  useEffect(()=>{checkFounders()},[session.user.id])
  const [migrationReady,setMigrationReady]=useState<boolean|null>(null)
  const [schemaError,setSchemaError]=useState('')
  const [schemaAttempt,setSchemaAttempt]=useState(0)
  useEffect(()=>{let live=true;setSchemaError('');db().from('eg_records').select('priority').limit(0).then(({error})=>{if(!live)return;if(!error)setMigrationReady(true);else if(error.code==='42703'||error.code==='PGRST204'){setMigrationReady(false);setScreen('chat')}else{setSchemaError(failure(error));setScreen('chat')}});return()=>{live=false}},[schemaAttempt])
  const selectionKey = `evergreen.cloud-selection.${session.user.id}`
  const [initialSelection] = useState<{ workspaceId?: string; channelId?: string }>(() => {
    try { return JSON.parse(localStorage.getItem(selectionKey) ?? '{}') ?? {} } catch { return {} }
  })
  const [workspaceId, setWorkspaceId] = useState(initialSelection.workspaceId ?? '')
  const holding=useHolding(session.user.id)
  const [allGroup,setAllGroup]=useState<string|null>(null),[holdingTab,setHoldingTab]=useState('Informações'),[strategicCompany,setStrategicCompany]=useState<string|null>(null)
  const holdingScope:HoldingScope=allGroup?{group:allGroup,workspace:null}:{group:null,workspace:strategicCompany||workspaceId}
  const selectContext=(scope:HoldingScope)=>{setAllGroup(scope.group);setStrategicCompany(null);setChannelId('');if(scope.workspace){const c=holding.companies.find(c=>c.id===scope.workspace);if(c?.operational)setWorkspaceId(scope.workspace);else{setStrategicCompany(scope.workspace);setScreen('holding')}}else setScreen('holding')}
  const companyContext=holding.ready?<CompanyContext companies={holding.companies} groups={holding.groups} value={holdingScope} onChange={selectContext}/>:null
  useEffect(()=>{if(allGroup&&!holding.groups.some(g=>g.id===allGroup))setAllGroup(null);if(strategicCompany&&!holding.companies.some(c=>c.id===strategicCompany))setStrategicCompany(null)},[holding.groups,holding.companies,allGroup,strategicCompany])
  const [channelId, setChannelId] = useState(initialSelection.channelId ?? '')
  const [screen, setScreen] = useState<Screen>(() => new URLSearchParams(window.location.search).has('invite') ? 'settings' : 'home')
  const [palette,setPalette]=useState(false)
  const [profileUser,setProfileUser]=useState<string|null>(null)
  const [taskRequest,setTaskRequest]=useState(0)
  const [focusRequest,setFocusRequest]=useState(0)
  const [focusTask,setFocusTask]=useState<string|undefined>()
  const [menu, setMenu] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const [invite, setInvite] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileReady, setProfileReady] = useState(false)
  const [createKind,setCreateKind]=useState<RecordItem['kind']>('task')
  const [record, setRecord] = useState<RecordItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [backup, setBackup] = useState(false)
  const [migrationConfirmed, setMigrationConfirmed] = useState(false)
  const editorOpener = useRef<HTMLElement | null>(null)
  const awaitingWorkspace = useRef<string | null>(null)
  const awaitingChannel = useRef<string | null>(null)
  const pendingRef = useRef(pending)
  pendingRef.current = pending
  const data = useLiveData(session.user.id, workspaceId)
  const domain = useProductivity(workspaceId, data.records.map(r=>r.id),migrationReady===true)
  const presence = usePresence(workspaceId, session.user.id, domain.focus.some(f=>f.user_id===session.user.id&&f.status==='running'),migrationReady===true)
  const refreshAll = async () => { await Promise.all([data.refresh(), domain.refresh()]) }
  const workspace = data.workspaces.find(w => w.id === workspaceId)
  const channel = data.channels.find(c => c.id === channelId)
  const self = data.members.find(m => m.user_id === session.user.id)
  const admin = self?.role === 'owner' || self?.role === 'admin'
  const owner = self?.role === 'owner'
  const canCreateWorkspace = true
  useEffect(() => {
    if (data.loading || data.loadedWorkspaceId !== workspaceId || !data.workspaces.some(w => w.id === workspaceId) || !data.channels.some(c => c.id === channelId)) return
    try { localStorage.setItem(selectionKey, JSON.stringify({ workspaceId, channelId })) } catch { /* Navigation preference only; server data remains authoritative. */ }
  }, [selectionKey, workspaceId, channelId, data.loading, data.loadedWorkspaceId, data.workspaces, data.channels])
  useEffect(() => {
    if (!creating) return
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pendingRef.current) setCreating(false)
      if (event.key !== 'Tab') return
      const controls = [...document.querySelectorAll<HTMLElement>('.collab-modal button:not(:disabled), .collab-modal input, .collab-modal select, .collab-modal textarea')]
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); editorOpener.current?.focus() }
  }, [creating])
  useEffect(() => {
    if (!menu) return
    const opener = document.activeElement as HTMLElement | null
    const controls = () => [...document.querySelectorAll<HTMLElement>('.collab-sidebar button:not(:disabled), .collab-sidebar select')]
    controls()[0]?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMenu(false) }
      if (event.key !== 'Tab') return
      const items = controls(), first = items[0], last = items.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    const resize = () => { if (window.innerWidth > 1000) setMenu(false) }
    document.addEventListener('keydown', keydown); window.addEventListener('resize', resize)
    return () => { document.removeEventListener('keydown', keydown); window.removeEventListener('resize', resize); opener?.focus() }
  }, [menu])
  useEffect(() => {
    let active = true
    checked(db().from('eg_profiles').select('display_name').eq('id', session.user.id).maybeSingle())
      .then(async profile => {
        const name = profile?.display_name ?? String(session.user.user_metadata.display_name ?? session.user.email?.split('@')[0] ?? 'Membro').slice(0, 80)
        if (!profile) await checked(db().from('eg_profiles').upsert({ id: session.user.id, display_name: name }, { onConflict: 'id', ignoreDuplicates: true }))
        if (active) { setProfileName(name); setProfileReady(true) }
      }).catch(e => { if (active) setError(failure(e)) })
    return () => { active = false }
  }, [session.user.id])
  useEffect(() => {
    if (awaitingWorkspace.current) {
      if (!data.workspaces.some(w => w.id === awaitingWorkspace.current)) return
      awaitingWorkspace.current = null
    }
    if (!data.loading && data.loadedWorkspaceId === workspaceId && !data.workspaces.some(w => w.id === workspaceId)) setWorkspaceId(data.workspaces[0]?.id ?? '')
  }, [data.workspaces, data.loading, data.loadedWorkspaceId, workspaceId])
  useEffect(() => {
    if (awaitingChannel.current) {
      if (!data.channels.some(c => c.id === awaitingChannel.current)) return
      awaitingChannel.current = null
    }
    if (!data.loading && data.loadedWorkspaceId === workspaceId && !data.channels.some(c => c.id === channelId)) setChannelId(data.channels[0]?.id ?? '')
  }, [data.channels, data.loading, data.loadedWorkspaceId, workspaceId, channelId])
  useEffect(() => { setRecord(null); setCreating(false); setInvite(''); setError(''); setNotice(''); setBackup(false); setMigrationConfirmed(false) }, [workspaceId])
  async function run(action: () => Promise<void>) {
    if (pending) return
    setPending(true); setError(''); setNotice('')
    try { await action(); await data.refresh() } catch (e) { setError(failure(e)) } finally { setPending(false) }
  }
  function form(event: FormEvent<HTMLFormElement>, action: (fields: FormData) => Promise<void>) {
    event.preventDefault(); const element = event.currentTarget; const fields = new FormData(element)
    void run(async () => { await action(fields); if (element.isConnected) element.reset() })
  }
  async function saveRecord(fields: FormData) {
    const payload = { title: value(fields, 'title'), description: value(fields, 'description'), status: value(fields, 'status') || 'todo', assignee_id: value(fields, 'assignee') || null, project_id: value(fields, 'project') || null, objective_id: value(fields, 'objective') || null, progress: Number(value(fields, 'progress') || 0),...(migrationReady?{color:value(fields,'color')||'emerald',icon:value(fields,'icon')||'folder'}:{}) }
    if (record) {
      const saved = await checked(db().from('eg_records').update(payload).eq('id', record.id).eq('version', record.version).select().maybeSingle())
      if (!saved) throw new Error('Este item mudou em outra sessão. Feche e abra novamente para revisar a versão atual.')
    } else await checked(db().from('eg_records').insert({ ...payload, workspace_id: workspaceId, kind: value(fields, 'kind') }))
    setRecord(null); setCreating(false); setNotice('Item salvo no servidor.')
  }
  async function importLocal() {
    if (!backup || !migrationConfirmed) throw new Error('Exporte o backup e confirme a importação primeiro.')
    const raw = localStorage.getItem('evergreen.workspace.v1'); if (!raw) throw new Error('Nenhum dado local encontrado.')
    const local = JSON.parse(raw) as Record<string, { id: string; title?: string; name?: string; description?: string; status?: string; progress?: number }[]>
    const mapping = new Map<string, string>()
    // Insert in dependency order. Stable source_key resumes partial imports without duplicates.
    for (const [key, kind] of [['projects', 'project'], ['objectives', 'objective'], ['tasks', 'task']] as const) {
      const items = local[key] ?? []
      if (!Array.isArray(items)) throw new Error(`Backup inválido: ${key}`)
      for (const item of items) {
        const source = `legacy:${kind}:${item.id}`
        const existing = await checked(db().from('eg_records').select('id').eq('workspace_id', workspaceId).eq('source_key', source).maybeSingle())
        if (existing) { mapping.set(item.id, existing.id); continue }
        const legacy = item as typeof item & { projectId?: string; objectiveId?: string }
        const inserted = await checked(db().from('eg_records').insert({ workspace_id: workspaceId, kind, title: item.title ?? item.name ?? 'Importado', description: `${item.description ?? ''}\n\nDados locais originais (arquivo):\n${JSON.stringify(item)}`, status: item.status ?? 'todo', progress: Math.round(item.progress ?? 0), assignee_id: kind === 'task' ? session.user.id : null, project_id: mapping.get(legacy.projectId ?? '') ?? null, objective_id: mapping.get(legacy.objectiveId ?? '') ?? null, source_key: source }).select('id').single())
        mapping.set(item.id, inserted.id)
      }
    }
    setNotice("Importação confirmada. Dados locais preservados. caixa de entrada e sessões de foco permanecem no backup local; detalhes legados foram arquivados na descrição.")
  }
  const navigate = (next: Screen) => { if(next!=='holding'){setAllGroup(null);setStrategicCompany(null)}setWorld(false); setScreen(next); setMenu(false); setNotice('') }
  const openEditor = (item: RecordItem | null) => { editorOpener.current = document.activeElement as HTMLElement | null; if(!item)setCreateKind(screen==='records'?'project':'task');setRecord(item); setCreating(true) }
  const command=(action:string)=>{
    setWorld(false)
    if(action==='create'){setScreen('tasks');if(migrationReady)setTaskRequest(v=>v+1);else{setCreateKind('task');setRecord(null);setCreating(true)}}
    else if(action==='focus'){setScreen('home');setFocusRequest(v=>v+1)}
    else if(action==='objective'){setCreateKind('objective');setScreen('objectives');setRecord(null);setCreating(true)}
    else if(action==='issue'){setScreen('issues');setTaskRequest(v=>v+1)}
    else if(action==='inbox'){setScreen('tasks');window.setTimeout(()=>document.querySelector<HTMLButtonElement>('.domain-tasks [role=tab]:nth-child(3)')?.click(),50)}
    else if(['tasks','work','chat','settings','objectives','members','help','focus-room'].includes(action))navigate(action as Screen)
  }
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{const target=e.target as HTMLElement,writing=['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||target.isContentEditable;
      if(e.ctrlKey&&e.key.toLowerCase()==='k'){e.preventDefault();setPalette(v=>!v)}
      if(writing||e.ctrlKey||e.altKey||e.metaKey)return
      if(e.key.toLowerCase()==='c')command('create')
      if(e.key.toLowerCase()==='f')command('focus')
      if(e.key==='/'){e.preventDefault();setPalette(true)}
    };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)
  })
  const visible = data.records.filter(r => (r.title + ' ' + r.description).toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || r.kind === filter || r.status === filter))
  if(surface==='economy'&&(allGroup||strategicCompany))return <main className="economy-page"><header className="economy-header"><button onClick={()=>navigateSurface('vision')}>Voltar à Visão</button><EvergreenBrand compact symbol/></header>{companyContext}<Suspense fallback={<p role="status">Abrindo o consolidado…</p>}><FinancialAnalysis key={allGroup||strategicCompany} scope={holdingScope} email={session.user.email||''}/></Suspense></main>
  if(surface==='economy')return <Suspense fallback={<p role="status">Abrindo Finanças…</p>}><Economy context={companyContext} key={workspaceId} workspaceId={workspaceId} name={workspace?.name||'Selecione uma empresa'} email={session.user.email||''} onBack={()=>navigateSurface('vision')}/></Suspense>
  if(surface==='founders')return <Suspense fallback={<p role="status">Abrindo Fundadores…</p>}><Founders userId={session.user.id} email={session.user.email||''} onBack={()=>navigateSurface('vision')} onWorkspace={id=>{if(!data.workspaces.some(w=>w.id===id)){window.alert('Seu acesso estratégico não inclui a operação desta empresa. Peça acesso ao responsável.');return}setWorkspaceId(id);setChannelId('');navigateSurface('hub');setScreen('home')}} onEconomy={id=>{setWorkspaceId(id);navigateSurface('economy')}} onChat={(id,channel)=>{awaitingWorkspace.current=id;void data.refresh();setWorkspaceId(id);awaitingChannel.current=channel;setChannelId(channel);setScreen('chat');navigateSurface('hub')}}/></Suspense>
  return <ProfilesProvider workspaceId={workspaceId} enabled={migrationReady===true}><div className="collab-app">
    <WorkspaceNavigation admin={admin} inert={creating} menu={menu} close={()=>setMenu(false)} screen={screen} navigate={s=>{if(s==='profile')setProfileUser(null);navigate(s)}} companies={holding.companies} groups={holding.groups} scope={holdingScope} select={scope=>{selectContext(scope);setWorld(false);setMenu(false);if(scope.workspace&&holding.companies.find(c=>c.id===scope.workspace)?.operational)setScreen('home')}} channels={data.channels} members={data.members} channelId={channelId} openChannel={id=>{setChannelId(id);navigate('chat')}} unread={data.unread} userId={session.user.id} name={profileName||session.user.email||'Membro'} pending={pending} logout={()=>void run(async()=>{await checked(db().auth.signOut())})} organization={tab=>{setHoldingTab(tab);if(tab==='Empresas'&&holding.groups[0]){setAllGroup(holding.groups[0].id);setStrategicCompany(null)}setWorld(false);setScreen('holding');setMenu(false)}} notifications={domain.notifications.filter(n=>!n.read_at).length} search={()=>setPalette(true)} founders={foundersAccess} openFounders={()=>navigateSurface('founders')} workspaceName={workspace?.name||''}/>
    {menu && <button className="collab-menu-scrim" tabIndex={-1} aria-label="Fechar navegação" onClick={() => setMenu(false)} />}
    <main className="collab-main" inert={menu || creating}>
      <header className="collab-top"><button className="collab-mobile-only" aria-label="Abrir menu" onClick={()=>setMenu(true)}><Menu size={21}/></button><strong>{allGroup?holding.groups.find(g=>g.id===allGroup)?.name:workspace?.name||'Evergreen'}</strong><button className="workspace-top-search" onClick={()=>setPalette(true)} aria-label="Buscar na Evergreen"><Search size={18}/><span>Buscar</span></button><WorldModeSwitch world={world} onChange={setWorld}/><button aria-label="Finanças" title="Finanças" onClick={()=>navigateSurface('economy')}><Landmark size={18}/><span className="workspace-wide-label">Finanças</span></button>{foundersAccess&&<button className="workspace-founders-link" aria-label="Fundadores" title="Fundadores" onClick={()=>navigateSurface('founders')}><Shield size={18}/><span className="workspace-wide-label">Fundadores</span></button>}<button aria-label="Configurações" title="Configurações" onClick={()=>navigate('settings')}><Settings size={19}/></button></header>
      {holding.error&&<div role="alert" className="collab-error">Não foi possível carregar as empresas: {holding.error}<button onClick={holding.refresh}>Tentar carregar empresas</button></div>}
      {(error || data.error) && <div role="alert" className="collab-error">{error || data.error}<button onClick={() => void data.refresh()}>Tentar novamente</button></div>}
      {migrationReady===false&&<p role="status" className="collab-notice">Módulos novos aguardam a migração productivity_domains no Supabase. Chat e produtividade local continuam disponíveis.</p>}
      {schemaError&&<p role="alert" className="collab-error">Não foi possível verificar os módulos do espaço de trabalho: {schemaError} <button onClick={()=>setSchemaAttempt(v=>v+1)}>Tentar novamente</button></p>}
      {notice && <p role="status" className="collab-notice">{notice}</p>}
      {screen==='profile'?<ProfessionalProfile key={(profileUser||session.user.id)+workspaceId} userId={profileUser||session.user.id} selfId={session.user.id} workspaceId={workspaceId} members={data.members} admin={admin} onEdit={()=>navigate('settings')} onMessage={id=>void run(async()=>{const channel=await checked(db().rpc('eg_direct_channel',{p_workspace:workspaceId,p_user:id}));await data.refresh();awaitingChannel.current=channel;setChannelId(channel);navigate('chat')})}/>:holding.ready&&(allGroup||strategicCompany||screen==='holding') ? world&&allGroup?<Suspense fallback={<p role="status">Abrindo escritório da holding…</p>}><HoldingOffice group={allGroup} name={holding.groups.find(g=>g.id===allGroup)?.name||'Holding'} userId={session.user.id} onBack={()=>setWorld(false)} onEconomy={()=>navigateSurface('economy')} onFounders={foundersAccess?()=>navigateSurface('founders'):undefined}/></Suspense>:<Suspense fallback={<p role="status">Abrindo central da holding…</p>}><HoldingCenter groups={holding.groups} onOpenCompany={(id,destination)=>{awaitingWorkspace.current=id;void data.refresh();setWorkspaceId(id);setChannelId('');navigate(destination)}} key={(allGroup||strategicCompany||workspaceId)} scope={holdingScope} companies={holding.companies} email={session.user.email||''} refreshContext={holding.refresh} initial={holdingTab}/></Suspense> : data.loading || migrationReady && domain.initialLoading && !domain.error ? <p role="status" className="collab-content">Carregando espaço de trabalho…</p> : world ? <WorldEntry onExit={()=>setWorld(false)} key={workspaceId} data={cloudWorldData({workspaceId,name:workspace?.name??"Selecione um espaço de trabalho",userId:session.user.id,members:data.members,records:data.records,channels:data.channels,focus:domain.focus,activity:domain.activity,online:presence.online,presenceError:presence.error,error:data.error||domain.error,loading:data.loading,canMutate:!!self&&migrationReady===true})} actions={{onOpenEconomy:()=>navigateSurface('economy'),onOpenFounders:foundersAccess?()=>navigateSurface('founders'):undefined,onOpenTask:id=>{const item=data.records.find(r=>r.id===id);if(item){setWorld(false);openEditor(item)}},onOpenProject:id=>{const item=data.records.find(r=>r.id===id);if(item){setWorld(false);navigate('records');openEditor(item)}},onCompleteTask:async id=>{const item=data.records.find(r=>r.id===id);if(!item||!self||!migrationReady)throw new Error("A tarefa não está disponível para alteração neste espaço de trabalho.");await productivityRepository.saveRecord(workspaceId,item,{status:'done'});await refreshAll()},onFocusTask:migrationReady?id=>{setFocusTask(id);setFocusRequest(v=>v+1);navigate('home')}:undefined,onOpenChannel:id=>{setChannelId(id);navigate('chat')},onCreateTask:()=>command('create')}}/> : screen === 'focus-room' ? <FocusRoom members={data.members} sessions={domain.focus} online={presence.online} presenceError={presence.error} onStart={()=>command('focus')}/> : screen==='help' ? <GettingStarted onAction={command}/> : screen === 'home' ? <FocusHome workspaceId={workspaceId} userId={session.user.id} name={profileName} members={data.members} records={data.records} domain={domain} online={presence.online} onTasks={()=>navigate('tasks')} onObjective={()=>command('objective')} onInvite={()=>navigate('members')} refresh={refreshAll} focusRequest={focusRequest} initialTaskId={focusTask} onConsumeFocusRequest={()=>setFocusRequest(0)}/> : migrationReady && (screen === 'tasks' || screen === 'issues') ? <TasksModule key={workspaceId+screen} workspaceId={workspaceId} userId={session.user.id} members={data.members} records={data.records} domain={domain} refresh={refreshAll} kind={screen==='issues'?'issue':'task'} requestCreate={taskRequest} onStartFocus={id=>{setFocusTask(id);setFocusRequest(v=>v+1);navigate('home')}}/> : screen === 'objectives' ? <ObjectivesModule onCreate={()=>command('objective')} workspaceId={workspaceId} records={data.records} areas={domain.areas} goals={domain.goals} links={domain.links} refresh={refreshAll}/> : screen === 'work' ? <WorkModule members={data.members} records={data.records} domain={domain}/> : screen === 'notifications' ? <section className="collab-content"><h1>Notificações</h1>{domain.error&&<p role="alert">{domain.error}</p>}{domain.notifications.map(n=><button className="domain-notification" key={n.id} onClick={()=>void run(async()=>{await checked(db().from('eg_notifications').update({read_at:new Date().toISOString()}).eq('id',n.id));await domain.refresh();const resource=data.records.find(r=>r.id===n.resource_id);if(resource){setRecord(resource);setCreating(true)}else if(data.channels.some(c=>c.id===n.resource_id)){setChannelId(n.resource_id!);navigate('chat')}else navigate('tasks')})}><strong>{n.read_at?'':"Não lida · "}{codeLabel(n.type)}</strong><span>{n.title}</span><time>{new Date(n.created_at).toLocaleString('pt-BR')}</time></button>)}{!domain.notifications.length&&<p>Nenhuma notificação ainda.</p>}</section> : screen === 'chat' ? channel ? <Chat key={`${workspaceId}:${channel.id}`} channel={channel} extended={migrationReady===true} members={data.members} onOpenRecord={id=>{const item=data.records.find(r=>r.id===id);if(item?.kind==='task'||item?.kind==='issue'){setRecord(item);setCreating(true)}else void refreshAll().then(()=>navigate('tasks'))}} userId={session.user.id} joined={data.joined.includes(channel.id)} admin={admin} onProfile={id=>{setProfileUser(id);navigate('profile')}} onMembership={join => void run(async () => { await checked(db().rpc('eg_channel_membership', { p_channel: channel.id, p_user: session.user.id, p_join: join })) })} /> : <div className="collab-empty"><h1>Seu próximo capítulo, em equipe.</h1><p>Crie seu espaço de trabalho em Ajustes ou abra um canal da equipe.</p><button className="primary" onClick={() => navigate('settings')}>Configurar espaço de trabalho</button></div> : migrationReady&&screen==='records'?<ProjectsModule key={workspaceId} workspaceId={workspaceId} userId={session.user.id} members={data.members} records={data.records} domain={domain} refresh={refreshAll} onCreate={()=>openEditor(null)} onEdit={openEditor}/> : screen === 'records' || !migrationReady && screen === 'tasks' ? <section className="collab-content">
        <header className="collab-section-title"><div><h1>Projetos e tarefas</h1><p>Trabalho compartilhado, salvo no espaço de trabalho.</p></div><button className="primary" disabled={!workspaceId || pending} onClick={() => openEditor(null)}>Criar item</button></header>
        <div className="collab-actions"><label>Pesquisar<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar trabalho" /></label><label>Filtrar<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Tudo</option><option value="task">Tarefas</option><option value="project">Projetos</option><option value="objective">Objetivos</option><option value="todo">A fazer</option><option value="in-progress">Em andamento</option><option value="done">Concluído</option></select></label></div>
        <div className="collab-records">{visible.map(r => <button key={r.id} onClick={() => openEditor(r)}><span><small>{({ task: 'Tarefa', project: 'Projeto', objective: 'Objetivo', issue: "Ocorrência" })[r.kind]}</small><strong>{r.title}</strong><small>{data.members.find(m => m.user_id === r.assignee_id)?.display_name ?? 'Sem responsável'}</small></span><span>{({ backlog: "Em espera", todo: 'A fazer', 'in-progress': 'Em andamento', done: 'Concluído' })[r.status]} · {r.progress}%</span></button>)}{visible.length === 0 && <p>Nenhum item encontrado. Crie o primeiro item ou ajuste a pesquisa.</p>}</div>
      </section> : screen === 'members' ? <section className="collab-content"><h1>Membros e acesso</h1><p>Papéis e permissões são verificados pelo servidor.</p>
        {data.members.map(m => <div className="collab-member" key={m.user_id}><MemberAvatar userId={m.user_id} name={m.display_name}/><button className="workspace-member-name" onClick={()=>{setProfileUser(m.user_id);navigate('profile')}}><UserRound size={16}/>{m.display_name}</button><span>{codeLabel(m.role)}</span>{owner && m.role !== 'owner' && <><button disabled={pending} onClick={() => void run(async () => { await checked(db().rpc('eg_manage_member', { p_workspace: workspaceId, p_user: m.user_id, p_role: m.role === 'admin' ? 'member' : 'admin' })) })}>{m.role === 'admin' ? 'Tornar membro' : 'Tornar administrador'}</button><button disabled={pending} onClick={() => { if (window.confirm(`Remover ${m.display_name} deste espaço de trabalho?`)) void run(async () => { await checked(db().rpc('eg_manage_member', { p_workspace: workspaceId, p_user: m.user_id, p_role: 'remove' })) }) }}>Remover</button></>}{admin && channel?.is_private && <button disabled={pending} onClick={() => void run(async () => { await checked(db().rpc('eg_channel_membership', { p_channel: channel.id, p_user: m.user_id, p_join: true })); setNotice(`Acesso concedido a ${m.display_name} no canal ${channel.name}.`) })}>Adicionar a {channel.name}</button>}</div>)}
        {admin && <form onSubmit={e => form(e, async f => { const inv = await checked(db().from('eg_invites').insert({ workspace_id: workspaceId, email: value(f, 'email').toLowerCase() }).select('token').single()); setInvite(`${window.location.origin}/?invite=${inv.token}`); setNotice('Convite criado por 7 dias. Envie o link ao destinatário; nenhum e-mail foi enviado automaticamente.') })}><h2>Convidar por e-mail</h2><label>E-mail do destinatário<input type="email" name="email" required maxLength={254} /></label><button disabled={pending}>Criar convite</button></form>}
        {invite && <label>Link do convite<input readOnly value={invite} onFocus={e => e.target.select()} /><small>O destinatário deve entrar com esse e-mail confirmado. Em outro dispositivo, substitua localhost pelo endereço LAN configurado.</small></label>}
        <h2>Mensagens diretas</h2>{data.members.filter(m=>m.user_id!==session.user.id).map(m=><button key={m.user_id} disabled={pending||!migrationReady} onClick={()=>void run(async()=>{const id=await checked(db().rpc('eg_direct_channel',{p_workspace:workspaceId,p_user:m.user_id}));await data.refresh();awaitingChannel.current=id;setChannelId(id);setScreen('chat')})}>Mensagem {m.display_name}</button>)}<p>Voz, vídeo e PWA ainda não estão disponíveis.</p>
      </section> : <section className="collab-content collab-settings"><h1>Configurações</h1>{holding.ready&&<button onClick={()=>{setHoldingTab('Integrações');setScreen('holding')}}>Integrações da empresa</button>}
        {migrationReady?<ProfileSettings userId={session.user.id} onName={name=>{setProfileName(name);setProfileReady(true)}}/>:<form onSubmit={e=>form(e,async f=>{const name=value(f,'name');await checked(db().from('eg_profiles').update({display_name:name}).eq('id',session.user.id).select().single());setProfileName(name);setNotice('Perfil atualizado no servidor.')})}><h2>Seu perfil</h2><label>Nome<input name="name" defaultValue={profileName} required maxLength={80}/></label><button disabled={pending}>Salvar perfil</button><small>Avatar e preferências aguardam a migração incremental.</small></form>}
        <SecuritySettings email={session.user.email||''}/>
        {canCreateWorkspace&&<Suspense fallback={null}><GroupSetup onCreated={()=>{checkFounders();setNotice("Grupo estabelecido. Configure as empresas no Fundadores.")}}/></Suspense>}
        {canCreateWorkspace && <form onSubmit={e => form(e, async f => { const id = await checked(db().rpc('eg_create_workspace', { p_name: value(f, 'name') })); await data.refresh(); awaitingWorkspace.current = id; setWorkspaceId(id); setScreen('chat') })}><h2>Novo espaço de trabalho</h2><p>Espaço interno para uma empresa ou equipe da holding.</p><label>Nome do espaço de trabalho<input name="name" required maxLength={80} /></label><button disabled={pending || !profileReady}>Criar espaço de trabalho</button></form>}
        <form onSubmit={e => form(e, async f => { let token = value(f, 'token'); if (token.includes('?')) token = new URL(token).searchParams.get('invite') ?? ''; const id = await checked(db().rpc('eg_accept_invite', { p_token: token })); await data.refresh(); awaitingWorkspace.current = id; setWorkspaceId(id); window.history.replaceState(null, '', window.location.pathname); setScreen('chat') })}><h2>Aceitar convite</h2><label>Link ou código<input name="token" defaultValue={new URLSearchParams(window.location.search).get('invite') ?? ''} required /></label><button disabled={pending || !profileReady}>Aceitar convite</button></form>
        {admin && workspace && <><form key={workspace.id} onSubmit={e => form(e, async f => { await checked(db().from('eg_workspaces').update({ name: value(f, 'name') }).eq('id', workspaceId).select().single()); setNotice("Espaço de trabalho atualizado.") })}><h2>Editar espaço de trabalho</h2><label>Nome<input name="name" defaultValue={workspace.name} required maxLength={80} /></label><button disabled={pending}>Salvar espaço de trabalho</button></form>
          <form onSubmit={e => form(e, async f => { const id = await checked(db().rpc('eg_create_channel', { p_workspace: workspaceId, p_name: value(f, 'name'), p_private: f.get('private') === 'on' })); await data.refresh(); awaitingChannel.current = id; setChannelId(id); setScreen('chat') })}><h2>Novo canal</h2><label>Nome do canal<input name="name" required maxLength={80} /></label><label className="collab-check"><input name="private" type="checkbox" />Canal privado (somente convidados)</label><button disabled={pending}>Criar canal</button></form></>}
        <section><h2>Modo pessoal neste navegador</h2><p>Suas tarefas pessoais ficam salvas apenas neste navegador, sem sincronização com a equipe. Use o backup para transferi-las entre dispositivos.</p><button onClick={onLocal}>Abrir modo pessoal</button><h2>Dados deste navegador</h2><p>A importação copia projetos, objetivos e tarefas para o espaço de trabalho selecionado. Responsáveis antigos são remapeados para você; dados extras ficam arquivados na descrição. caixa de entrada e foco permanecem locais. Os originais nunca são apagados.</p><button onClick={() => { downloadLocal(); setBackup(true) }}>Exportar backup local</button><label className="collab-check"><input type="checkbox" checked={migrationConfirmed} onChange={e => setMigrationConfirmed(e.target.checked)} />Confirmo copiar meus dados para {workspace?.name ?? "o espaço de trabalho selecionado"} e compartilhá-los com seus membros.</label><button disabled={!workspaceId || !backup || !migrationConfirmed || pending} onClick={() => void run(importLocal)}>Importar dados locais</button></section>
      </section>}
    </main>
    <nav className="collab-bottom" aria-label="Navegação mobile" inert={menu || creating}>{([{ id: 'chat', label: 'Conversas', Icon: Hash }, { id: 'tasks', label: 'Tarefas', Icon: LayoutList }, { id: 'members', label: 'Membros', Icon: Users }, { id: 'settings', label: 'Ajustes', Icon: Settings }] as const).map(({ id, label, Icon }) => <button key={id} aria-current={screen === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={20} />{label}</button>)}</nav>
    {palette&&<GlobalSearch records={data.records} members={data.members} goals={domain.goals} onAction={command} onRecord={id=>{const r=data.records.find(r=>r.id===id);if(r)openEditor(r)}} onChannel={id=>{setChannelId(id);navigate('chat')}} onClose={()=>setPalette(false)}/>}
    {creating&&record&&(record.kind==='task'||record.kind==='issue')?<TaskEditor record={record} kind={record.kind} workspaceId={workspaceId} userId={session.user.id} members={data.members} records={data.records} checklist={domain.checklist} comments={domain.comments} handoffs={domain.handoffs} onClose={()=>setCreating(false)} refresh={refreshAll}/>:creating && <div className="collab-modal"><section role="dialog" aria-modal="true" aria-labelledby="record-title"><header><h2 id="record-title">{record ? 'Editar item' : 'Criar item'}</h2><button aria-label="Fechar editor" onClick={() => setCreating(false)}><X /></button></header><form onSubmit={e => form(e, saveRecord)}>
      {!record && <label>Tipo<select aria-label="Tipo" name="kind" defaultValue={createKind}><option value="task">Tarefa</option><option value="project">Projeto</option><option value="objective">Objetivo</option></select></label>}
      <label>Título<input autoFocus name="title" defaultValue={record?.title} required maxLength={200} /></label><label>Descrição<textarea name="description" defaultValue={record?.description} maxLength={10000} /></label>
      <label>Situação<select aria-label="Situação" name="status" defaultValue={record?.status ?? 'todo'}><option value="backlog">Em espera</option><option value="todo">A fazer</option><option value="in-progress">Em andamento</option><option value="done">Concluído</option></select></label>
      <label>Responsável<select aria-label="Responsável" name="assignee" defaultValue={record?.assignee_id ?? session.user.id}><option value="">Sem responsável</option>{data.members.map(m => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></label>
      <label>Projeto<select aria-label="Projeto" name="project" defaultValue={record?.project_id ?? ''}><option value="">Sem projeto</option>{data.records.filter(r => r.kind === 'project' && r.id !== record?.id).map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
      <label>Objetivo<select aria-label="Objetivo" name="objective" defaultValue={record?.objective_id ?? ''}><option value="">Sem objetivo</option>{data.records.filter(r => r.kind === 'objective' && r.id !== record?.id).map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
      <label>Cor<select name="color" defaultValue={record?.color??'emerald'}>{['emerald','gray','blue','amber'].map(c=><option key={c} value={c}>{codeLabel(c)}</option>)}</select></label><label>Ícone<select name="icon" defaultValue={record?.icon??'folder'}>{['folder','target','code','book'].map(i=><option key={i} value={i}>{codeLabel(i)}</option>)}</select></label><label>Progresso (%)<input name="progress" type="number" min="0" max="100" defaultValue={record?.progress ?? 0} required /></label>
      {error && <p role="alert" className="collab-error">{error}</p>}<div className="collab-actions"><button className="primary" disabled={pending}>Salvar item</button>{record && <button type="button" disabled={pending} onClick={() => { if (window.confirm("Excluir este item do espaço de trabalho?")) void run(async () => { await checked(db().from('eg_records').delete().eq('id', record.id).eq('version', record.version).select().single()); setCreating(false); setRecord(null) }) }}>Excluir item</button>}{record&&migrationReady&&<button type="button" disabled={pending} onClick={()=>void run(async()=>{await checked(db().from('eg_records').update({archived_at:record.archived_at?null:new Date().toISOString()}).eq('id',record.id).eq('version',record.version).select().single());setCreating(false)})}>{record.archived_at?"Restaurar":"Arquivar"}</button>}<button type="button" onClick={() => setCreating(false)}>Cancelar</button></div>
    </form></section></div>}
  </div></ProfilesProvider>
}
