import type {ReactNode} from 'react'
import {CircleAlert} from 'lucide-react'
import {money,totalByCurrency} from './money'
type Company={id:string;currency:string}
type Flow={company_id:string;income:string;expense:string}
type Budget={company_id:string;month:string;income_cents:string;expense_cents:string}
export type Due={id:string;account_id:string;kind:string;cents:string;currency:string;due_on:string;state:string}
function Kpi({title,children,status,detail}:{title:string;children:ReactNode;status:string;detail:string}){
 return <article className="economy-kpi" role="region" aria-label={title}><h2>{title}</h2><div className="economy-kpi-value">{children}</div><p><CircleAlert size={13} aria-hidden="true"/>{status}</p><small>{detail}</small></article>
}
export function DecisionKpis({companies,accounts,flows,budgets,from,to,commitments,restricted,error,loading,retry,onBudget,onOperations}:{companies:Company[];accounts:{balance:string;currency:string}[];flows:Flow[];budgets:Budget[];from:string;to:string;commitments:Due[]|null;restricted:boolean;error:string;loading:boolean;retry:()=>void;onBudget:()=>void;onOperations?:()=>void}){
 const currencies=[...new Set(companies.map(row=>row.currency))]
 const balances=totalByCurrency(accounts)
 const today=new Date().toLocaleDateString('en-CA'),end=new Date(today+'T12:00:00');end.setDate(end.getDate()+7)
 const until=end.toLocaleDateString('en-CA')
 const due=commitments?.filter(row=>row.state==='open'&&row.kind==='payable'&&row.due_on<=until)??[]
 const overdue=due.filter(row=>row.due_on<today).length
 const byCurrency=(value:(currency:string)=>bigint)=>currencies.map(currency=><strong key={currency}>{money(value(currency),currency)}</strong>)
 const flow=(currency:string)=>flows.filter(row=>companies.some(company=>company.id===row.company_id&&company.currency===currency)).reduce((sum,row)=>sum+BigInt(row.income)-BigInt(row.expense),0n)
 const monthBudgets=budgets.filter(row=>row.month.slice(0,7)===from.slice(0,7)&&companies.some(company=>company.id===row.company_id))
 const comparable=from.slice(0,7)===to.slice(0,7)&&companies.length>0&&companies.every(company=>monthBudgets.some(row=>row.company_id===company.id))
 const budgetRemaining=(currency:string)=>monthBudgets.filter(row=>companies.some(company=>company.id===row.company_id&&company.currency===currency)).reduce((sum,row)=>sum+BigInt(row.expense_cents),0n)-flows.filter(row=>companies.some(company=>company.id===row.company_id&&company.currency===currency)).reduce((sum,row)=>sum+BigInt(row.expense),0n)
 return <section className="economy-kpis" aria-label="Indicadores para decisão">
  <Kpi title="Saldo disponível" status={Object.values(balances).some(value=>value<0n)?'Crítico · saldo negativo':'Atenção · meta de caixa não definida'} detail="Saldo atual · histórico comparativo não disponível">{Object.entries(balances).length?Object.entries(balances).map(([currency,value])=><strong key={currency}>{money(value,currency)}</strong>):<><strong>Sem contas</strong><small>Cadastre a primeira conta na aba Empresas.</small></>}</Kpi>
  <Kpi title="Fluxo do período" status={!currencies.length?'Atenção · sem livro':currencies.some(currency=>flow(currency)<0n)?'Atenção · saída maior que entrada':'Bom · fluxo não negativo'} detail="Receitas − despesas · sem meta ou comparação anterior">{currencies.length?byCurrency(flow):<strong>Sem registros</strong>}</Kpi>
  <Kpi title="Vencimentos · 7 dias" status={error?'Atenção · consulta indisponível':restricted?'Atenção · acesso restrito':!commitments&&!loading?'Atenção · dados indisponíveis':overdue?'Crítico · '+overdue+' em atraso':loading?'Consultando compromissos':due.length?'Atenção · '+due.length+' a pagar':'Bom · nenhum vencimento registrado'} detail="Inclui atrasados · meta e comparação não definidas">
   {loading?<span className="economy-skeleton" role="status">Carregando…</span>:error?<button onClick={retry}>Tentar novamente</button>:restricted||!commitments?<strong>Não disponível</strong>:due.length?<>{[...new Set(due.map(row=>row.currency))].map(currency=><strong key={currency}>{money(due.filter(row=>row.currency===currency).reduce((sum,row)=>sum+BigInt(row.cents),0n),currency)}</strong>)}</>:<strong>Nenhum</strong>}
   {onOperations&&<button onClick={onOperations}>{due.length?'Consultar vencimentos':'Registrar compromisso'}</button>}
  </Kpi>
  <Kpi title="Orçamento x realizado" status={comparable?currencies.some(currency=>budgetRemaining(currency)<0n)?'Crítico · teto de despesa excedido':'Bom · dentro do teto mensal':'Atenção · comparação sem orçamento'} detail={comparable?'Teto do mês − despesas do período · comparação parcial':'Defina o orçamento mensal para comparar'}>
   {comparable?byCurrency(budgetRemaining):<strong>Sem meta</strong>}<button onClick={onBudget}>{comparable?'Consultar planejamento':'Definir orçamento'}</button>
  </Kpi>
 </section>
}
