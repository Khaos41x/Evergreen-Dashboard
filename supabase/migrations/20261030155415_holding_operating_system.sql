-- Holding > workspace/company > application. No example companies or members.
begin;
create table public.eg_company_details(
 workspace_id uuid primary key references public.eg_workspaces on delete cascade,
 description text not null default '' check(length(description)<=2000),
 logo_url text check(logo_url is null or logo_url ~ '^https://[^[:space:]]+$'),
 responsible_id uuid references auth.users,updated_at timestamptz not null default now());
create table public.eg_applications(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.eg_workspaces,
 name text not null check(length(trim(name)) between 1 and 100),description text not null default '' check(length(description)<=2000),
 url text check(url is null or url ~ '^https://[^[:space:]]+$'),archived boolean not null default false,created_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now());
create index eg_applications_workspace on public.eg_applications(workspace_id);
create function evergreen_private.company_cap(w uuid,cap text) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.member_of(w) or exists(select 1 from public.eg_group_companies c where c.workspace_id=w and evergreen_private.founder_can(c.group_id,cap,w));$$;
create function evergreen_private.company_admin(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.admin_of(w) or exists(select 1 from public.eg_group_companies c where c.workspace_id=w and evergreen_private.group_owner(c.group_id) and evergreen_private.founder_can(c.group_id,'companies',w));$$;
create table public.eg_integrations(
 id uuid primary key,workspace_id uuid not null references public.eg_workspaces,application_id uuid not null references public.eg_applications,
 provider text not null check(provider in ('cloudflare','vercel','supabase','asaas')),resource_id text not null check(length(resource_id) between 1 and 100),
 label text not null check(length(label) between 1 and 120),config jsonb not null default '{}'::jsonb,
 state text not null default 'pending' check(state in ('pending','connected','error','disabled')),
 last_sync timestamptz,last_error text,created_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now());
create unique index eg_integrations_app_resource on public.eg_integrations(application_id,provider,resource_id,(coalesce(config->>'environment','')));
create index eg_integrations_workspace on public.eg_integrations(workspace_id);
create table evergreen_private.integration_secrets(
 integration_id uuid primary key references public.eg_integrations on delete cascade,ciphertext text not null check(length(ciphertext) between 40 and 30000));
revoke all on evergreen_private.integration_secrets from public,anon,authenticated;
create table public.eg_metric_snapshots(
 integration_id uuid not null references public.eg_integrations on delete cascade,period_from date not null,period_to date not null,
 payload jsonb not null check(jsonb_typeof(payload)='object' and length(payload::text)<=200000),
 synced_at timestamptz not null default now(),primary key(integration_id,period_from,period_to),check(period_to>=period_from and period_to-period_from<=366));
create index eg_metric_snapshots_sync on public.eg_metric_snapshots(synced_at);
create table public.eg_fin_details(
 event_id uuid primary key references public.eg_fin_events,category text not null default '' check(length(category)<=100),
 classification text not null check(classification in ('revenue','expense','operating_cost','investment','refund','transfer','reversal')),
 receipt_path text,origin text not null default 'manual' check(origin in ('manual','stripe','mercadopago')),
 original_event uuid references public.eg_fin_events,created_at timestamptz not null default now());
create table public.eg_fin_targets(
 id uuid primary key default gen_random_uuid(),workspace_id uuid references public.eg_workspaces,group_id uuid references public.eg_groups,
 company_id uuid references public.eg_fin_companies,name text not null check(length(trim(name)) between 1 and 150),
 metric text not null check(metric in ('revenue','expense_limit','cash','asaas_revenue','asaas_sales')),currency text not null check(currency ~ '^[A-Z]{3}$'),
 target_cents bigint not null check(target_cents between 1 and 9000000000000000),starts_on date not null,due_on date not null,
 responsible_id uuid references auth.users,objective_id uuid references public.eg_records,created_by uuid not null default auth.uid() references auth.users,
 check((workspace_id is not null)::integer+(group_id is not null)::integer=1),check(due_on>=starts_on and due_on-starts_on<=3660));
create index eg_fin_targets_workspace on public.eg_fin_targets(workspace_id);
create index eg_fin_targets_group on public.eg_fin_targets(group_id);
create table public.eg_holding_objectives(id uuid primary key default gen_random_uuid(),group_id uuid not null references public.eg_groups,
 title text not null check(length(trim(title)) between 1 and 200),description text not null default '' check(length(description)<=4000),
 due_on date,completed boolean not null default false,created_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now());
create index eg_holding_objectives_group on public.eg_holding_objectives(group_id);
create table public.eg_office_seats(workspace_id uuid not null references public.eg_workspaces,user_id uuid not null references auth.users,
 seat integer not null check(seat>=0),primary key(workspace_id,user_id),unique(workspace_id,seat));
create function evergreen_private.assign_office_seat() returns trigger language plpgsql security definer set search_path='' as $$
 declare slot integer;begin perform pg_advisory_xact_lock(hashtextextended(new.workspace_id::text,17));
 select coalesce(max(seat)+1,0) into slot from public.eg_office_seats where workspace_id=new.workspace_id;
 insert into public.eg_office_seats values(new.workspace_id,new.user_id,slot) on conflict(workspace_id,user_id)do nothing;return new;end $$;
insert into public.eg_office_seats select workspace_id,user_id,(row_number()over(partition by workspace_id order by user_id)-1)::integer from public.eg_members;
create trigger eg_assign_office_seat after insert on public.eg_members for each row execute function evergreen_private.assign_office_seat();

do $$ declare t text;begin foreach t in array array['eg_company_details','eg_applications','eg_integrations','eg_metric_snapshots','eg_fin_details','eg_fin_targets','eg_holding_objectives','eg_office_seats']loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);end loop;end $$;
create policy company_details_read on public.eg_company_details for select to authenticated using(evergreen_private.company_cap(workspace_id,'companies'));
create policy applications_read on public.eg_applications for select to authenticated using(evergreen_private.company_cap(workspace_id,'companies'));
create policy integrations_read on public.eg_integrations for select to authenticated using(evergreen_private.company_cap(workspace_id,'intelligence'));
create policy metrics_read on public.eg_metric_snapshots for select to authenticated using(exists(select 1 from public.eg_integrations i where i.id=integration_id and evergreen_private.company_cap(i.workspace_id,'intelligence')and(i.provider<>'asaas'or evergreen_private.finance_role((i.config->>'companyId')::uuid))));
create policy fin_details_read on public.eg_fin_details for select to authenticated using(evergreen_private.live_session() and exists(select 1 from public.eg_fin_entries e join public.eg_fin_accounts a on a.id=e.account_id where e.event_id=eg_fin_details.event_id and evergreen_private.finance_role(a.company_id)) and not exists(select 1 from public.eg_fin_entries e join public.eg_fin_accounts a on a.id=e.account_id where e.event_id=eg_fin_details.event_id and not evergreen_private.finance_role(a.company_id)));
create policy fin_targets_read on public.eg_fin_targets for select to authenticated using(
 workspace_id is not null and evergreen_private.finance_role(company_id)
 or group_id is not null and evergreen_private.founder_can(group_id,'finance'));
