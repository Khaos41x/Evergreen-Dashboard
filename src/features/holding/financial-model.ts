export type FinancialPeriod='Hoje'|'Diário'|'Semanal'|'Quinzenal'|'Últimos 15 dias'|'Mensal'|'Trimestral'|'Semestral'|'Anual'|'Personalizado'
export const financialPeriods:FinancialPeriod[]=['Hoje','Diário','Semanal','Quinzenal','Últimos 15 dias','Mensal','Trimestral','Semestral','Anual','Personalizado']
export function isoDate(d:Date){return d.toISOString().slice(0,10)}
export function periodDates(period:FinancialPeriod,date:string){const d=new Date(date+'T12:00:00Z'),y=d.getUTCFullYear(),m=d.getUTCMonth(),day=d.getUTCDate();let from=new Date(d),to=new Date(d)
 if(period==='Semanal')from.setUTCDate(day-((d.getUTCDay()+6)%7))
 if(period==='Últimos 15 dias')from.setUTCDate(day-14)
 if(period==='Quinzenal'){from=new Date(Date.UTC(y,m,day<=15?1:16,12));to=new Date(Date.UTC(y,m,day<=15?15:new Date(Date.UTC(y,m+1,0)).getUTCDate(),12))}
 if(period==='Mensal')from=new Date(Date.UTC(y,m,1,12))
 if(period==='Trimestral')from=new Date(Date.UTC(y,Math.floor(m/3)*3,1,12))
 if(period==='Semestral')from=new Date(Date.UTC(y,m<6?0:6,1,12))
 if(period==='Anual')from=new Date(Date.UTC(y,0,1,12))
 return{from:isoDate(from),to:isoDate(to)}
}
export function previousPeriod(from:string,to:string){const a=Date.parse(from),b=Date.parse(to),span=b-a+86400000;return{from:isoDate(new Date(a-span)),to:isoDate(new Date(a-86400000))}}
export function percentageChange(current:bigint,previous:bigint){if(previous===0n)return current===0n?'0%':'Sem base de comparação';const n=(current-previous)*10000n/(previous<0n?-previous:previous);return(n>0n?'+':'')+(Number(n)/100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%'}
export function goalState(metric:string,current:bigint,target:bigint,due:string,today:string){const ratio=Number(current*10000n/target)/100;if(metric==='expense_limit')return{ratio:Math.max(0,Math.min(100,ratio)),label:current>target?'Limite excedido':today>due?'Concluída dentro do limite':'Dentro do limite',detail:Math.max(0,ratio).toLocaleString('pt-BR',{maximumFractionDigits:1})+'% do limite utilizado'};return{ratio:Math.max(0,Math.min(100,ratio)),label:current>=target?'Alcançada':today>due?'Prazo encerrado':'Em andamento',detail:ratio.toLocaleString('pt-BR',{maximumFractionDigits:1})+'% da meta'}}
export function csvCell(value:unknown){const raw=String(value??''),safe=/^[\s]*[=+\-@\t\r]/.test(raw)?"'"+raw:raw;return '"'+safe.replaceAll('"','""')+'"'}
