-- Evergreen Economy: internal ledger, exact cents; NOT a banking connection.
begin;
create table public.eg_fin_companies(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.eg_workspaces,name text not null check(length(trim(name)) between 1 and 100),currency text not null check(currency ~ '^[A-Z]{3}$'),created_at timestamptz not null default now());
create table public.eg_fin_members(company_id uuid not null references public.eg_fin_companies,user_id uuid not null references auth.users,role text not null check(role in ('admin','editor','viewer')),primary key(company_id,user_id));
create table public.eg_fin_accounts(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.eg_fin_companies,name text not null check(length(trim(name)) between 1 and 100),kind text not null check(kind in ('checking','reserve')),created_at timestamptz not null default now());
create table public.eg_fin_events(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.eg_workspaces,request_id uuid not null,actor_id uuid not null references auth.users,kind text not null check(kind in ('income','expense','transfer','reversal')),description text not null check(length(trim(description)) between 1 and 500),happened_on date not null default current_date,created_at timestamptz not null default now(),reverses uuid unique references public.eg_fin_events,payload jsonb not null,unique(actor_id,request_id));
create table public.eg_fin_entries(id uuid primary key default gen_random_uuid(),event_id uuid not null references public.eg_fin_events,account_id uuid not null references public.eg_fin_accounts,cents bigint not null check(cents<>0 and abs(cents)<=9000000000000000));
create index eg_fin_entries_account on public.eg_fin_entries(account_id,event_id);
create index eg_fin_events_workspace on public.eg_fin_events(workspace_id,created_at desc,id desc);
create table public.eg_fin_goals(id uuid primary key default gen_random_uuid(),account_id uuid not null unique references public.eg_fin_accounts,name text not null check(length(trim(name)) between 1 and 100),target_cents bigint not null check(target_cents>0 and target_cents<=9000000000000000),due_on date);
create table public.eg_fin_budgets(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.eg_fin_companies,month date not null check(extract(day from month)=1),income_cents bigint not null check(income_cents between 0 and 9000000000000000),expense_cents bigint not null check(expense_cents between 0 and 9000000000000000),version integer not null default 1,unique(company_id,month));
create table public.eg_fin_audit(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.eg_fin_companies,actor_id uuid not null default auth.uid() references auth.users,action text not null,details jsonb not null,created_at timestamptz not null default now());

create index eg_fin_companies_workspace on public.eg_fin_companies(workspace_id);
create index eg_fin_members_user on public.eg_fin_members(user_id,company_id);
create index eg_fin_accounts_company on public.eg_fin_accounts(company_id);
create index eg_fin_entries_event on public.eg_fin_entries(event_id,account_id);
create index eg_fin_audit_company on public.eg_fin_audit(company_id,created_at desc);
create function evergreen_private.finance_role(c uuid,roles text[] default array['admin','editor','viewer']) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.live_session() and exists(select 1 from public.eg_fin_members m join public.eg_fin_companies co on co.id=m.company_id where m.company_id=c and m.user_id=auth.uid() and m.role=any(roles) and evergreen_private.member_of(co.workspace_id));$$;
do $$ declare t text;begin foreach t in array array['eg_fin_companies','eg_fin_members','eg_fin_accounts','eg_fin_events','eg_fin_entries','eg_fin_goals','eg_fin_budgets','eg_fin_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;end $$;
create policy financial_company_read on public.eg_fin_companies for select to authenticated using(evergreen_private.finance_role(id));
create policy financial_member_read on public.eg_fin_members for select to authenticated using(evergreen_private.finance_role(company_id));
create policy financial_account_read on public.eg_fin_accounts for select to authenticated using(evergreen_private.finance_role(company_id));
create policy financial_entry_read on public.eg_fin_entries for select to authenticated using(exists(select 1 from public.eg_fin_accounts a where a.id=account_id and evergreen_private.finance_role(a.company_id)));
-- Event descriptions can contain names of both transfer parties: expose only in the
-- filtered snapshot, never through direct event reads for a one-sided observer.
create policy financial_event_read on public.eg_fin_events for select to authenticated using(
 evergreen_private.live_session() and exists(select 1 from public.eg_fin_entries en join public.eg_fin_accounts a on a.id=en.account_id where en.event_id=eg_fin_events.id)
 and not exists(select 1 from public.eg_fin_entries en join public.eg_fin_accounts a on a.id=en.account_id where en.event_id=eg_fin_events.id and not evergreen_private.finance_role(a.company_id)));
create policy financial_goal_read on public.eg_fin_goals for select to authenticated using(exists(select 1 from public.eg_fin_accounts a where a.id=account_id and evergreen_private.finance_role(a.company_id)));
create policy financial_budget_read on public.eg_fin_budgets for select to authenticated using(evergreen_private.finance_role(company_id));
create policy financial_audit_read on public.eg_fin_audit for select to authenticated using(evergreen_private.finance_role(company_id,array['admin']));

create function evergreen_private.related_finance_workspaces(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$select a=b$$;
create function public.eg_economy_targets(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
if not evergreen_private.member_of(p_workspace) then raise exception 'Workspace não autorizado.' using errcode='42501';end if;
return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'company_id',c.id,'company_name',c.name,'workspace_name',w.name,'name',a.name,'currency',c.currency)) from public.eg_fin_accounts a join public.eg_fin_companies c on c.id=a.company_id join public.eg_workspaces w on w.id=c.workspace_id where evergreen_private.finance_role(c.id,array['admin','editor']) and evergreen_private.related_finance_workspaces(p_workspace,c.workspace_id)),'[]'::jsonb);end $$;
revoke all on function public.eg_economy_targets(uuid),evergreen_private.related_finance_workspaces(uuid,uuid) from public,anon;grant execute on function public.eg_economy_targets(uuid),evergreen_private.related_finance_workspaces(uuid,uuid) to authenticated;

