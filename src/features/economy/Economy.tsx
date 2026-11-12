import {DecisionKpis,type Due} from './DecisionKpis'
import './decision-kpis.css'
import {ActionScope,useSensitiveDraft} from '../layout/sensitiveScope'
import { AppSelect } from '../appearance/AppSelect'
import { Dialog } from '../productivity/Dialog'
import {NotificationCenter} from '../people/NotificationCenter'
import {lazy,Suspense,type ReactNode} from 'react'
const FinancialAnalysis=lazy(()=>import('../holding/FinancialAnalysis'))
import {LedgerApprovals} from '../organizations/LedgerApprovals'
import {useOSResource} from '../organizations/model'
import {codeLabel} from '../../i18n/pt-BR'
import {EvergreenBrand} from '../../components/EvergreenBrand'
import {useEffect,useRef,useState,type FormEvent} from 'react'
import {ArrowLeft,ArrowUpRight,Building2,CalendarDays,ChevronDown,Landmark,Plus,RefreshCw,ShieldCheck} from 'lucide-react'
import {checked,db,failure} from '../../collaboration/client'
import {Reauthenticate} from '../identity/Reauthenticate'
import {cents,money} from './money'
import './economy.css'
type Company={id:string;name:string;currency:string;role:string}
type Account={id:string;company_id:string;name:string;kind:string;currency:string;balance:string}
type Target={id:string;company_id:string;name:string;company_name:string;workspace_name:string;currency:string}
type Budget={id:string;company_id:string;month:string;income_cents:string;expense_cents:string;version:number}
type Snapshot={companies:Company[];accounts:Account[];goals:{id:string;account_id:string;name:string;target_cents:string;due_on:string|null}[];flows:{company_id:string;income:string;expense:string}[];budgets:Budget[];can_create:boolean}
type Entry={id:string;event_id:string;account_id:string;cents:string;kind:string;description:string;created_at:string;happened_on:string;reversed:boolean;can_reverse:boolean}
const tabs=['Visão Geral','Empresas','Cofres','Movimentações','Relatórios','Planejamento'] as const

const periodDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
type EconomyPeriod = { from: string; to: string; currency: string }

function EconomyFilters({ period, currencies, onApply }: {
 period: EconomyPeriod
 currencies: string[]
 onApply: (period: EconomyPeriod) => void
}) {
 const disclosure = useRef<HTMLDetailsElement>(null)
 const summary = useRef<HTMLElement>(null)
 const [error, setError] = useState('')

 function apply(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const data = new FormData(event.currentTarget)
  const from = String(data.get('from') ?? '')
  const to = String(data.get('to') ?? '')
  const currency = String(data.get('currency') ?? 'all')
  if (from > to) {
   setError('A data final precisa ser igual ou posterior à inicial.')
   return
  }
  setError('')
  if (disclosure.current) disclosure.current.open = false
  summary.current?.focus()
  onApply({ from, to, currency })
 }

 return <div className="economy-filter-bar">
  <details className="economy-filter-disclosure" ref={disclosure}>
   <summary ref={summary}>
    <CalendarDays size={17} aria-hidden="true"/>
    <span><strong>Período e moeda</strong><small>{periodDate.formatRange(new Date(period.from), new Date(period.to))} · {period.currency === 'all' ? 'Todas as moedas' : period.currency}</small></span>
    <ChevronDown size={15} aria-hidden="true"/>
   </summary>
   <form className="economy-filters" onSubmit={apply} key={`${period.from}/${period.to}/${period.currency}`}>
    <label>De<input type="date" name="from" defaultValue={period.from} required aria-invalid={!!error} aria-describedby={error ? 'economy-period-error' : undefined}/></label>
    <label>Até<input type="date" name="to" defaultValue={period.to} required aria-invalid={!!error} aria-describedby={error ? 'economy-period-error' : undefined}/></label>
    <label>Moeda<AppSelect name="currency" defaultValue={period.currency}><option value="all">Todas · separadas</option>{currencies.map(currency=><option key={currency}>{currency}</option>)}</AppSelect></label>
    <button type="submit">Aplicar filtros</button>
    {error&&<p role="alert" id="economy-period-error">{error}</p>}
   </form>
  </details>
  <small className="economy-access"><ShieldCheck size={15} aria-hidden="true"/> Acesso por empresa</small>
 </div>
}