create policy holding_objectives_read on public.eg_holding_objectives for select to authenticated using(evergreen_private.founder_can(group_id,'projects'));
create policy seats_read on public.eg_office_seats for select to authenticated using(evergreen_private.member_of(workspace_id));

create function public.eg_holding_context() returns jsonb language plpgsql stable security definer set search_path='' as $$
 begin if not evergreen_private.live_session() then raise exception 'Sessão necessária.' using errcode='42501';end if;
 return jsonb_build_object('groups',public.eg_founders_groups(),'companies',coalesce((select jsonb_agg(jsonb_build_object(
 'id',w.id,'name',w.name,'group_id',gc.group_id,'description',coalesce(d.description,''),'logo_url',d.logo_url,'responsible_id',d.responsible_id,
 'admin',evergreen_private.company_admin(w.id),'operational',evergreen_private.member_of(w.id),
 'information',evergreen_private.company_cap(w.id,'intelligence'))) from public.eg_workspaces w left join public.eg_company_details d on d.workspace_id=w.id left join public.eg_group_companies gc on gc.workspace_id=w.id
 where not exists(select 1 from public.eg_groups gr where gr.communication_workspace=w.id) and evergreen_private.company_cap(w.id,'companies')),'[]'::jsonb));end $$;

create function public.eg_holding_action(p_workspace uuid,p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid;g uuid;begin perform evergreen_private.require_recent();
 if length(p_data::text)>12000 or jsonb_typeof(p_data)<>'object' then raise exception 'Dados inválidos.';end if;
 if p_action='objective' or p_action='objective_update' then
 g:=(p_data->>'group_id')::uuid;if not evergreen_private.founder_can(g,'projects') then raise exception 'Escopo de objetivos não autorizado.' using errcode='42501';end if;
 if p_action='objective' then insert into public.eg_holding_objectives(group_id,title,description,due_on)values(g,p_data->>'title',coalesce(p_data->>'description',''),(p_data->>'due_on')::date)returning id into result;
 else update public.eg_holding_objectives set completed=(p_data->>'completed')::boolean where id=(p_data->>'id')::uuid and group_id=g returning id into result;end if;
 return result;end if;
 if not evergreen_private.company_admin(p_workspace) then raise exception 'Administrador da empresa necessário.' using errcode='42501';end if;
 if p_action='company' then
 if nullif(p_data->>'responsible_id','') is not null and not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=(p_data->>'responsible_id')::uuid) then raise exception 'Responsável fora da empresa.';end if;
 update public.eg_workspaces set name=trim(p_data->>'name') where id=p_workspace;
 insert into public.eg_company_details(workspace_id,description,logo_url,responsible_id)values(p_workspace,coalesce(p_data->>'description',''),nullif(p_data->>'logo_url',''),nullif(p_data->>'responsible_id','')::uuid)
 on conflict(workspace_id)do update set description=excluded.description,logo_url=excluded.logo_url,responsible_id=excluded.responsible_id,updated_at=now();result:=p_workspace;
 elsif p_action='application' then
 if nullif(p_data->>'id','') is null then insert into public.eg_applications(workspace_id,name,description,url)values(p_workspace,trim(p_data->>'name'),coalesce(p_data->>'description',''),nullif(p_data->>'url',''))returning id into result;
 else update public.eg_applications set name=trim(p_data->>'name'),description=coalesce(p_data->>'description',''),url=nullif(p_data->>'url',''),archived=coalesce((p_data->>'archived')::boolean,false) where id=(p_data->>'id')::uuid and workspace_id=p_workspace returning id into result;end if;
 else raise exception 'Ação indisponível.';end if;
 if result is null then raise exception 'Recurso não autorizado.' using errcode='42501';end if;return result;end $$;