create function public.eg_economy_action(p_workspace uuid,p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
 declare c uuid;a uuid;b uuid;e uuid;old public.eg_fin_events;co public.eg_fin_companies;cb public.eg_fin_companies;amount bigint;rid uuid;result uuid;rec record;bal numeric;incoming numeric;fingerprint jsonb;
 begin
 perform evergreen_private.require_recent();
 if not evergreen_private.member_of(p_workspace) then raise exception 'Empresa não autorizada.' using errcode='42501';end if;
 if jsonb_typeof(p_data)<>'object' or length(p_data::text)>12000 then raise exception 'Dados inválidos.';end if;
 if p_action='company' then
 if not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=auth.uid() and role='owner') then raise exception 'Responsável da empresa necessário.' using errcode='42501';end if;
 insert into public.eg_fin_companies(workspace_id,name,currency) values(p_workspace,trim(p_data->>'name'),upper(p_data->>'currency')) returning id into result;
 insert into public.eg_fin_members values(result,auth.uid(),'admin');
 insert into public.eg_fin_audit(company_id,action,details) values(result,'company.created',jsonb_build_object('id',result));
 return result;
 end if;
 if p_action in ('account','goal','budget','grant') then
 c:=(p_data->>'company_id')::uuid;
 select * into co from public.eg_fin_companies where id=c and workspace_id=p_workspace;
 if co.id is null or not evergreen_private.finance_role(c,array['admin']) then raise exception 'Administrador financeiro necessário.' using errcode='42501';end if;
 if p_action='grant' then
 if not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=(p_data->>'user_id')::uuid) then raise exception 'Pessoa fora da empresa.';end if;
 if (p_data->>'user_id')::uuid=auth.uid() then raise exception 'Não altere o próprio acesso financeiro.';end if;
 if p_data->>'role'='remove' then delete from public.eg_fin_members where company_id=c and user_id=(p_data->>'user_id')::uuid;
 else insert into public.eg_fin_members values(c,(p_data->>'user_id')::uuid,p_data->>'role') on conflict(company_id,user_id) do update set role=excluded.role;end if;
 result:=c;
 elsif p_action in ('account','goal') then
 insert into public.eg_fin_accounts(company_id,name,kind) values(c,trim(p_data->>'name'),case when p_action='goal' then 'reserve' else 'checking' end) returning id into result;
 if p_action='goal' then insert into public.eg_fin_goals(account_id,name,target_cents,due_on) values(result,trim(p_data->>'name'),(p_data->>'target_cents')::bigint,(p_data->>'due_on')::date);end if;
 else
 if exists(select 1 from public.eg_fin_budgets where company_id=c and month=(p_data->>'month')::date) then
 update public.eg_fin_budgets set income_cents=(p_data->>'income_cents')::bigint,expense_cents=(p_data->>'expense_cents')::bigint,version=version+1 where company_id=c and month=(p_data->>'month')::date and version=(p_data->>'version')::integer returning id into result;
 if result is null then raise exception 'Orçamento alterado. Atualize antes de salvar.' using errcode='40001';end if;
 else insert into public.eg_fin_budgets(company_id,month,income_cents,expense_cents) values(c,(p_data->>'month')::date,(p_data->>'income_cents')::bigint,(p_data->>'expense_cents')::bigint) returning id into result;end if;
 end if;
 insert into public.eg_fin_audit(company_id,action,details) values(c,p_action,p_data);
 return result;
 end if;
 if p_action not in ('income','expense','transfer','reversal') then raise exception 'Ação indisponível.';end if;
 rid:=(p_data->>'request_id')::uuid;
 if rid is null then raise exception 'Requisição idempotente necessária.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||rid::text,0));
 fingerprint:=jsonb_build_object('action',p_action,'workspace',p_workspace,'data',p_data);
 select * into old from public.eg_fin_events where actor_id=auth.uid() and request_id=rid;
 if old.id is not null then
 if old.payload<>fingerprint then raise exception 'Código de requisição reutilizado com dados diferentes.';end if;
 if exists(select 1 from public.eg_fin_entries en join public.eg_fin_accounts ac on ac.id=en.account_id where en.event_id=old.id and not evergreen_private.finance_role(ac.company_id,array['admin','editor'])) then raise exception 'Acesso revogado.' using errcode='42501';end if;
 return old.id;
 end if;
 if p_action='reversal' then
 select * into old from public.eg_fin_events where id=(p_data->>'event_id')::uuid and exists(select 1 from public.eg_fin_entries en join public.eg_fin_accounts ac on ac.id=en.account_id join public.eg_fin_companies fc on fc.id=ac.company_id where en.event_id=eg_fin_events.id and fc.workspace_id=p_workspace) for update;
 if old.id is null or old.kind='reversal' or exists(select 1 from public.eg_fin_events where reverses=old.id) then raise exception 'Lançamento indisponível para estorno.';end if;
 if exists(select 1 from public.eg_fin_entries en join public.eg_fin_accounts ac on ac.id=en.account_id where en.event_id=old.id and not evergreen_private.finance_role(ac.company_id,array['admin','editor'])) then raise exception 'Acesso às duas pontas necessário.' using errcode='42501';end if;
 perform 1 from public.eg_fin_accounts where id in(select account_id from public.eg_fin_entries where event_id=old.id) order by id for update;
 for rec in select account_id,sum(cents) as cents from public.eg_fin_entries where event_id=old.id group by account_id loop
 select coalesce(sum(cents),0) into bal from public.eg_fin_entries where account_id=rec.account_id;
 if bal-rec.cents<0 then raise exception 'Saldo insuficiente para estornar.';end if;
 end loop;
 insert into public.eg_fin_events(workspace_id,request_id,actor_id,kind,description,reverses,payload) values(p_workspace,rid,auth.uid(),'reversal',trim(p_data->>'description'),old.id,fingerprint) returning id into e;
 insert into public.eg_fin_entries(event_id,account_id,cents) select e,account_id,-cents from public.eg_fin_entries where event_id=old.id;
 return e;
 end if;
 a:=(p_data->>'account_id')::uuid;b:=nullif(p_data->>'to_account_id','')::uuid;amount:=(p_data->>'cents')::bigint;
 if amount is null or amount<=0 or amount>9000000000000000 then raise exception 'Valor positivo em centavos necessário.';end if;
 select fc.* into co from public.eg_fin_accounts ac join public.eg_fin_companies fc on fc.id=ac.company_id where ac.id=a and fc.workspace_id=p_workspace;
 if co.id is null or not evergreen_private.finance_role(co.id,array['admin','editor']) then raise exception 'Conta não autorizada.' using errcode='42501';end if;
 if p_action='transfer' then
 select fc.* into cb from public.eg_fin_accounts ac join public.eg_fin_companies fc on fc.id=ac.company_id where ac.id=b;
 if b=a or cb.id is null or not evergreen_private.related_finance_workspaces(p_workspace,cb.workspace_id) or co.currency<>cb.currency or not evergreen_private.finance_role(cb.id,array['admin','editor']) then raise exception 'Transferência requer contas distintas, mesma moeda e acesso às duas empresas.' using errcode='42501';end if;
 end if;
 perform 1 from public.eg_fin_accounts where id=a or (p_action='transfer' and id=b) order by id for update;
 select coalesce(sum(cents),0) into bal from public.eg_fin_entries where account_id=a;
 if p_action<>'income' and bal<amount then raise exception 'Saldo insuficiente.';end if;
 insert into public.eg_fin_events(workspace_id,request_id,actor_id,kind,description,happened_on,payload) values(p_workspace,rid,auth.uid(),p_action,trim(p_data->>'description'),coalesce((p_data->>'happened_on')::date,current_date),fingerprint) returning id into e;
 insert into public.eg_fin_entries(event_id,account_id,cents) values(e,a,case when p_action='income' then amount else -amount end);
 if p_action='transfer' then insert into public.eg_fin_entries(event_id,account_id,cents) values(e,b,amount);end if;
 return e;
 end $$;

