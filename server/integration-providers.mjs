import {asaasJSON,asaasEnvironment} from './asaas.mjs'
import {HttpError} from './security.mjs'
const hosts=new Set(['api.cloudflare.com','api.vercel.com','api.supabase.com'])
export function dateRange(from,to){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||'')||!Number.isFinite(Date.parse(from))||new Date(from+'T00:00:00Z').toISOString().slice(0,10)!==from||!Number.isFinite(Date.parse(to))||new Date(to+'T00:00:00Z').toISOString().slice(0,10)!==to||to<from||(Date.parse(to)-Date.parse(from))/86400000>366)throw new HttpError(400,'PERIOD_INVALID','Use um período válido de até 366 dias.')
 return{from,to,end:new Date(Date.parse(to+'T00:00:00Z')+86400000).toISOString()}
}
export async function providerJSON(url,token,init={},fetcher=fetch){
 const target=new URL(url);if(target.protocol!=='https:'||!hosts.has(target.hostname)||target.port||target.username||target.password)throw new HttpError(403,'PROVIDER_TARGET_DENIED','Destino do provedor não autorizado.')
 let response;try{response=await fetcher(target,{...init,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)})}catch{throw new HttpError(502,'PROVIDER_UNAVAILABLE','Não foi possível consultar o provedor. Tente novamente.')}
 if(!response.ok){if(response.status===401||response.status===403)throw new HttpError(403,'PROVIDER_CREDENTIAL_DENIED','A credencial foi recusada. Confira validade, equipe, projeto e permissões de leitura.');if(response.status===429)throw new HttpError(429,'PROVIDER_LIMIT','O provedor atingiu seu limite. Aguarde e tente novamente.');throw new HttpError(400,'PROVIDER_PERMISSION','A fonte não disponibilizou os dados. Confira token, escopo, projeto, plano e instrumentação.')}
 const limit=2097152,oversized=()=>new HttpError(413,'PROVIDER_DATA_LIMIT','A resposta da fonte excedeu o limite. Reduza o período.')
 if(Number(response.headers.get('content-length'))>limit){await response.body?.cancel();throw oversized()}
 const reader=response.body?.getReader(),chunks=[];let size=0
 if(reader){try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw oversized()}chunks.push(value)}}finally{reader.releaseLock()}}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 try{const data=JSON.parse(new TextDecoder().decode(bytes));if(!data||typeof data!=='object'||data.errors?.length||data.success===false)throw Error();return data}catch{throw new HttpError(400,'PROVIDER_DATA_INVALID','A fonte não retornou o conjunto de dados solicitado. Verifique as permissões e o plano.')}
}
export function providerConfig(provider,config={}){
 if(!config||Array.isArray(config)||typeof config!=='object')throw new HttpError(400,'PROVIDER_CONFIG_INVALID','Confira as opções do serviço selecionado.')
 if(!['cloudflare','vercel','supabase','asaas'].includes(provider))throw new HttpError(400,'PROVIDER_INVALID','Provedor não suportado.')
 if(provider==='asaas'){asaasEnvironment(config.environment);if(!/^[0-9a-f-]{36}$/.test(config.companyId||''))throw new HttpError(400,'FINANCE_COMPANY','Selecione o livro financeiro autorizado.');return{environment:config.environment,companyId:config.companyId}}
 const teamId=String(config.teamId||'');if(teamId&&!/^[A-Za-z0-9_-]{1,100}$/.test(teamId))throw new HttpError(400,'TEAM_INVALID','Identificador da equipe inválido.')
 return provider==='vercel'?{teamId}:{}
}
function resourceList(value){
 if(!Array.isArray(value)||value.some(r=>!r||typeof r.id!=='string'||!r.id||typeof r.name!=='string'))throw new HttpError(502,'PROVIDER_DATA_INVALID','A fonte não retornou uma lista válida de recursos. Tente novamente.')
 return value.map(({id,name})=>({id,name}))
}
export async function discoverResources(provider,token,config={},fetcher=fetch){
 const cfg=providerConfig(provider,config);let rows=[],limited=false
 if(provider==='cloudflare'){const d=await providerJSON('https://api.cloudflare.com/client/v4/zones?per_page=50',token,{},fetcher);rows=resourceList(d.result);limited=Number(d.result_info?.total_count)>rows.length}
 if(provider==='vercel'){const u=new URL('https://api.vercel.com/v10/projects');u.searchParams.set('limit','100');if(cfg.teamId)u.searchParams.set('teamId',cfg.teamId);const d=await providerJSON(u,token,{},fetcher);rows=resourceList(d.projects);limited=!!d.pagination?.next}
 if(provider==='supabase'){const d=await providerJSON('https://api.supabase.com/v1/projects',token,{},fetcher);rows=resourceList(d)}
 if(provider==='asaas'){const d=await asaasJSON('/wallets/',token,cfg.environment,fetcher);const wallets=Array.isArray(d.data)?d.data:d.id?[d]:Array.isArray(d)?d:[];rows=wallets.map(w=>({id:w.id,name:'Carteira Asaas · '+w.id}));if(!rows.length)throw new HttpError(400,'ASAAS_WALLET','A credencial não disponibilizou a carteira desta conta.')}
 if(!Array.isArray(rows)||rows.some(r=>typeof r?.id!=='string'||!r.id||typeof r?.name!=='string'))throw new HttpError(502,'PROVIDER_DATA_INVALID','A fonte não retornou uma lista válida de recursos. Tente novamente.')
 return{resources:rows,limited}
}
const number=v=>{if(v===null||v===undefined||!/^\d+(\.\d+)?$/.test(String(v)))return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:null}
export async function syncProvider(integration,token,from,to,fetcher=fetch){
 const range=dateRange(from,to),provider=integration.provider,id=String(integration.resource_id)
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw new HttpError(400,'RESOURCE_INVALID','Recurso inválido.')
 const payload={provider,resource_id:id,from,to,timezone:'UTC',metrics:[],series:[],breakdowns:{},unavailable:[],definition:'Métricas restritas à fonte e ao período. Não representam pessoas únicas da holding.'}
 const metric=(key,label,value,unit,aggregation)=>{const n=number(value);if(n!==null)payload.metrics.push({key,label,value:n,unit,aggregation})}
 if(provider==='cloudflare'){
 const query='query($zone: string, $from: Date, $to: Date) { viewer { zones(filter: {zoneTag: $zone}) { httpRequests1dGroups(limit: 367, filter: {date_geq: $from, date_leq: $to}, orderBy: [date_ASC]) { dimensions {date} sum {requests bytes threats countryMap {clientCountryName requests}} uniq {uniques} } } } }'
 const data=await providerJSON('https://api.cloudflare.com/client/v4/graphql',token,{method:'POST',body:JSON.stringify({query,variables:{zone:id,from,to}})},fetcher)
 const rows=data.data?.viewer?.zones?.[0]?.httpRequests1dGroups;if(!Array.isArray(rows))throw new HttpError(400,'METRICS_UNAVAILABLE','Analytics da zona não disponível para esta credencial.')
 payload.series=rows.map(x=>({date:x.dimensions.date,requests:number(x.sum.requests),bytes:number(x.sum.bytes),threats:number(x.sum.threats),unique_ips:number(x.uniq.uniques)}))
 for(const[key,label,unit]of[['requests','Requisições HTTP','requests'],['bytes','Tráfego','bytes'],['threats','Ameaças identificadas pela fonte','events']])metric(key,label,payload.series.reduce((n,x)=>n+(x[key]||0),0),unit,'sum')
 const countries=new Map();for(const row of rows)for(const c of row.sum.countryMap||[])countries.set(c.clientCountryName,(countries.get(c.clientCountryName)||0)+(number(c.requests)||0));payload.breakdowns.countries=[...countries].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,20)
 payload.unavailable.push('IPs distintos são mostrados por dia; não são visitantes únicos nem podem ser somados entre dias ou sites.','Visitas e páginas vistas não são inferidas de requisições HTTP.')
 }
 if(provider==='vercel'){
 const config=providerConfig(provider,integration.config);const get=async(by)=>{const url=new URL('https://api.vercel.com/v1/query/web-analytics/visits/aggregate');for(const[k,v]of Object.entries({projectId:id,since:from,until:to+'T23:59:59.999Z',by,limit:'367',...(config.teamId?{teamId:config.teamId}:{})}))url.searchParams.set(k,v);return providerJSON(url,token,{},fetcher)}
 const d=await get('day');if(!Array.isArray(d.data))throw new HttpError(400,'METRICS_UNAVAILABLE','Web Analytics não retornou uma série válida. Ative a instrumentação e verifique o plano.')
 payload.series=d.data.map(x=>({date:String(x.timestamp).slice(0,10),pageviews:number(x.pageviews),visitors:number(x.visitors)}))
 metric('pageviews','Páginas vistas',payload.series.reduce((n,x)=>n+(x.pageviews||0),0),'pageviews','sum')
 const top=await Promise.allSettled(['country','requestPath','referrerHostname'].map(get));top.forEach((r,i)=>{const key=['country','requestPath','referrerHostname'][i];if(r.status==='fulfilled')payload.breakdowns[key]=(r.value.data||[]).slice(0,20).map(x=>({name:x[key]||'Não informado',value:number(x.pageviews)}));else payload.unavailable.push('Detalhamento '+key+' indisponível na fonte.')})
 payload.unavailable.push('Visitantes são distintos apenas dentro de cada dia/projeto da fonte; não somamos como audiência única.','Eventos personalizados e conversão exigem instrumentação compatível; não são inferidos de páginas vistas.')
 }
 if(provider==='supabase'){
 const totals="select count(*)::text users_total,count(*)filter(where created_at >= '"+from+"T00:00:00Z'::timestamptz and created_at < '"+range.end+"'::timestamptz)::text signups,count(*)filter(where last_sign_in_at >= '"+from+"T00:00:00Z'::timestamptz and last_sign_in_at < '"+range.end+"'::timestamptz)::text accounts_last_login from auth.users"
 const series="select (created_at at time zone 'UTC')::date::text day,count(*)::text signups from auth.users where created_at >= '"+from+"T00:00:00Z'::timestamptz and created_at < '"+range.end+"'::timestamptz group by (created_at at time zone 'UTC')::date order by (created_at at time zone 'UTC')::date"
 const query=async(sql)=>{const d=await providerJSON('https://api.supabase.com/v1/projects/'+id+'/database/query/read-only',token,{method:'POST',body:JSON.stringify({query:sql})},fetcher);return Array.isArray(d)?d:Array.isArray(d.result)?d.result:Array.isArray(d.data)?d.data:[]}
 const [summary,daily]=await Promise.all([query(totals),query(series)]),rows=[...summary,...daily]
 const total=rows.find(x=>x.users_total!==undefined);if(!total)throw new HttpError(400,'METRICS_UNAVAILABLE','O perfil somente leitura não disponibilizou as contagens do Auth. Conceda apenas leitura autorizada; não use service_role do produto.')
 metric('users_total','Contas cadastradas · fotografia atual',total.users_total,'accounts','snapshot')
 metric('signups','Novos cadastros no período',total.signups,'accounts','sum')
 metric('accounts_last_login','Contas com último login no período',total.accounts_last_login,'accounts','snapshot')
 payload.series=rows.filter(x=>x.day).map(x=>({date:x.day,signups:number(x.signups)}))
 payload.unavailable.push('Contas com último login não equivalem a eventos de login nem usuários ativos do produto.','Atividade, eventos de login e conversão exigem logs ou instrumentação autorizada; não são estimados.')
 }
 return payload
}
