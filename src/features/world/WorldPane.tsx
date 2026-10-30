import {EvergreenBrand} from '../../components/EvergreenBrand'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronLeft, ChevronRight, Compass, Focus, Hash, Layers3, Minus, Plus, RotateCcw, Search, Vault, X } from 'lucide-react'
import { WorldBoundary } from './WorldBoundary'
import { completion, layoutWorld, presenceLabels, tasksFor, type WorldActions, type WorldData, type WorldSelection } from './model'
import './world.css'

const WorldScene = lazy(() => import('./WorldScene'))
export interface CameraCommand { id: number; type: 'in' | 'out' | 'left' | 'right' | 'up' | 'down' | 'reset' }
function supportsWebGL() {
  try { const canvas = document.createElement('canvas'); const context = canvas.getContext('webgl2'); if (!context) return false; context.getExtension('WEBGL_lose_context')?.loseContext(); return true } catch { return false }
}
const statusNames: Record<string, string> = { backlog: "Em espera", todo: 'A fazer', 'in-progress': 'Em andamento', done: 'Concluída' }

export default function WorldPane({ data, actions }: { data: WorldData; actions: WorldActions }) {
  const [opening,setOpening]=useState(false),[vaultHover,setVaultHover]=useState(false)
  const opened=useRef(false)
  const finishVault=()=>{if(opened.current)return;opened.current=true;actions.onOpenEconomy?.()}
  const openVault=()=>{if(opening)return;if(reduced||view==='2d'){finishVault();return}setOpening(true)}
  useEffect(()=>{if(!opening)return;const timer=setTimeout(finishVault,1200);return()=>clearTimeout(timer)},[opening])
  const [selected, setSelected] = useState<{ scope: string; value: WorldSelection } | null>(null)
  const selection = selected?.scope === data.scope ? selected.value : null
  const [view, setView] = useState<'3d' | '2d'>('3d'), [graphicsError, setGraphicsError] = useState(''), [attempt, setAttempt] = useState(0)
  const [reloadGraphics,setReloadGraphics]=useState(false)
  const [quality, setQuality] = useState<'auto' | 'low' | 'high'>('auto'), [degraded, setDegraded] = useState(false)
  const [visible, setVisible] = useState(!document.hidden), [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [compact, setCompact] = useState(() => matchMedia('(max-width: 768px)').matches)
  const [query, setQuery] = useState(''), [memberPage, setMemberPage] = useState(0), [projectPage, setProjectPage] = useState(0), [taskLimit, setTaskLimit] = useState(12)
  const [pending, setPending] = useState(''), [actionError, setActionError] = useState('')
  const [command, setCommand] = useState<CameraCommand>({ id: 0, type: 'reset' })
  const labels = useRef<Record<string, HTMLDivElement | null>>({}), renderer = useRef<HTMLDivElement>(null), details = useRef<HTMLElement>(null)
  const scope = useRef(data.scope); scope.current = data.scope
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    if (!supportsWebGL()) { setView('2d'); setGraphicsError('Este dispositivo não disponibilizou WebGL2. Você pode usar todas as ações pelo diretório 2D.') }
    const media = matchMedia('(prefers-reduced-motion: reduce)'), size = matchMedia('(max-width: 768px)')
    const motion = () => setReduced(media.matches), resize = () => setCompact(size.matches), visibility = () => setVisible(!document.hidden)
    media.addEventListener('change', motion); size.addEventListener('change', resize); document.addEventListener('visibilitychange', visibility)
    return () => { media.removeEventListener('change', motion); size.removeEventListener('change', resize); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  useEffect(() => { setOpening(false);opened.current=false;setSelected(null); setQuery(''); setMemberPage(0); setProjectPage(0); setPending(''); setActionError('') }, [data.scope])
  useEffect(() => { if (selection) { setTaskLimit(12);details.current?.parentElement?.scrollTo({top:0});details.current?.focus({ preventScroll: true });if(compact)details.current?.scrollIntoView({block:'start',behavior:reduced?'auto':'smooth'}) } }, [selection?.id, selection?.kind,compact,reduced])
  const seatedMembers=useMemo(()=>data.members.map((m,i)=>({...m,seat:m.seat??i})),[data.members])
  const members = useMemo(() => seatedMembers.filter(m => m.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a,b)=>a.seat-b.seat), [seatedMembers, query])
  useEffect(()=>{if(query&&members[0])setMemberPage(Math.floor(members[0].seat/12))},[query,members])
  const projects = useMemo(() => data.projects.filter(p => p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => a.id.localeCompare(b.id)), [data.projects, query])
  const roomCount=Math.max(1,...seatedMembers.map(m=>Math.floor(m.seat/12)+1)),currentRoom=Math.min(memberPage,roomCount-1)
  const pageMembers=useMemo(()=>members.filter(m=>Math.floor(m.seat/12)===currentRoom),[members,currentRoom])
  const pageProjects = useMemo(() => projects.slice(Math.min(projectPage, Math.max(0, Math.ceil(projects.length / 6) - 1)) * 6, (Math.min(projectPage, Math.max(0, Math.ceil(projects.length / 6) - 1)) + 1) * 6),[projects,projectPage])
  const layout = useMemo(() => layoutWorld(pageMembers.length,pageProjects.length,pageMembers.map(m=>m.seat)),[pageMembers,pageProjects.length])
  const tasks = tasksFor(data, selection), progress = completion(tasks)
  const member = selection?.kind === 'member' ? data.members.find(m => m.id === selection.id) : null
  const project = selection?.kind === 'project' ? data.projects.find(p => p.id === selection.id) : null
  const selectedExists = !!member || !!project
  const relatedProjects = member ? data.projects.filter(p => tasks.some(t => t.projectId === p.id)) : []
  const participants = project ? data.members.filter(m => tasks.some(t => t.assigneeId === m.id)) : []
  const activities = data.activity.filter(a => selection?.kind === 'member' ? a.actorId === selection.id : a.resourceId === selection?.id || tasks.some(t => t.id === a.resourceId)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)
  const economy = quality === 'low' || quality === 'auto' && (compact || degraded || navigator.hardwareConcurrency <= 4)
  const select = (value: WorldSelection) => setSelected({ scope: data.scope, value })
  const camera = (type: CameraCommand['type']) => setCommand(v => ({ id: v.id + 1, type }))
  const fail = (reload=false) => { setView('2d');setReloadGraphics(reload); setGraphicsError(reload?'Não foi possível carregar o ambiente 3D. Continue pelo diretório 2D ou use Recarregar 3D para tentar novamente.':'A cena 3D ficou indisponível. Seus dados estão preservados; continue pelo diretório 2D ou tente novamente.') }
  async function complete(id: string) {
    if (!actions.onCompleteTask || pending) return
    const currentScope = data.scope; setPending(id); setActionError('')
    try { await actions.onCompleteTask(id) } catch (e) { if (mounted.current && scope.current === currentScope) setActionError(e instanceof Error ? e.message : 'Não foi possível confirmar a alteração. Tente novamente.') }
    finally { if (mounted.current && scope.current === currentScope) setPending('') }
  }
  function retry() { if(reloadGraphics){window.location.reload();return}if (!supportsWebGL()) { setGraphicsError('WebGL2 continua indisponível neste dispositivo. Use o diretório 2D.'); return } setGraphicsError(''); setAttempt(v => v + 1); setView('3d') }
  const pager = (kind: 'member' | 'project', count: number, page: number, size: number) => count > size && <div className="world-pagination"><button aria-label={kind === 'member' ? 'Estações anteriores' : 'Salas anteriores'} disabled={page === 0} onClick={() => kind === 'member' ? setMemberPage(v => Math.max(0, v - 1)) : setProjectPage(v => Math.max(0, v - 1))}><ChevronLeft size={16} /></button><span>{Math.min(page + 1, Math.ceil(count / size))} / {Math.ceil(count / size)}</span><button aria-label={kind === 'member' ? 'Próximas estações' : 'Próximas salas'} disabled={(page + 1) * size >= count} onClick={() => kind === 'member' ? setMemberPage(v => v + 1) : setProjectPage(v => v + 1)}><ChevronRight size={16} /></button></div>
  return <section className="world-page" aria-labelledby="world-title">
    <header className="world-heading"><div><EvergreenBrand compact/><h1 id="world-title">Evergreen Visão</h1><p>{data.name} <span aria-hidden="true">/</span> {data.source === 'local' ? 'Dados pessoais · sem sincronização' : "Dados compartilhados do espaço de trabalho"}</p></div><div className="world-view-switch" role="group" aria-label="Visualização do Visão"><button aria-pressed={view === '3d'} onClick={retry}>{reloadGraphics?'Recarregar 3D':'Sala 3D'}</button><button aria-pressed={view === '2d'} onClick={() => setView('2d')}>Diretório 2D</button></div></header>
    <div className="vision-portals">{actions.onOpenEconomy&&<button className="vision-vault-link" disabled={opening} onClick={openVault} aria-label="Abrir cofre Evergreen Finanças" title="Evergreen Finanças"><span aria-hidden="true"><Vault size={24}/></span><span><strong>Evergreen Finanças</strong><small>{opening?'Abrindo o cofre…':'Abrir o financeiro · disponível também sem 3D'}</small></span></button>}{actions.onOpenFounders&&<button onClick={actions.onOpenFounders}><strong>Evergreen Fundadores</strong><small>Centro estratégico autorizado</small></button>}</div>
    {data.error && <p role="alert" className="world-notice">{data.error}</p>}
    {data.presenceError && <p role="status" className="world-notice">{data.presenceError} Os estados de presença podem estar indisponíveis.</p>}
    {graphicsError && <p role="status" className="world-notice">{graphicsError}</p>}
    {data.loading ? <div className="world-loading" role="status">Carregando os dados autorizados do espaço…</div> : <div className={`world-layout ${view === '2d' ? 'is-2d' : ''}`}>
      {view === '3d' && <div className="world-stage" ref={renderer} data-testid="world-renderer" data-vault-state={opening?'opening':'closed'}><div className="world-stage-caption"><Compass size={16} /><span>Escritório · sala {currentRoom+1}</span><small>{pageMembers.length} / {data.members.length} pessoas</small></div>
        <WorldBoundary key={attempt} onError={()=>fail(true)}><Suspense fallback={<div className="world-loading" role="status">Preparando a sala 3D…</div>}><WorldScene onOpenFounders={actions.onOpenFounders} vaultOpening={opening} onOpenVault={openVault} onVaultOpened={finishVault} onVaultHover={setVaultHover} members={pageMembers} projects={pageProjects} tasks={data.tasks} selection={selection} onSelect={select} layout={layout} low={economy} visible={visible} reduced={reduced} command={command} labels={labels} metrics={renderer} onFailure={fail} onSlow={() => setDegraded(true)} /></Suspense></WorldBoundary>
        <div className="world-label-layer" aria-hidden="true"><div ref={el=>{labels.current.vault=el}} data-world-node="vault" className="world-node-label vault-label" style={{opacity:vaultHover||opening?1:0}}>Evergreen Finanças</div>{pageMembers.map(m => <div key={m.id} ref={el => { labels.current['member:' + m.id] = el }} data-world-node={'member:' + m.id} className={`world-node-label ${selection?.id === m.id ? 'selected' : ''}`}><i data-presence={m.presence} /><span>{m.name}</span></div>)}{pageProjects.map(p => <div key={p.id} ref={el => { labels.current['project:' + p.id] = el }} data-world-node={'project:' + p.id} className={`world-node-label room-label ${selection?.id === p.id ? 'selected' : ''}`}><span>{p.name}</span></div>)}</div>
        <div className="world-camera-controls" role="group" aria-label="Controles da câmera">{([{ type: 'in', label: 'Aproximar', Icon: Plus }, { type: 'out', label: 'Afastar', Icon: Minus }, { type: 'left', label: 'Mover câmera à esquerda', Icon: ArrowLeft }, { type: 'right', label: 'Mover câmera à direita', Icon: ArrowRight }, { type: 'up', label: 'Mover câmera para cima', Icon: ArrowUp }, { type: 'down', label: 'Mover câmera para baixo', Icon: ArrowDown }, { type: 'reset', label: 'Recentralizar câmera', Icon: RotateCcw }] as const).map(({ type, label, Icon }) => <button key={type} title={label} aria-label={label} onClick={() => camera(type)}><Icon size={17} /></button>)}</div>
        <div className="world-stage-footer"><span>Arraste para mover · gesto de pinça ou roda para zoom</span><label>Qualidade<select aria-label="Qualidade gráfica" value={quality} onChange={e => { setQuality(e.target.value as typeof quality); setDegraded(false) }}><option value="auto">Automática{degraded ? ' · econômica' : ''}</option><option value="low">Econômica</option><option value="high">Detalhada</option></select></label></div>
      </div>}
      <aside className={`world-inspector ${selectedExists?'has-selection':''}`} aria-label="Diretório e detalhes do Visão">
        <div className="world-directory"><label className="world-search"><Search size={16} /><span className="sr-only">Buscar pessoas e projetos</span><input placeholder="Buscar pessoas e projetos" value={query} onChange={e => { setQuery(e.target.value); setMemberPage(0); setProjectPage(0) }} /></label>
          <p>Entrada e corredor central livres · cofre permanente no canto. As estações mantêm seus lugares nesta sala.</p><h2>Estações <span>{members.length}</span></h2><div className="world-station-list">{pageMembers.map(m => <button key={m.id} aria-label={`Ver estação de ${m.name}`} aria-pressed={selection?.kind === 'member' && selection.id === m.id} onClick={() => select({ kind: 'member', id: m.id })}><span className="world-initials" aria-hidden="true">{m.name.slice(0, 2).toLocaleUpperCase()}</span><span><strong>{m.name}</strong><small><i data-presence={m.presence} />{presenceLabels[m.presence]}</small></span><ChevronRight size={15} /></button>)}</div>{!members.length && <p className="world-empty">{query ? 'Nenhuma pessoa corresponde à busca.' : "As estações aparecem quando pessoas entram neste espaço de trabalho."}</p>}{pager('member', roomCount*12, currentRoom, 12)}
          <h2>Salas de projetos <span>{projects.length}</span></h2><div className="world-project-list">{pageProjects.map(p => <button key={p.id} aria-label={`Ver sala de ${p.name}`} aria-pressed={selection?.kind === 'project' && selection.id === p.id} onClick={() => select({ kind: 'project', id: p.id })}><Layers3 size={16} /><span>{p.name}</span><ChevronRight size={15} /></button>)}</div>{!projects.length && <p className="world-empty">{query ? 'Nenhum projeto corresponde à busca.' : "Crie um projeto no Trabalho para abrir sua sala aqui."}</p>}{pager('project', projects.length, projectPage, 6)}
        </div>
        <section className="world-details" ref={details} tabIndex={-1} aria-label="Detalhes da seleção" aria-live="polite">
          {selectedExists ? <><header><div><h2>{member?.name ?? project?.name}</h2><p>{member ? presenceLabels[member.presence] : 'Sala de projeto'}</p>{member&&<><p>{member.jobTitle||'Cargo não informado'} · {member.company||data.name}</p>{member.avatarUrl?<img src={member.avatarUrl} alt={'Avatar de '+member.name} width={48} height={48}/>:<span className="world-initials" aria-label={'Avatar de '+member.name}>{member.name.slice(0,2).toLocaleUpperCase()}</span>}<p>Foco atual: {member.focus||'Nenhuma sessão compartilhada'}</p></>}</div><button aria-label="Fechar detalhes" onClick={() => select(null)}><X size={17} /></button></header>{project?.description && <p>{project.description}</p>}
            <div className="world-progress"><span>{tasks.filter(t => t.status === 'done').length} de {tasks.length} tarefas concluídas</span><strong>{progress === null ? 'Sem tarefas' : progress + '%'}</strong>{progress !== null && <progress aria-label="Progresso das tarefas selecionadas" max={100} value={progress} />}</div>
            {actionError && <p role="alert" className="world-notice">{actionError}</p>}
            <h3>Tarefas atribuídas</h3><ul className="world-task-list">{tasks.slice(0, taskLimit).map(t => <li key={t.id}><button onClick={() => actions.onOpenTask(t.id)}><strong>{t.title}</strong><small>{statusNames[t.status] ?? t.status}</small></button>{t.canComplete && actions.onCompleteTask && <button aria-label={`Concluir ${t.title}`} disabled={!!pending} onClick={() => void complete(t.id)}>{pending === t.id ? 'Salvando…' : <Check size={17} />}</button>}{t.status !== 'done' && actions.onFocusTask && t.assigneeId === data.userId && <button aria-label={`Iniciar foco em ${t.title}`} onClick={() => actions.onFocusTask?.(t.id)}><Focus size={17} /></button>}</li>)}</ul>{!tasks.length && <p className="world-empty">Nenhuma tarefa atribuída nesta seleção.</p>}{tasks.length > taskLimit && <button onClick={() => setTaskLimit(v => v + 12)}>Mostrar mais tarefas</button>}
            {member && <><h3>Projetos associados às tarefas</h3>{relatedProjects.map(p => <button className="world-text-action" key={p.id} onClick={() => select({ kind: 'project', id: p.id })}>{p.name}<ChevronRight size={14} /></button>)}{!relatedProjects.length && <p className="world-empty">Nenhum projeto associado.</p>}</>}
            {project && <><button className="world-primary" onClick={() => actions.onOpenProject(project.id)}>Abrir projeto no Trabalho</button><h3>Participantes pelas tarefas</h3><p>{participants.length ? participants.map(p => p.name).join(', ') : 'Nenhuma pessoa atribuída às tarefas deste projeto.'}</p></>}
            <h3>Atividade recente</h3>{activities.length ? <ul className="world-activity-list">{activities.map(a => <li key={a.id}><span>{a.title}</span><time dateTime={a.at}>{new Date(a.at).toLocaleString('pt-BR')}</time></li>)}</ul> : <p className="world-empty">Nenhuma atividade carregada nesta seleção.</p>}
            {!!data.channels.length && actions.onOpenChannel && <><h3>Conversas do espaço de trabalho</h3><p className="world-empty">Canais aos quais você tem acesso. Não há vínculo automático com este projeto.</p>{data.channels.map(c => <button className="world-text-action" key={c.id} onClick={() => actions.onOpenChannel?.(c.id)}><Hash size={14} />{c.name}</button>)}</>}
          </> : <div className="world-detail-empty"><Compass size={24} /><h2>Trabalho real, outra perspectiva.</h2><p>Escolha uma estação ou sala para ver tarefas, projetos e atividade. O diretório oferece as mesmas ações da cena, inclusive por teclado.</p>{actions.onCreateTask && <button className="world-primary" onClick={actions.onCreateTask}>Criar tarefa no Trabalho</button>}</div>}
        </section>
      </aside>
    </div>}
  </section>
}