create function public.eg_economy_snapshot(p_workspace uuid,p_from date default date_trunc('month',current_date)::date,p_to date default current_date) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare result jsonb;
 begin
 if not evergreen_private.member_of(p_workspace) then raise exception 'Workspace não autorizado.' using errcode='42501';end if;
 if p_to<p_from or p_to-p_from>3660 then raise exception 'Período inválido (máximo 10 anos).';end if;
 with companies as(select c.*,m.role from public.eg_fin_companies c join public.eg_fin_members m on m.company_id=c.id and m.user_id=auth.uid() where c.workspace_id=p_workspace and evergreen_private.finance_role(c.id)),
 accounts as(select a.*,c.currency,coalesce((select sum(en.cents) from public.eg_fin_entries en where en.account_id=a.id),0) balance from public.eg_fin_accounts a join companies c on c.id=a.company_id),
 flows as(select ac.company_id,coalesce(orig.kind,e.kind) category,en.cents from public.eg_fin_entries en join accounts ac on ac.id=en.account_id join public.eg_fin_events e on e.id=en.event_id left join public.eg_fin_events orig on orig.id=e.reverses where e.happened_on between p_from and p_to)
 select jsonb_build_object(
 'companies',coalesce((select jsonb_agg(to_jsonb(c)) from companies c),'[]'::jsonb),
 'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'company_id',a.company_id,'name',a.name,'kind',a.kind,'currency',a.currency,'balance',a.balance::text)) from accounts a),'[]'::jsonb),
 'goals',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'account_id',g.account_id,'name',g.name,'target_cents',g.target_cents::text,'due_on',g.due_on)) from public.eg_fin_goals g join accounts ac on ac.id=g.account_id),'[]'::jsonb),
 'budgets',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'company_id',b.company_id,'month',b.month,'income_cents',b.income_cents::text,'expense_cents',b.expense_cents::text,'version',b.version)) from public.eg_fin_budgets b join companies c on c.id=b.company_id where b.month between date_trunc('month',p_from)::date and p_to),'[]'::jsonb),
 'flows',coalesce((select jsonb_agg(jsonb_build_object('company_id',f.company_id,'income',f.income::text,'expense',f.expense::text)) from(select company_id,coalesce(sum(cents) filter(where category='income'),0) income,-coalesce(sum(cents) filter(where category='expense'),0) expense from flows group by company_id) f),'[]'::jsonb),
 'can_create',exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=auth.uid() and role='owner')
 ) into result;
 return result;end $$;