create function public.eg_information_snapshot(p_group uuid default null,p_workspace uuid default null,p_from date default current_date-29,p_to date default current_date) returns jsonb language plpgsql stable security definer set search_path='' as $$
 begin
 if not evergreen_private.live_session() or p_to<p_from or p_to-p_from>366 then raise exception 'Sessão ou período inválido.' using errcode='42501';end if;
 if p_group is null and p_workspace is null then raise exception 'Selecione a holding ou uma empresa.';end if;
 if p_group is not null and not(evergreen_private.founder_can(p_group,'intelligence')or evergreen_private.founder_can(p_group,'companies')or evergreen_private.founder_can(p_group,'projects'))then raise exception 'Holding não autorizada.' using errcode='42501';end if;
 if p_workspace is not null and not evergreen_private.company_cap(p_workspace,'companies') then raise exception 'Empresa não autorizada.' using errcode='42501';end if;
 return jsonb_build_object('applications',coalesce((select jsonb_agg(to_jsonb(a))from public.eg_applications a where not a.archived and (p_workspace is null or a.workspace_id=p_workspace) and (p_group is null or exists(select 1 from public.eg_group_companies c where c.group_id=p_group and c.workspace_id=a.workspace_id)) and evergreen_private.company_cap(a.workspace_id,'companies')),'[]'::jsonb),
 'integrations',coalesce((select jsonb_agg(to_jsonb(i)) from public.eg_integrations i where (p_workspace is null or i.workspace_id=p_workspace) and (p_group is null or exists(select 1 from public.eg_group_companies c where c.group_id=p_group and c.workspace_id=i.workspace_id)) and evergreen_private.company_cap(i.workspace_id,'intelligence')and(i.provider<>'asaas'or evergreen_private.finance_role((i.config->>'companyId')::uuid))),'[]'::jsonb),
 'metrics',coalesce((select jsonb_agg(jsonb_build_object('integration_id',m.integration_id,'period_from',m.period_from,'period_to',m.period_to,'payload',m.payload,'synced_at',m.synced_at))from public.eg_metric_snapshots m join public.eg_integrations i on i.id=m.integration_id where m.period_from=p_from and m.period_to=p_to and i.state<>'disabled' and (p_workspace is null or i.workspace_id=p_workspace) and (p_group is null or exists(select 1 from public.eg_group_companies c where c.group_id=p_group and c.workspace_id=i.workspace_id)) and evergreen_private.company_cap(i.workspace_id,'intelligence')and(i.provider<>'asaas'or evergreen_private.finance_role((i.config->>'companyId')::uuid))),'[]'::jsonb),
 'objectives',case when p_group is not null and evergreen_private.founder_can(p_group,'projects') then coalesce((select jsonb_agg(to_jsonb(o))from public.eg_holding_objectives o where group_id=p_group),'[]'::jsonb)else '[]'::jsonb end);
 end $$;