export default function Economy({onBoard,onOperations,workspaceId,name,email,onBack,context,embedded=false}:{workspaceId:string;name:string;email:string;onBoard?:()=>void;onOperations?:()=>void;onBack:()=>void;context?:ReactNode;embedded?:boolean}){
 const [tab,setTab]=useState<typeof tabs[number]>('Visão Geral'),[data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[form,setFormState]=useState('')
 const Container=embedded?'section':'main'
 const [transferReview,setTransferReview]=useState<{body:Record<string,unknown>;origin:string;destination:string;currency:string;workspace:string;permission:string}|null>(null)
 const [accessReview,setAccessReview]=useState<Record<string,unknown>|null>(null)
 useSensitiveDraft(['transfer','grant'].includes(form)||!!transferReview||!!accessReview,name,()=>{setForm('');setTransferReview(null);setAccessReview(null);setApprovalNeeded(null);retry.current=null;setReauth(false)},busy)
 const editor=useRef<HTMLElement>(null),editorTrigger=useRef<HTMLElement|null>(null)
 const historyTab=useRef<HTMLButtonElement>(null)
 const companyToFocus=useRef<string|null>(null)
 function setForm(next:string){if(next)editorTrigger.current=document.activeElement as HTMLElement;setFormState(next)}
 useEffect(()=>{if(form){const node=editor.current;node?.querySelector<HTMLElement>('h2')?.focus({preventScroll:true});node?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}else if(editorTrigger.current?.isConnected){editorTrigger.current.focus();editorTrigger.current=null}},[form])
 useEffect(()=>{
  if(tab!=='Empresas'||!companyToFocus.current) return
  document.getElementById('economy-company-'+companyToFocus.current)?.focus()
  companyToFocus.current=null
 },[tab])
 const [approvalNeeded,setApprovalNeeded]=useState<{kind:string;data:Record<string,unknown>;requested?:boolean}|null>(null)
 const [people,setPeople]=useState<{rows:{user_id:string;display_name:string}[];loading:boolean;error:string}>({rows:[],loading:false,error:''})
 const [peopleRetry,setPeopleRetry]=useState(0)
 const lastSubmission=useRef<{fingerprint:string;id:string;receiptPath?:string}|null>(null),budgetVersions=useRef<Budget[]>([])
 useEffect(()=>{if(form==='budget')budgetVersions.current=data?.budgets||[]},[form])
 const today=new Date().toLocaleDateString('en-CA')
 const [period,setPeriod]=useState<EconomyPeriod>(()=>({from:today.slice(0,7)+'-01',to:today,currency:'all'}))
 const {from,to,currency}=period
 const [reauth,setReauth]=useState(false),retry=useRef<(()=>Promise<void>)|null>(null),scope=useRef(workspaceId),serial=useRef(0)
 scope.current=workspaceId
 const query = {p_workspace:workspaceId,p_from:from,p_to:to}
 const operations=useOSResource<{commitments:Due[];can_finance:boolean;approvals:{status:string;consumed:boolean;deadline:string}[]}>('eg_os_operations',{p_workspace:workspaceId},!!workspaceId&&tab==='Visão Geral')
 const history = useOSResource<Entry[]>('eg_economy_history', query, !!workspaceId && (tab==='Movimentações'||tab==='Visão Geral'))
 const transfer = useOSResource<Target[]>('eg_economy_targets', {p_workspace:workspaceId}, !!workspaceId && form==='transfer')
 const [earlier,setEarlier]=useState<{firstPage:Entry[];rows:Entry[];hasMore:boolean}|null>(null)
 const pages=earlier?.firstPage===history.data?earlier:null
 const entries=pages?[...pages.firstPage,...pages.rows]:history.data??[]
 const hasMore=pages?.hasMore??entries.length>=50
 async function loadEarlier(){
  const firstPage=history.data,last=entries.at(-1)
  if(!firstPage||!last)return
  const more=await checked(db().rpc('eg_economy_history',{...query,p_before:last.created_at,p_before_id:last.id})) as Entry[]
  setEarlier({firstPage,rows:[...(pages?.rows??[]),...more],hasMore:more.length>=50})
 }
 const loadRef = useRef<() => Promise<void>>(async()=>{})
 const refreshing = useRef(false)
 const busyRef = useRef(busy)
 busyRef.current = busy
 const scopeQuery = useRef('')
 scopeQuery.current = JSON.stringify(query)
 async function load(refreshDetails = true) {
  if (!workspaceId) { setBusy(false); return }
  const n = ++serial.current
  const activeQuery = JSON.stringify(query)
  refreshing.current = true
  setBusy(true)
  setError('')
  try {
   const snapshot = await checked(db().rpc('eg_economy_snapshot', query)) as Snapshot
   if (n !== serial.current || activeQuery !== scopeQuery.current) return
   setData(snapshot)
   if (refreshDetails && (tab==='Movimentações'||tab==='Visão Geral')) history.refresh()
  } catch (e) {
   if (n === serial.current && activeQuery === scopeQuery.current) {
    setError(failure(e))
    if (e && typeof e === 'object' && 'code' in e && ['42501','SESSION_REVOKED','SESSION_REQUIRED'].includes(String(e.code))) setData(null)
   }
  } finally {
   if (n === serial.current) { refreshing.current = false; setBusy(false) }
  }
 }
 loadRef.current = load
 useEffect(()=>{setData(null);setForm('');setTransferReview(null);setApprovalNeeded(null);retry.current=null;setReauth(false);void load(false);return()=>{serial.current++}},[workspaceId,from,to])
 useEffect(()=>{
  const check = () => { if (!document.hidden && !busyRef.current && !refreshing.current) void loadRef.current() }
  const timer = setInterval(check,30000)
  window.addEventListener('focus',check)
  return ()=>{clearInterval(timer);window.removeEventListener('focus',check)}
 },[])
 useEffect(()=>{
  if (!workspaceId || form!=='grant') return
  let live=true
  setPeople({rows:[],loading:true,error:''})
  void checked(db().from('eg_members').select('user_id,display_name').eq('workspace_id',workspaceId))
   .then(rows=>{if(live)setPeople({rows:rows as typeof people.rows,loading:false,error:''})})
   .catch(e=>{if(live)setPeople({rows:[],loading:false,error:failure(e)})})
  return ()=>{live=false}
 },[workspaceId,form,peopleRetry])
 async function run(fn:()=>Promise<void>){if(busy)return;setBusy(true);setError('');setNotice('');try{await fn()}catch(e){const msg=failure(e);if(msg.includes('REAUTH_REQUIRED')||(e&&typeof e==='object'&&'code'in e&&e.code==='REAUTH_REQUIRED')||(e&&typeof e==='object'&&'status'in e&&e.status===428)){retry.current=fn;setReauth(true)}else setError(msg)}finally{setBusy(false)}}
 async function action(type:string,payload:Record<string,unknown>){const w=workspaceId;try{if(payload.commitment_id)await checked(db().rpc('eg_os_commitment',{p_workspace:w,p_action:'settle',p_id:payload.commitment_id,p_data:{request_id:payload.request_id,approval_id:payload.approval_id}}));else await checked(db().rpc(context&&['income','expense','transfer','reversal'].includes(type)?'eg_financial_action':'eg_economy_action',{p_workspace:w,p_action:type,p_data:payload}));}catch(e){if(failure(e).includes('FINANCIAL_APPROVAL_REQUIRED'))setApprovalNeeded({kind:type,data:payload});throw e}if(scope.current===w){setForm('');setApprovalNeeded(null);lastSubmission.current=null;await loadRef.current();setNotice('Registro salvo no livro interno da empresa.')}}
 function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const fields=new FormData(e.currentTarget),receipt=fields.get('receipt');fields.delete('receipt')
  void run(async()=>{
   const body:Record<string,unknown>=Object.fromEntries(fields.entries())
   for(const key of ['cents','target_cents','income_cents','expense_cents'])if(body[key]!==undefined)body[key]=String(body[key]).trim()==='0'&&key!=='cents'&&key!=='target_cents'?'0':cents(String(body[key]))
   if(form==='budget'){const old=budgetVersions.current.find(b=>b.company_id===body.company_id&&b.month===body.month);if(old)body.version=old.version}
   let receiptHash=''
   const digest=async(blob:Blob)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('')
   if(receipt instanceof File&&receipt.size){if(receipt.size>3145728||!['application/pdf','image/png','image/jpeg','image/webp'].includes(receipt.type))throw new Error('Use um comprovante PDF, PNG, JPEG ou WebP de até 3 MB.');receiptHash=await digest(receipt)}
   const fingerprint=JSON.stringify({form,body,workspaceId,receiptHash})
   if(lastSubmission.current?.fingerprint!==fingerprint)lastSubmission.current={fingerprint,id:crypto.randomUUID()}
   const submission=lastSubmission.current;body.request_id=submission.id
   if(receipt instanceof File&&receipt.size){
    if(!submission.receiptPath){
     const account=accounts.find(a=>a.id===body.account_id);if(!account)throw new Error('Selecione a conta do comprovante.')
     const user=await checked(db().auth.getSession());if(!user.session?.user)throw new Error('Entre novamente antes de anexar o comprovante.')
     const path=account.company_id+'/'+user.session.user.id+'/'+submission.id+'-'+receiptHash+'.'+({'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[receipt.type])
     const upload=await db().storage.from('eg-finance-receipts').upload(path,receipt,{upsert:false,contentType:receipt.type})
     if(upload.error){if(String(upload.error.message).toLowerCase().includes('exists')||('statusCode'in upload.error&&String(upload.error.statusCode)==='409')){const existing=await checked(db().storage.from('eg-finance-receipts').download(path));if(await digest(existing)!==receiptHash)throw new Error('O comprovante existente difere do arquivo escolhido. Revise antes de enviar novamente.')}else throw upload.error}
     submission.receiptPath=path
    }
    body.receipt_path=submission.receiptPath
   }
   if(form==='transfer'){
    const origin=accounts.find(account=>account.id===body.account_id),destination=transfer.data?.find(account=>account.id===body.to_account_id)
    if(!origin||!destination)throw new Error('Selecione uma origem e um destino autorizados.')
    if(origin.id===destination.id)throw new Error('Escolha contas diferentes para origem e destino.')
    if(origin.currency!==destination.currency)throw new Error('Escolha contas na mesma moeda. Este lançamento não faz câmbio.')
    setTransferReview({body,origin:companyLabel(origin.company_id)+' · '+origin.name,destination:destination.company_name+' · '+destination.name,currency:origin.currency,workspace:workspaceId,permission:companies.find(company=>company.id===origin.company_id)?.role||'Não informada'})
   }else if(form==='grant')setAccessReview(body);else await action(form,body)
  })
 }
 const companies=data?.companies||[],accounts=data?.accounts||[],filtered=accounts.filter(a=>currency==='all'||a.currency===currency),admins=companies.filter(c=>c.role==='admin'),editable=accounts.filter(a=>companies.find(c=>c.id===a.company_id)?.role!=='viewer')
 const pendingRecords=Array.isArray(operations.data?.approvals)&&Array.isArray(operations.data?.commitments)?operations.data.approvals.filter(row=>!row.consumed&&['open','approved'].includes(row.status)&&Date.parse(row.deadline)>Date.now()).length+operations.data.commitments.filter(row=>row.state==='open').length:null
 const visibleCompanies=companies.filter(company=>currency==='all'||company.currency===currency)
 const companyLabel=(id:string)=>companies.find(c=>c.id===id)?.name||'Empresa'
 const selectCompany=<label>Empresa<AppSelect name="company_id" required>{admins.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</AppSelect></label>
 const selectAccount=(name:string,label:string)=><label>{label}<AppSelect aria-label={label} name={name} required>{(name==='to_account_id'?transfer.data??[]:editable).map(a=><option key={a.id} value={a.id}>{'company_name'in a?String(a.company_name):companyLabel(a.company_id)} · {a.name} ({a.currency})</option>)}</AppSelect></label>
 return <Container tabIndex={0} aria-label="Finanças" className={embedded?"economy-page economy-embedded":"economy-page"}>{!embedded&&<header className="economy-header economy-toolbar">
   <button className="economy-back" aria-label="Voltar ao Mapa" title="Voltar ao Mapa" onClick={onBack}><ArrowLeft size={17}/><span>Voltar ao Mapa</span></button>
   <div className="economy-toolbar-brand"><EvergreenBrand compact symbol/><div><strong>Finanças</strong><small>{name}</small></div></div>
   <div className="economy-toolbar-actions"><NotificationCenter/>{onOperations&&<button onClick={onOperations}>Compromissos e aprovações</button>}</div>
 </header>}{!embedded&&context}<div className="economy-container"><div className="economy-intro"><div><h1>Finanças</h1><p>Saldo e movimentações da empresa ativa.</p></div><button aria-label="Atualizar registros" disabled={busy} onClick={()=>void load()}><RefreshCw size={16}/>Atualizar</button></div><nav className="economy-tabs" aria-label="Evergreen Finanças">{tabs.map(t=><button key={t} ref={t==='Movimentações'?historyTab:undefined} aria-current={t===tab?'page':undefined} onClick={()=>{setTab(t);setForm('');setTransferReview(null)}}>{t}</button>)}</nav><EconomyFilters key={workspaceId} period={period} currencies={[...new Set([...companies.map(company=>company.currency), ...(currency==='all'?[]:[currency])])].sort()} onApply={setPeriod}/>
 {approvalNeeded&&<section className="economy-notice" aria-label="Autorização financeira necessária"><h2>Aprovação financeira necessária</h2><p>Solicite autorização para a conta, destino e valor deste lançamento. Os dados serão apresentados ao conselho da empresa.</p>{!approvalNeeded.requested?<button disabled={busy} onClick={()=>void run(async()=>{const payload:Record<string,unknown>={...approvalNeeded.data,action:'authorization',transaction_kind:approvalNeeded.kind};await checked(db().rpc('eg_os_propose',{p_workspace:workspaceId,p_group:null,p_title:'Autorizar: '+String(payload.description),p_body:'Solicitação a partir do formulário do Cofre. Nenhuma movimentação bancária será executada.',p_kind:'finance',p_payload:payload,p_request:payload.request_id}));setApprovalNeeded(v=>v?{...v,requested:true}:null);setNotice('Solicitação registrada. Após a votação, use Autorizações de lançamento para registrar a operação.')} )}>Solicitar aprovação deste lançamento</button>:<p role="status">Solicitação já registrada para este lançamento.</p>}{onBoard&&<button onClick={onBoard}>Abrir conselho da empresa</button>}</section>}
 {error&&<p role="alert" className="economy-notice">{error}<button onClick={()=>void load()}>Tentar novamente</button></p>}{notice&&<p role="status" className="economy-notice">{notice}</p>}{busy&&!data&&<section aria-label="Carregando indicadores" className="economy-kpis" role="status">{Array.from({length:4},(_,index)=><div key={index} className="economy-kpi economy-skeleton">Consultando registros autorizados…</div>)}</section>}
 {!data&&!busy?<section className="economy-empty"><Landmark/><h2>{workspaceId?"Finanças indisponível":"Escolha um espaço de trabalho autorizado"}</h2><p>{workspaceId?'A configuração do banco ou sua conexão precisa ser verificada. Nenhum saldo foi estimado.':'Entre com sua conta da empresa para acessar o financeiro.'}</p>{!workspaceId&&<a href='/login?next=/economy'>Entrar com a conta da empresa</a>}</section>:data&&<>
 {tab==='Visão Geral'&&<>
  <div className="economy-quick-actions"><button className="primary" disabled={!editable.length||busy} onClick={()=>{setTab('Movimentações');setForm('transfer')}}>Preparar transferência <ArrowUpRight size={16}/></button>{onOperations&&<button className="economy-pending" onClick={onOperations}>{operations.loading?'Consultando pendências…':operations.error?'Pendências indisponíveis':pendingRecords!==null?pendingRecords+(pendingRecords===1?' pendência':' pendências')+' · Compromissos e aprovações':'Pendências não informadas'}</button>}</div>
  <DecisionKpis companies={visibleCompanies} accounts={filtered} flows={data.flows} budgets={data.budgets} from={from} to={to} commitments={Array.isArray(operations.data?.commitments)?operations.data.commitments:null} canManage={operations.data?.can_finance===true} error={operations.error} loading={operations.loading} retry={operations.refresh} onBudget={()=>{setTab('Planejamento');setForm('')}} onOperations={onOperations}/>
  {!accounts.length&&<section className="economy-empty"><h2>Seu financeiro começa aqui</h2><p>{data.can_create?'Cadastre a empresa e sua primeira conta.':'Peça acesso ao administrador financeiro da empresa.'}</p><button disabled={!data.can_create} onClick={()=>{setTab('Empresas');setForm(companies.length?'account':'company')}}>Cadastrar primeira conta</button></section>}
  <section className="economy-section economy-recent-ledger" aria-label="Movimentações recentes">
   <header><div><h2>Movimentações</h2><p>Lançamentos no período · contas autorizadas</p></div><button onClick={()=>{setTab('Movimentações');setForm('');historyTab.current?.focus()}}>Ver todas as movimentações <ArrowUpRight size={16}/></button></header>
   {history.loading?<p role="status">Carregando movimentações…</p>:history.error?<div role="alert"><p>Não foi possível carregar as movimentações: {history.error}</p><button onClick={history.refresh}>Tentar novamente</button></div>:<>
    <ul className="economy-recent-list">{entries.filter(entry=>filtered.some(account=>account.id===entry.account_id)).slice(0,5).map(entry=>{
     const account=accounts.find(account=>account.id===entry.account_id)!
     return <li key={entry.id}><div><strong>{entry.description}</strong><small><time dateTime={entry.happened_on}>{periodDate.format(new Date(entry.happened_on))}</time> · {companyLabel(account.company_id)} / {account.name} · {codeLabel(entry.kind)}{entry.reversed?' · estornado':''}</small></div><b data-negative={BigInt(entry.cents)<0n}>{BigInt(entry.cents)>0n?'+ ':''}{money(entry.cents,account.currency)}</b></li>
    })}</ul>
    {!entries.some(entry=>filtered.some(account=>account.id===entry.account_id))&&<p>Nenhuma movimentação neste período. Altere o intervalo para consultar outros registros.</p>}
   </>}
  </section>
  <section className="economy-section economy-overview-companies">
   <header><div><h2>Empresas em perspectiva</h2><p>Consulte as contas e os acessos de cada empresa.</p></div><div>
    {context&&<button onClick={()=>{setTab('Relatórios');setForm('')}}>Abrir análise financeira <ArrowUpRight size={16}/></button>}
    {data.can_create&&<button onClick={()=>{setTab('Empresas');setForm('company')}}><Plus size={16}/>Cadastrar empresa</button>}
   </div></header>
   {visibleCompanies.map(c=><div className="economy-overview-company" key={c.id}>
    <span className="economy-company-icon"><Building2 size={18} aria-hidden="true"/></span>
    <div><strong>{c.name}</strong><small>{codeLabel(c.role)}</small></div>
    <b>{money(accounts.filter(a=>a.company_id===c.id).reduce((n,a)=>n+BigInt(a.balance),0n),c.currency)}</b>
    <button aria-label={'Ver '+c.name} onClick={()=>{companyToFocus.current=c.id;setTab('Empresas');setForm('')}}><ArrowUpRight size={17}/></button>
   </div>)}
  </section>
 </>}
 {tab==='Empresas'&&<section className="economy-section"><header><h2>Empresas e contas</h2><div>{data.can_create&&<button onClick={()=>setForm('company')}>Cadastrar empresa</button>}{!!admins.length&&<><button onClick={()=>setForm('account')}>Nova conta</button><button onClick={()=>setForm('grant')}>Gerenciar acesso</button></>}</div></header>{companies.map(c=><article className="economy-company" key={c.id}><h3 tabIndex={-1} id={`economy-company-${c.id}`}>{c.name} <small>{c.currency} · {codeLabel(c.role)}</small></h3>{accounts.filter(a=>a.company_id===c.id).map(a=><div className="economy-row" key={a.id}><span>{a.name}{a.kind==='reserve'?' · reserva':''}</span><strong>{money(a.balance,c.currency)}</strong></div>)}{!accounts.some(a=>a.company_id===c.id)&&<p>Nenhuma conta cadastrada.</p>}</article>)}{!companies.length&&<p>Nenhuma empresa financeira autorizada.</p>}</section>}
 {tab==='Cofres'&&<section className="economy-section"><header><h2>Reservas com propósito</h2><button disabled={!admins.length} onClick={()=>setForm('goal')}>Criar cofre</button></header><p>Uma reserva é uma conta do livro. Ela já está incluída no saldo consolidado.</p>{data.goals.map(g=>{const a=accounts.find(a=>a.id===g.account_id);if(!a)return null;const ratio=Number(BigInt(a.balance)*100n/BigInt(g.target_cents));return <article className="economy-company" key={g.id}><h3>{g.name}</h3><p>{companyLabel(a.company_id)} · {g.due_on||'Sem prazo'}</p><strong>{money(a.balance,a.currency)} <small>de {money(g.target_cents,a.currency)}</small></strong><progress max={100} value={Math.min(100,ratio)} aria-label={'Progresso de '+g.name}/><span>{ratio}% da meta</span></article>})}{!data.goals.length&&<p>Nenhum cofre cadastrado. Para reservar valores, transfira entre as contas autorizadas.</p>}</section>}
 {tab==='Movimentações'&&<LedgerApprovals key={workspaceId+String(approvalNeeded?.requested)} workspace={workspaceId} email={email} onRecord={action} onBoard={onBoard}/>}
 {tab==='Movimentações'&&<section className="economy-section"><header><h2>Livro de movimentações</h2><div>{(['income','expense','transfer'] as const).map((a,i)=><button key={a} disabled={!editable.length} onClick={()=>setForm(a)}>{['Receita','Despesa','Transferência'][i]}</button>)}</div></header><p>Transferências e estornos mantêm as duas pontas no mesmo evento. Registros são imutáveis.</p>{history.loading&&<p role="status">Carregando movimentações…</p>}{history.error&&<p role="alert">{history.error} <button onClick={history.refresh}>Tentar novamente</button></p>}{entries.filter(e=>filtered.some(a=>a.id===e.account_id)).map(e=>{const a=accounts.find(a=>a.id===e.account_id)!;return <article className="economy-entry" key={e.id}><div><strong>{e.description}</strong><small>{e.happened_on} · {companyLabel(a.company_id)} / {a.name} · {codeLabel(e.kind)}{e.reversed?' · estornado':''}</small></div><b data-negative={BigInt(e.cents)<0n}>{money(e.cents,a.currency)}</b>{e.can_reverse&&e.kind!=='reversal'&&!e.reversed&&<button disabled={busy} onClick={()=>{if(confirm('Estornar o evento inteiro? Transferências serão estornadas nas duas contas.')){const body={event_id:e.event_id,description:'Estorno: '+e.description,request_id:crypto.randomUUID()};void run(()=>action('reversal',body))}}}>Estornar</button>}</article>})}{history.data?.length===0&&<p>Nenhuma movimentação no período.</p>}{hasMore&&<button disabled={busy} onClick={()=>void run(loadEarlier)}>Carregar anteriores</button>}</section>}
 {tab==='Relatórios'&&context&&<Suspense fallback={<p role="status">Abrindo relatório…</p>}><FinancialAnalysis embedded scope={{group:null,workspace:workspaceId}} email={email}/></Suspense>}{tab==='Relatórios'&&!context&&<section className="economy-section"><header><h2>Receitas e despesas realizadas</h2></header><p>Valores líquidos de estornos no período selecionado. Transferências não são receita nem despesa.</p>{companies.filter(c=>currency==='all'||c.currency===currency).map(c=>{const f=data.flows.find(f=>f.company_id===c.id);const income=BigInt(f?.income||'0'),expense=BigInt(f?.expense||'0'),max=income>expense?income:expense;return <article className="economy-company" key={c.id}><h3>{c.name}</h3><figure aria-label={'Receitas e despesas de '+c.name}><div className="economy-bar"><span>Receitas</span><i style={{width:(max>0n?Number(income*100n/max):0)+'%'}}/><b>{money(income,c.currency)}</b></div><div className="economy-bar expense"><span>Despesas</span><i style={{width:(max>0n?Number(expense*100n/max):0)+'%'}}/><b>{money(expense,c.currency)}</b></div><figcaption>Resultado: {money(income-expense,c.currency)}</figcaption></figure></article>})}{!companies.length&&<p>Nenhuma empresa autorizada para análise.</p>}</section>}
 {tab==='Planejamento'&&<section className="economy-section"><header><h2>Orçamentos e projeções</h2><button disabled={!admins.length} onClick={()=>setForm('budget')}>Definir orçamento mensal</button></header><p>Estimativas manuais. Não são saldos realizados nem previsão automática.</p>{data.budgets.map(b=>{const c=companies.find(c=>c.id===b.company_id)!;return <article className="economy-company" key={b.id}><h3>{c.name} · {b.month.slice(0,7)}</h3><p>Receita prevista: {money(b.income_cents,c.currency)}</p><p>Despesa prevista: {money(b.expense_cents,c.currency)}</p><strong>Resultado estimado: {money(BigInt(b.income_cents)-BigInt(b.expense_cents),c.currency)}</strong></article>})}{!data.budgets.length&&<p>Nenhum orçamento definido no período.</p>}</section>}
 {form&&<section ref={editor} className="economy-editor" aria-labelledby="economy-form-title"><header><h2 tabIndex={-1} id="economy-form-title">{{company:'Cadastrar empresa',account:'Nova conta',goal:'Novo cofre',budget:'Orçamento mensal',grant:'Acesso financeiro',income:'Registrar receita',expense:'Registrar despesa',transfer:'Transferir entre contas'}[form]}</h2><button onClick={()=>setForm('')}>Fechar</button></header><form onSubmit={submit} key={form}>
 {form==='company'?<><label>Nome<input name="name" maxLength={100} required/></label><label>Moeda<AppSelect name="currency"><option>BRL</option><option>USD</option><option>EUR</option></AppSelect></label></>:['account','goal','budget','grant'].includes(form)?selectCompany:selectAccount('account_id',form==='transfer'?'Conta de origem':'Conta')}
 {['account','goal'].includes(form)&&<label>Nome<input name="name" required maxLength={100}/></label>}
 {form==='goal'&&<><label>Meta em moeda da conta<input name="target_cents" inputMode="decimal" required placeholder="1000,00"/></label><label>Prazo<input name="due_on" type="date"/></label></>}
 {form==='grant'&&<><label>Pessoa da empresa<AppSelect aria-label="Pessoa da empresa" name="user_id" required>{people.rows.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</AppSelect></label><label>Permissão<AppSelect name="role"><option value="viewer">Visualizar</option><option value="editor">Lançar movimentações</option><option value="admin">Administrar financeiro</option><option value="remove">Remover acesso</option></AppSelect></label></>}
 {form==='budget'&&<><label>Mês<input name="month" type="date" required defaultValue={from.slice(0,7)+'-01'}/><small>Use o primeiro dia do mês.</small></label><label>Receita estimada<input name="income_cents" inputMode="decimal" required defaultValue="0"/></label><label>Despesa estimada<input name="expense_cents" inputMode="decimal" required defaultValue="0"/></label></>}
 {form==='transfer'&&<>{selectAccount('to_account_id','Conta de destino')}{transfer.loading&&<p role="status">Carregando destinos autorizados…</p>}{transfer.error&&<p role="alert">{transfer.error} <button type="button" onClick={transfer.refresh}>Tentar novamente</button></p>}</>}
 {form==='grant'&&people.loading&&<p role="status">Carregando pessoas da empresa…</p>}
 {form==='grant'&&people.error&&<p role="alert">{people.error} <button type="button" onClick={()=>setPeopleRetry(n=>n+1)}>Tentar novamente</button></p>}
 {context&&['income','expense'].includes(form)&&<><label>Classificação<AppSelect name="classification">{(form==='income'?[['revenue','Receita manual'],['investment','Aporte ou investimento interno']]:[['expense','Despesa'],['operating_cost','Custo operacional'],['refund','Reembolso']]).map(([id,label])=><option key={id} value={id}>{label}</option>)}</AppSelect></label><label>Categoria<input name="category" maxLength={100}/></label><label>Comprovante · opcional<input name="receipt" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"/><small>PDF ou imagem de até 3 MB. Acesso restrito ao livro financeiro.</small></label>{form==='expense'&&<label>Evento da receita original · necessário para reembolso<input name="original_event" placeholder="Identificador da receita no histórico"/></label>}</>}{['income','expense','transfer'].includes(form)&&<><label>Valor<input name="cents" inputMode="decimal" placeholder="0,00" required/></label><label>Descrição<input name="description" maxLength={500} required/></label><label>Data<input name="happened_on" type="date" required defaultValue={today}/></label></>}
 <button className="primary" disabled={busy || form==='transfer'&&!transfer.data?.length || form==='grant'&&!people.rows.length}>Salvar registro</button></form></section>}
 </>}<footer className="economy-footnote">Livro financeiro interno · sem integração bancária · moedas consolidadas separadamente</footer></div>{transferReview&&<Dialog title="Confirmar transferência" onClose={()=>{if(!busy)setTransferReview(null)}}>
 <ActionScope name={name} permission={transferReview.permission}/>
 <dl className="economy-transfer-review"><div><dt>Origem</dt><dd>{transferReview.origin}</dd></div><div><dt>Destino</dt><dd>{transferReview.destination}</dd></div><div><dt>Valor</dt><dd>{money(String(transferReview.body.cents),transferReview.currency)}</dd></div><div><dt>Descrição</dt><dd>{String(transferReview.body.description)}</dd></div><div><dt>Data</dt><dd>{String(transferReview.body.happened_on)}</dd></div></dl>
 <p>Este lançamento atualiza o livro interno. Não executa uma transferência bancária.</p>
 <div className="collab-actions"><button disabled={busy} onClick={()=>setTransferReview(null)}>Voltar ao formulário</button><button className="primary" disabled={busy} onClick={()=>{if(transferReview.workspace!==workspaceId){setTransferReview(null);return}const body=transferReview.body;setTransferReview(null);void run(()=>action('transfer',body))}}>Transferir {money(String(transferReview.body.cents),transferReview.currency)} para {transferReview.destination}</button></div>
 </Dialog>}{accessReview&&<Dialog title="Confirmar acesso financeiro" onClose={()=>setAccessReview(null)}><ActionScope name={name} permission={companies.find(row=>row.id===accessReview.company_id)?.role||'Não informada'} reversible/><p>Pessoa: {people.rows.find(row=>row.user_id===accessReview.user_id)?.display_name||String(accessReview.user_id)}</p><p>Acesso solicitado: {String(accessReview.role)}</p><button disabled={busy} onClick={()=>{const body=accessReview;setAccessReview(null);void run(()=>action('grant',body))}}>Conceder acesso financeiro</button></Dialog>}{reauth&&<Reauthenticate email={email} onClose={()=>{retry.current=null;setReauth(false)}} onDone={()=>{const fn=retry.current;retry.current=null;setReauth(false);if(fn)void run(fn)}}/>}</Container>
}