create function public.eg_economy_history(p_workspace uuid,p_before timestamptz default null,p_before_id uuid default null,p_from date default date_trunc('month',current_date)::date,p_to date default current_date) returns jsonb language plpgsql stable security definer set search_path='' as $$
 begin
 if not evergreen_private.member_of(p_workspace) then raise exception 'Workspace não autorizado.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc,r.id desc) from(
 select en.id,en.event_id,en.account_id,en.cents::text,e.kind,e.happened_on,e.created_at,
 case when exists(select 1 from public.eg_fin_entries other join public.eg_fin_accounts oa on oa.id=other.account_id where other.event_id=e.id and not evergreen_private.finance_role(oa.company_id)) then 'Transferência · contraparte restrita' else e.description end description,
 exists(select 1 from public.eg_fin_events re where re.reverses=e.id) reversed,
 not exists(select 1 from public.eg_fin_entries other join public.eg_fin_accounts oa on oa.id=other.account_id where other.event_id=e.id and not evergreen_private.finance_role(oa.company_id,array['admin','editor'])) can_reverse
 from public.eg_fin_entries en join public.eg_fin_accounts ac on ac.id=en.account_id join public.eg_fin_companies c on c.id=ac.company_id join public.eg_fin_events e on e.id=en.event_id
 where c.workspace_id=p_workspace and evergreen_private.finance_role(c.id) and e.happened_on between p_from and p_to
 and (p_before is null or (e.created_at,en.id)<(p_before,p_before_id)) order by e.created_at desc,en.id desc limit 50
 )r),'[]'::jsonb);end $$;

revoke all on function evergreen_private.finance_role(uuid,text[]) from public,anon;grant execute on function evergreen_private.finance_role(uuid,text[]) to authenticated;
revoke all on function public.eg_economy_action(uuid,text,jsonb),public.eg_economy_snapshot(uuid,date,date),public.eg_economy_history(uuid,timestamptz,uuid,date,date) from public,anon;
grant execute on function public.eg_economy_action(uuid,text,jsonb),public.eg_economy_snapshot(uuid,date,date),public.eg_economy_history(uuid,timestamptz,uuid,date,date) to authenticated;
commit;