create function public.eg_integration_manage(p_action text,p_workspace uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
 declare i public.eg_integrations;result uuid;begin perform evergreen_private.require_recent();
 if not evergreen_private.company_admin(p_workspace) then raise exception 'Administrador autorizado necessário.' using errcode='42501';end if;
 if p_action='save' then
 if p_data->>'provider'='asaas' and not exists(select 1 from public.eg_fin_companies c where c.id=(p_data->'config'->>'companyId')::uuid and c.workspace_id=p_workspace and c.currency='BRL' and evergreen_private.finance_role(c.id,array['admin']))then raise exception 'Administrador do livro financeiro necessário.' using errcode='42501';end if;
 if not exists(select 1 from public.eg_applications a where a.id=(p_data->>'application_id')::uuid and a.workspace_id=p_workspace and not a.archived) then raise exception 'Aplicação fora da empresa.' using errcode='42501';end if;
 if exists(select 1 from public.eg_integrations where id=(p_data->>'id')::uuid and(provider<>p_data->>'provider' or resource_id<>p_data->>'resource_id' or application_id<>(p_data->>'application_id')::uuid or(provider='asaas'and config->>'companyId' is distinct from p_data->'config'->>'companyId')))then raise exception 'O recurso de uma integração existente não pode ser trocado.' using errcode='42501';end if;
 result:=(p_data->>'id')::uuid;if result is null then raise exception 'Identificador necessário.';end if;
 if exists(select 1 from public.eg_integrations where id=result and workspace_id<>p_workspace) then raise exception 'Integração não autorizada.' using errcode='42501';end if;
 insert into public.eg_integrations(id,workspace_id,application_id,provider,resource_id,label,config)
 values(result,p_workspace,(p_data->>'application_id')::uuid,p_data->>'provider',p_data->>'resource_id',p_data->>'label',coalesce(p_data->'config','{}'))
 on conflict(id)do update set label=excluded.label,config=excluded.config,state='pending';
 insert into evergreen_private.integration_secrets values(result,p_data->>'ciphertext')on conflict(integration_id)do update set ciphertext=excluded.ciphertext;
 return jsonb_build_object('id',result);
 end if;
 select * into i from public.eg_integrations where id=(p_data->>'id')::uuid and workspace_id=p_workspace;
 if i.id is null then raise exception 'Integração não autorizada.' using errcode='42501';end if;
 if i.provider='asaas' and not evergreen_private.finance_role((i.config->>'companyId')::uuid,array['admin'])then raise exception 'Administrador financeiro necessário.' using errcode='42501';end if;
 if p_action='disable' then update public.eg_integrations set state='disabled' where id=i.id;delete from evergreen_private.integration_secrets where integration_id=i.id;return '{}';end if;
 if i.provider='asaas' and not evergreen_private.finance_role((i.config->>'companyId')::uuid,array['admin'])then raise exception 'Administrador financeiro necessário.' using errcode='42501';end if;
 if p_action='credential' and i.state<>'disabled' then return to_jsonb(i)||jsonb_build_object('ciphertext',(select ciphertext from evergreen_private.integration_secrets where integration_id=i.id));end if;
 raise exception 'Ação indisponível.';
 end $$;
create function public.eg_integration_commit(p_id uuid,p_from date,p_to date,p_payload jsonb,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
 begin
 if not exists(select 1 from public.eg_integrations where id=p_id and state<>'disabled') then raise exception 'Integração indisponível.';end if;
 if p_error is not null then update public.eg_integrations set state='error',last_error=left(p_error,200) where id=p_id;return;end if;
 insert into public.eg_metric_snapshots(integration_id,period_from,period_to,payload)values(p_id,p_from,p_to,p_payload)
 on conflict(integration_id,period_from,period_to)do update set payload=excluded.payload,synced_at=now();
 update public.eg_integrations set state='connected',last_sync=now(),last_error=null where id=p_id;
 end $$;
revoke all on function public.eg_integration_commit(uuid,date,date,jsonb,text) from public,anon,authenticated;
grant execute on function public.eg_integration_commit(uuid,date,date,jsonb,text) to service_role;

create function public.eg_financial_action(p_workspace uuid,p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid;v_classification text;original public.eg_fin_events;previous public.eg_fin_details;begin
 perform evergreen_private.require_recent();v_classification:=coalesce(nullif(p_data->>'classification',''),case p_action when 'income' then 'revenue' else p_action end);
 if p_action='group_target' then
 if p_data->>'metric' in ('asaas_revenue','asaas_sales')and p_data->>'currency'<>'BRL'then raise exception 'Indicadores Asaas usam BRL; conversão de moedas não está habilitada.';end if;
 if not evergreen_private.founder_can((p_data->>'group_id')::uuid,'finance') or not evergreen_private.group_owner((p_data->>'group_id')::uuid) then raise exception 'Administração financeira da holding necessária.' using errcode='42501';end if;
 if nullif(p_data->>'responsible_id','') is not null and not exists(select 1 from public.eg_group_members where group_id=(p_data->>'group_id')::uuid and user_id=(p_data->>'responsible_id')::uuid)then raise exception 'Responsável fora da holding.';end if;
 insert into public.eg_fin_targets(group_id,name,metric,currency,target_cents,starts_on,due_on,responsible_id)values((p_data->>'group_id')::uuid,p_data->>'name',p_data->>'metric',p_data->>'currency',(p_data->>'target_cents')::bigint,(p_data->>'starts_on')::date,(p_data->>'due_on')::date,nullif(p_data->>'responsible_id','')::uuid)returning id into result;return result;
 end if;
 if p_action='target' then
 if p_data->>'metric' in ('asaas_revenue','asaas_sales')and not exists(select 1 from public.eg_fin_companies where id=(p_data->>'company_id')::uuid and currency='BRL')then raise exception 'Indicadores Asaas exigem um livro BRL.';end if;
 if not evergreen_private.member_of(p_workspace) then raise exception 'Empresa não autorizada.' using errcode='42501';end if;
 if not evergreen_private.finance_role((p_data->>'company_id')::uuid,array['admin']) or not exists(select 1 from public.eg_fin_companies where id=(p_data->>'company_id')::uuid and workspace_id=p_workspace) then raise exception 'Administrador financeiro necessário.' using errcode='42501';end if;
 if nullif(p_data->>'objective_id','') is not null and not exists(select 1 from public.eg_records where id=(p_data->>'objective_id')::uuid and kind='objective' and workspace_id=p_workspace) then raise exception 'Objetivo fora da empresa.';end if;
 if nullif(p_data->>'responsible_id','') is not null and not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=(p_data->>'responsible_id')::uuid) then raise exception 'Responsável fora da empresa.';end if;
 insert into public.eg_fin_targets(workspace_id,company_id,name,metric,currency,target_cents,starts_on,due_on,responsible_id,objective_id)
 select p_workspace,c.id,p_data->>'name',p_data->>'metric',c.currency,(p_data->>'target_cents')::bigint,(p_data->>'starts_on')::date,(p_data->>'due_on')::date,nullif(p_data->>'responsible_id','')::uuid,nullif(p_data->>'objective_id','')::uuid from public.eg_fin_companies c where c.id=(p_data->>'company_id')::uuid returning id into result;
 return result;end if;
 if not(p_action='income' and v_classification in ('revenue','investment') or p_action='expense' and v_classification in ('expense','operating_cost','refund') or p_action='transfer' and v_classification='transfer' or p_action='reversal' and v_classification='reversal')then raise exception 'Classificação incompatível.';end if;
 -- Serialize retries and refund limits. The ledger still validates the monetary payload.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||coalesce(p_data->>'request_id',''),43));
 select d.* into previous from public.eg_fin_details d join public.eg_fin_events e on e.id=d.event_id where e.workspace_id=p_workspace and e.actor_id=auth.uid() and e.request_id=(p_data->>'request_id')::uuid;
 if previous.event_id is not null then
 if previous.classification<>v_classification or previous.category<>coalesce(p_data->>'category','') or previous.original_event is distinct from nullif(p_data->>'original_event','')::uuid or previous.receipt_path is distinct from nullif(p_data->>'receipt_path','')then raise exception 'Solicitação reutilizada com dados diferentes.';end if;
 return public.eg_economy_action(p_workspace,p_action,p_data);end if;
 if v_classification='refund' then
 select * into original from public.eg_fin_events where id=(p_data->>'original_event')::uuid and kind='income' and workspace_id=p_workspace for update;
 if exists(select 1 from public.eg_fin_events where reverses=original.id) or exists(select 1 from public.eg_fin_details where event_id=original.id and classification<>'revenue') then raise exception 'Receita original indisponível para reembolso.';end if;
 if original.id is null or not exists(select 1 from public.eg_fin_entries where event_id=original.id and account_id=(p_data->>'account_id')::uuid) then raise exception 'Receita original da mesma conta necessária.';end if;
 if coalesce((select sum(-e.cents) from public.eg_fin_entries e join public.eg_fin_events ev on ev.id=e.event_id join public.eg_fin_details d on d.event_id=coalesce(ev.reverses,ev.id) where d.original_event=original.id and d.classification='refund'),0)+(p_data->>'cents')::bigint>(select sum(e.cents)from public.eg_fin_entries e where e.event_id=original.id) then raise exception 'Reembolso excede a receita original.';end if;
 end if;
 if nullif(p_data->>'receipt_path','') is not null and not exists(select 1 from storage.objects o where o.bucket_id='eg-finance-receipts' and o.name=p_data->>'receipt_path' and evergreen_private.finance_receipt_access(o.name,false) and split_part(o.name,'/',1)=(select company_id::text from public.eg_fin_accounts where id=(p_data->>'account_id')::uuid))then raise exception 'Comprovante indisponível.';end if;
 result:=public.eg_economy_action(p_workspace,p_action,p_data);
 insert into public.eg_fin_details(event_id,category,classification,receipt_path,original_event)values(result,coalesce(p_data->>'category',''),v_classification,nullif(p_data->>'receipt_path',''),nullif(p_data->>'original_event','')::uuid)on conflict(event_id)do nothing;
 return result;end $$;

create function public.eg_financial_report(p_group uuid default null,p_workspace uuid default null,p_from date default current_date-29,p_to date default current_date) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare allowed uuid[];result jsonb;begin
 if not evergreen_private.live_session() or p_to<p_from or p_to-p_from>366 then raise exception 'Sessão ou período inválido.' using errcode='42501';end if;
 if p_group is null and p_workspace is null then raise exception 'Selecione uma holding ou empresa.';end if;
 if p_group is not null and not evergreen_private.founder_can(p_group,'finance') then raise exception 'Holding não autorizada.' using errcode='42501';end if;
 select array_agg(c.id) into allowed from public.eg_fin_companies c where (p_workspace is null or c.workspace_id=p_workspace)
 and evergreen_private.finance_role(c.id) and (p_group is null or exists(select 1 from public.eg_group_companies gc where gc.group_id=p_group and gc.workspace_id=c.workspace_id and evergreen_private.founder_can(p_group,'finance',c.workspace_id)));
 with legs as(select e.id,e.event_id,e.account_id,e.cents,c.currency,c.workspace_id,c.id company_id,ev.happened_on,ev.kind,ev.actor_id,ev.description,ev.created_at,ev.reverses,coalesce(d.classification,case ev.kind when 'income' then 'revenue' else ev.kind end)classification,coalesce(d.category,'Sem categoria')category,coalesce(d.origin,'manual')origin,d.receipt_path
 from public.eg_fin_entries e join public.eg_fin_accounts a on a.id=e.account_id join public.eg_fin_companies c on c.id=a.company_id join public.eg_fin_events ev on ev.id=e.event_id left join public.eg_fin_details d on d.event_id=coalesce(ev.reverses,ev.id) where c.id=any(allowed)),
 flows as(select *,case when classification='revenue' then cents else 0 end revenue,
 case when classification='refund' then -cents else 0 end refunds,
 case when classification in ('expense','operating_cost') then -cents else 0 end expense from legs),
 totals as(select currency,coalesce(sum(cents)filter(where happened_on<=p_to),0)::text cash,
 coalesce(sum(revenue)filter(where happened_on between p_from and p_to),0)::text gross,
 coalesce(sum(refunds)filter(where happened_on between p_from and p_to),0)::text refunds,
 coalesce(sum(expense)filter(where happened_on between p_from and p_to),0)::text expense,
 coalesce(sum(cents)filter(where happened_on between p_from and p_to),0)::text cash_flow from flows group by currency),
 daily as(select happened_on,currency,sum(revenue)::text gross,sum(refunds)::text refunds,sum(expense)::text expense,sum(cents)::text cash_flow from flows where happened_on between p_from and p_to group by happened_on,currency)
 select jsonb_build_object('totals',coalesce((select jsonb_agg(to_jsonb(t))from totals t),'[]'),
 'daily',coalesce((select jsonb_agg(to_jsonb(d)order by happened_on)from daily d),'[]'),
 'transactions',coalesce((select jsonb_agg(to_jsonb(t))from(select id,event_id,account_id,currency,company_id,workspace_id,happened_on,case when exists(select 1 from public.eg_fin_entries x join public.eg_fin_accounts a on a.id=x.account_id where x.event_id=flows.event_id and not(a.company_id=any(allowed)))then 'Transferência com contraparte restrita' else description end description,kind,classification,case when exists(select 1 from public.eg_fin_entries x join public.eg_fin_accounts a on a.id=x.account_id where x.event_id=flows.event_id and not(a.company_id=any(allowed)))then '' else category end category,origin,actor_id,receipt_path,cents::text,created_at from flows where happened_on between p_from and p_to order by created_at desc,id desc limit 2000)t),'[]'),
 'companies',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'workspace_id',c.workspace_id,'currency',c.currency))from public.eg_fin_companies c where c.id=any(allowed)),'[]'),
 'goals',coalesce((select jsonb_agg(to_jsonb(g)||jsonb_build_object('source_complete',case when g.metric in ('asaas_revenue','asaas_sales')then evergreen_private.asaas_goal_ready(p_group,p_workspace,g.company_id)else true end,'target_cents',g.target_cents::text,'current_cents',case when g.metric in ('asaas_revenue','asaas_sales')then evergreen_private.asaas_goal_value(p_group,p_workspace,g.company_id,g.metric,g.starts_on,g.due_on) when g.metric='cash' then (select coalesce(sum(f.cents),0)::text from flows f where f.currency=g.currency and f.happened_on<=least(current_date,g.due_on) and (g.company_id is null or f.company_id=g.company_id))else(select coalesce(sum(case when g.metric='expense_limit' then f.expense else f.revenue-f.refunds end),0)::text from flows f where f.currency=g.currency and f.happened_on between g.starts_on and g.due_on and(g.company_id is null or f.company_id=g.company_id))end))from public.eg_fin_targets g where (g.company_id=any(allowed)) or(g.group_id=p_group and evergreen_private.founder_can(p_group,'finance'))),'[]'),
 'scope_complete',p_group is null or not exists(select 1 from public.eg_fin_companies c join public.eg_group_companies gc on gc.workspace_id=c.workspace_id where gc.group_id=p_group and not(c.id=any(coalesce(allowed,array[]::uuid[])))),
 'history_limited', (select count(*)>2000 from flows where happened_on between p_from and p_to),
 'definition','Receitas são entradas classificadas como receita; aportes e transferências não são faturamento. Caixa é o saldo do livro informado, sem conciliação bancária. Vendas e pagamentos pendentes exigem gateway conectado.') into result;
 return result;end $$;

do $$ declare f record;begin for f in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where(n.nspname='public' and p.proname in('eg_holding_context','eg_holding_action','eg_information_snapshot','eg_integration_manage','eg_financial_action','eg_financial_report'))or(n.nspname='evergreen_private' and p.proname in('company_cap','company_admin','assign_office_seat'))loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 if f.proname<>'assign_office_seat'then execute format('grant execute on function %s to authenticated',f.signature);end if;end loop;end $$;

-- Holding stations are permanent per real person. Revocation changes visibility, not another person's position.
create table public.eg_holding_seats(group_id uuid not null references public.eg_groups,user_id uuid not null references auth.users,seat integer not null check(seat>=0),primary key(group_id,user_id),unique(group_id,seat));
alter table public.eg_holding_seats enable row level security;
revoke all on public.eg_holding_seats from public,anon,authenticated;
create function public.eg_holding_office(p_group uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare person_row record;slot integer;begin
if not evergreen_private.founder_can(p_group,'people')then raise exception 'Acesso à equipe da holding necessário.' using errcode='42501';end if;
perform pg_advisory_xact_lock(hashtextextended(p_group::text,19));
for person_row in select distinct m.user_id from public.eg_members m join public.eg_group_companies gc on gc.workspace_id=m.workspace_id where gc.group_id=p_group and evergreen_private.founder_can(p_group,'people',m.workspace_id) order by m.user_id loop
select coalesce(max(seat)+1,0)into slot from public.eg_holding_seats where group_id=p_group;
insert into public.eg_holding_seats values(p_group,person_row.user_id,slot)on conflict(group_id,user_id)do nothing;
end loop;
return jsonb_build_object('members',coalesce((select jsonb_agg(jsonb_build_object('id',s.user_id,'seat',s.seat,'name',p.display_name,'jobTitle',p.job_title,'presence','unknown','company',coalesce((select string_agg(distinct w.name,', ' order by w.name)from public.eg_members m join public.eg_workspaces w on w.id=m.workspace_id join public.eg_group_companies gc on gc.workspace_id=w.id where m.user_id=s.user_id and gc.group_id=p_group and evergreen_private.founder_can(p_group,'people',w.id)),''),'focus',coalesce((select string_agg(distinct f.title,', ')from public.eg_focus f join public.eg_group_companies gc on gc.workspace_id=f.workspace_id where gc.group_id=p_group and f.user_id=s.user_id and f.status='running' and evergreen_private.member_of(f.workspace_id)),''))order by s.seat)from public.eg_holding_seats s join public.eg_profiles p on p.id=s.user_id where s.group_id=p_group and exists(select 1 from public.eg_members m join public.eg_group_companies gc on gc.workspace_id=m.workspace_id where gc.group_id=p_group and m.user_id=s.user_id and evergreen_private.founder_can(p_group,'people',m.workspace_id))),'[]'),
'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'status',r.status,'projectId',r.project_id,'assigneeId',r.assignee_id,'progress',r.progress,'canComplete',false))from public.eg_records r join public.eg_group_companies gc on gc.workspace_id=r.workspace_id where gc.group_id=p_group and r.kind='task' and r.archived_at is null and evergreen_private.member_of(r.workspace_id) and evergreen_private.founder_can(p_group,'people',r.workspace_id)),'[]'));
end $$;
revoke all on function public.eg_holding_office(uuid) from public,anon;
grant execute on function public.eg_holding_office(uuid) to authenticated;

-- Canonical payment observations form a separate source; they never silently duplicate manual ledger entries.
create unique index eg_asaas_wallet_owner on public.eg_integrations(resource_id,(config->>'environment'))where provider='asaas';
create table public.eg_asaas_payments(integration_id uuid references public.eg_integrations,payment_id text not null check(payment_id ~ '^pay_[A-Za-z0-9_-]+$'),payload jsonb not null check(length(payload::text)<32000),synced_at timestamptz not null default now(),primary key(integration_id,payment_id));
create table evergreen_private.asaas_events(integration_id uuid references public.eg_integrations,event_id text not null,received_at timestamptz not null default now(),primary key(integration_id,event_id));
alter table public.eg_asaas_payments enable row level security;
revoke all on public.eg_asaas_payments,evergreen_private.asaas_events from public,anon,authenticated;
grant select on public.eg_asaas_payments to authenticated;
create policy asaas_payment_read on public.eg_asaas_payments for select to authenticated using(exists(select 1 from public.eg_integrations i where i.id=integration_id and evergreen_private.finance_role((i.config->>'companyId')::uuid)));
-- Hide payment snapshots/connection metadata from users without financial scope.
drop policy integrations_read on public.eg_integrations;
create policy integrations_read on public.eg_integrations for select to authenticated using(evergreen_private.company_cap(workspace_id,'intelligence') and(provider<>'asaas' or evergreen_private.finance_role((config->>'companyId')::uuid)));
create function public.eg_asaas_credentials(p_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin select to_jsonb(i)||jsonb_build_object('ciphertext',s.ciphertext)into result from public.eg_integrations i join evergreen_private.integration_secrets s on s.integration_id=i.id where i.id=p_id and i.provider='asaas' and i.state<>'disabled';if result is null then raise exception 'Integração indisponível.';end if;return result;end $$;
create function public.eg_asaas_store(p_id uuid,p_payment jsonb,p_event text default null)returns void language plpgsql security definer set search_path='' as $$
begin
perform pg_advisory_xact_lock(hashtextextended(p_id::text||coalesce(p_payment->>'id',''),29));
if not exists(select 1 from public.eg_integrations where id=p_id and provider='asaas' and state<>'disabled')then raise exception 'Integração indisponível.';end if;
if p_event is not null then insert into evergreen_private.asaas_events(integration_id,event_id)values(p_id,p_event)on conflict do nothing;if not found then return;end if;end if;
if p_payment->>'gross_cents' !~ '^[0-9]{1,16}$' or p_payment->>'refund_cents' !~ '^[0-9]{1,16}$' or jsonb_typeof(p_payment->'refunds')<>'array' then raise exception 'Pagamento inválido.';end if;
insert into public.eg_asaas_payments(integration_id,payment_id,payload)values(p_id,p_payment->>'id',p_payment)on conflict(integration_id,payment_id)do update set payload=excluded.payload,synced_at=now()where (excluded.payload->>'observed_at')::timestamptz>=coalesce((eg_asaas_payments.payload->>'observed_at')::timestamptz,'epoch'::timestamptz);
update public.eg_integrations set state='connected',last_sync=now(),last_error=null where id=p_id;
end $$;
revoke all on function public.eg_asaas_credentials(uuid),public.eg_asaas_store(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.eg_asaas_credentials(uuid),public.eg_asaas_store(uuid,jsonb,text)to service_role;
create function public.eg_asaas_report(p_group uuid default null,p_workspace uuid default null,p_from date default current_date-29,p_to date default current_date,p_company uuid default null)returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
if not evergreen_private.live_session() or(p_group is null and p_workspace is null)or p_to<p_from or p_to-p_from>366 then raise exception 'Escopo ou período inválido.' using errcode='42501';end if;
if p_group is not null and not evergreen_private.founder_can(p_group,'finance')then raise exception 'Holding não autorizada.' using errcode='42501';end if;
return (with sources as(select i.* from public.eg_integrations i where i.provider='asaas' and(p_workspace is null or i.workspace_id=p_workspace)and(p_company is null or(i.config->>'companyId')::uuid=p_company)and evergreen_private.finance_role((i.config->>'companyId')::uuid)and(p_group is null or exists(select 1 from public.eg_group_companies gc where gc.group_id=p_group and gc.workspace_id=i.workspace_id and evergreen_private.founder_can(p_group,'finance',gc.workspace_id)))),payments as(select p.*,i.config->>'environment'environment,i.label,i.workspace_id from public.eg_asaas_payments p join sources i on i.id=p.integration_id),production as(select *,payload->>'status'status,(payload->>'gross_cents')::bigint gross,(payload->>'net_cents')::bigint net,(payload->>'confirmed_on')::date confirmed_on,(payload->>'due_on')::date due_on from payments where environment='production'),realized as(select * from production where status in ('CONFIRMED','RECEIVED','REFUNDED','REFUND_IN_PROGRESS')and confirmed_on between p_from and p_to),refunds as(select coalesce(sum((r->>'cents')::bigint),0)::text amount from production p cross join lateral jsonb_array_elements(p.payload->'refunds')r where (r->>'date')::date between p_from and p_to),daily as(select confirmed_on as day,sum(gross)::text gross,count(*)::text sales from realized group by confirmed_on)
select jsonb_build_object('sources',coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',label,'environment',config->>'environment','last_sync',last_sync,'state',state,'reconciled_at',(select last_complete from evergreen_private.asaas_sync_state where integration_id=sources.id)))from sources),'[]'),
'gross_cents',coalesce((select sum(gross)::text from realized),'0'),'sales',coalesce((select count(*)::text from realized),'0'),'refund_cents',(select amount from refunds),
'pending_cents',coalesce((select sum(gross)::text from production where status in ('PENDING','OVERDUE','AWAITING_RISK_ANALYSIS','AUTHORIZED')and due_on between p_from and p_to),'0'),
'confirmed_awaiting_cents',coalesce((select sum(gross)::text from realized where status='CONFIRMED'),'0'),
'received_net_cents',case when exists(select 1 from realized where status='RECEIVED'and net is null)then null else coalesce((select sum(net)::text from realized where status='RECEIVED'),'0')end,
'daily',coalesce((select jsonb_agg(to_jsonb(d)order by day)from daily d),'[]'),
'payments',coalesce((select jsonb_agg(jsonb_build_object('id',payment_id,'label',label,'environment',environment,'payload',payload,'synced_at',synced_at))from(select * from payments order by synced_at desc limit 1000)p),'[]'),
'definition','Fonte Asaas separada do livro manual. CONFIRMED ainda não é saldo disponível; RECEIVED é recebido. Receita por data de confirmação, pendências por vencimento e estornos DONE por data. Sandbox nunca integra receita de produção. Recebimentos não equivalem ao saldo bancário atual.'));
end $$;
revoke all on function public.eg_asaas_report(uuid,uuid,date,date,uuid) from public,anon;
grant execute on function public.eg_asaas_report(uuid,uuid,date,date,uuid)to authenticated;
create function evergreen_private.asaas_goal_value(g uuid,w uuid,c uuid,metric text,f date,t date)returns text language plpgsql stable security definer set search_path=''as $$
declare report jsonb;begin report:=public.eg_asaas_report(g,w,f,t,c);return case when metric='asaas_sales'then report->>'sales'else ((report->>'gross_cents')::bigint-(report->>'refund_cents')::bigint)::text end;end $$;
revoke all on function evergreen_private.asaas_goal_value(uuid,uuid,uuid,text,date,date)from public,anon,authenticated;

create table evergreen_private.asaas_sync_state(integration_id uuid primary key references public.eg_integrations,next_offset integer not null default 0,last_complete timestamptz,last_attempt timestamptz not null default now());
revoke all on evergreen_private.asaas_sync_state from public,anon,authenticated;
create function public.eg_asaas_checkpoint(p_id uuid,p_next integer)returns void language plpgsql security definer set search_path=''as $$
begin insert into evergreen_private.asaas_sync_state(integration_id,next_offset,last_complete)values(p_id,coalesce(p_next,0),case when p_next is null then now()else null end)on conflict(integration_id)do update set next_offset=excluded.next_offset,last_complete=coalesce(excluded.last_complete,asaas_sync_state.last_complete),last_attempt=now();update public.eg_integrations set last_sync=now(),state='connected',last_error=null where id=p_id;end $$;
create function public.eg_asaas_due()returns jsonb language sql security definer set search_path=''as $$
with selected as materialized(select i.id,coalesce(s.next_offset,0)offset_value from public.eg_integrations i left join evergreen_private.asaas_sync_state s on s.integration_id=i.id where i.provider='asaas'and i.state<>'disabled'order by s.last_attempt nulls first,i.id limit 5),claimed as(insert into evergreen_private.asaas_sync_state(integration_id,next_offset,last_attempt)select id,offset_value,now()from selected on conflict(integration_id)do update set last_attempt=now()returning integration_id)select coalesce(jsonb_agg(jsonb_build_object('id',id,'offset',offset_value)),'[]')from selected$$;
revoke all on function public.eg_asaas_checkpoint(uuid,integer),public.eg_asaas_due()from public,anon,authenticated;
grant execute on function public.eg_asaas_checkpoint(uuid,integer),public.eg_asaas_due()to service_role;

create function evergreen_private.asaas_goal_ready(g uuid,w uuid,c uuid)returns boolean language sql stable security definer set search_path=''as $$
with scoped as(select i.id,s.last_complete,s.next_offset,i.state from public.eg_integrations i left join evergreen_private.asaas_sync_state s on s.integration_id=i.id where i.provider='asaas'and i.config->>'environment'='production'and(w is null or i.workspace_id=w)and(c is null or(i.config->>'companyId')::uuid=c)and evergreen_private.finance_role((i.config->>'companyId')::uuid)and(g is null or exists(select 1 from public.eg_group_companies gc where gc.group_id=g and gc.workspace_id=i.workspace_id and evergreen_private.founder_can(g,'finance',i.workspace_id))))select exists(select 1 from scoped)and not exists(select 1 from scoped where last_complete is null or last_complete<now()-interval '25 hours' or next_offset<>0 or state<>'connected')$$;
revoke all on function evergreen_private.asaas_goal_ready(uuid,uuid,uuid)from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)values('eg-finance-receipts','eg-finance-receipts',false,4194304,array['image/png','image/jpeg','image/webp','application/pdf']);
create function evergreen_private.finance_receipt_access(path text,writing boolean)returns boolean language plpgsql stable security definer set search_path=''as $$
declare parts text[];begin parts:=string_to_array(path,'/');if array_length(parts,1)<>3 or length(parts[3])>150 then return false;end if;
return evergreen_private.finance_role(parts[1]::uuid,case when writing then array['admin','editor']else array['admin','editor','viewer']end)and(not writing or parts[2]=auth.uid()::text);
exception when invalid_text_representation then return false;end $$;
revoke all on function evergreen_private.finance_receipt_access(text,boolean)from public,anon;
grant execute on function evergreen_private.finance_receipt_access(text,boolean)to authenticated;
create policy finance_receipt_read on storage.objects for select to authenticated using(bucket_id='eg-finance-receipts'and evergreen_private.finance_receipt_access(name,false));
create policy finance_receipt_insert on storage.objects for insert to authenticated with check(bucket_id='eg-finance-receipts'and evergreen_private.finance_receipt_access(name,true));
create policy finance_receipt_delete on storage.objects for delete to authenticated using(bucket_id='eg-finance-receipts'and evergreen_private.finance_receipt_access(name,true)and not exists(select 1 from public.eg_fin_details where receipt_path=name));

commit;
