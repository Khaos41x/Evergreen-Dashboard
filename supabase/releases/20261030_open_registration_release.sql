-- Atomic release: identity, finance, founders and OPEN registration.
-- Legacy invitation-only migration is excluded.
begin;

-- Source: 20261029100000_identity_server.sql SHA256 4d18b3541b6fd67a6ec8db667079c3c7e1213c90a5865281d8e455cc9b56e327
-- Identity BFF: official Supabase sessions, profile metadata and live revocation.
-- Apply only after productivity + designated owner + internal holding migration.

alter table public.eg_profiles add column job_title text not null default '' check(length(job_title)<=100);
grant update(job_title) on public.eg_profiles to authenticated;

create function evergreen_private.live_session() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
 select 1 from auth.sessions s where s.user_id=auth.uid() and s.id::text=auth.jwt()->>'session_id'
 and (to_jsonb(s)->>'not_after' is null or (to_jsonb(s)->>'not_after')::timestamptz>now()));
$$;
create function evergreen_private.recent_auth() returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.live_session() and exists(
 select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a
 where a->>'method' in ('otp','totp','password','webauthn','passkey')
 and (a->>'timestamp') ~ '^[0-9]+$'
 and to_timestamp((a->>'timestamp')::numeric) between now()-interval '5 minutes' and now()+interval '30 seconds');
$$;
create function evergreen_private.require_recent() returns void language plpgsql stable security definer set search_path='' as $$
 begin if not evergreen_private.recent_auth() then raise exception 'REAUTH_REQUIRED: confirme sua identidade novamente.' using errcode='42501';end if;end $$;
create or replace function evergreen_private.member_of(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.live_session() and exists(select 1 from public.eg_members where workspace_id=w and user_id=auth.uid());$$;
create or replace function evergreen_private.admin_of(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.live_session() and exists(select 1 from public.eg_members where workspace_id=w and user_id=auth.uid() and role in ('owner','admin'));$$;

-- Restrictive policies also close the access-JWT window after signOut revokes auth.sessions.
-- A trigger covers writes performed by pre-existing SECURITY DEFINER RPCs.
create function evergreen_private.session_write_guard() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is not null and not evergreen_private.live_session() then raise exception 'Sessão revogada.' using errcode='42501';end if;
 if TG_OP='DELETE' then return old;else return new;end if;
 end $$;
do $$ declare t record;begin
 for t in select tablename from pg_tables where schemaname='public' and tablename like 'eg\_%' escape '\' loop
 execute format('create policy eg_live_session on public.%I as restrictive for all to authenticated using(evergreen_private.live_session()) with check(evergreen_private.live_session())',t.tablename);
 execute format('create trigger eg_session_write before insert or update or delete on public.%I for each row execute function evergreen_private.session_write_guard()',t.tablename);
 end loop;
end $$;

create function public.eg_identity_check_invite(p_email text,p_invite uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.eg_invites where token=p_invite and lower(trim(email))=lower(trim(p_email)) and accepted_by is null and expires_at>now());$$;
create policy eg_storage_live_session on storage.objects as restrictive for all to authenticated using(evergreen_private.live_session()) with check(evergreen_private.live_session());
create policy eg_realtime_live_session on realtime.messages as restrictive for all to authenticated using(evergreen_private.live_session()) with check(evergreen_private.live_session());
-- Google cannot carry application metadata reliably. Pending invitation + verified
-- provider email permits account creation; membership still requires token acceptance.
create or replace function evergreen_private.require_staff_invite() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if not exists(select 1 from public.eg_invites i where lower(trim(i.email))=lower(trim(new.email))
 and i.accepted_by is null and i.expires_at>now()
 and (nullif(new.raw_user_meta_data->>'evergreen_invite','') is null or i.token::text=new.raw_user_meta_data->>'evergreen_invite'))
 then raise exception 'Convite da empresa necessário.' using errcode='42501';end if;
 return new;end $$;

revoke all on function evergreen_private.require_staff_invite() from public,anon,authenticated;
create function public.eg_identity_bootstrap(p_invite uuid default null,p_name text default null,p_job_title text default null,p_timezone text default null) returns void language plpgsql security definer set search_path='' as $$
 declare u auth.users;n text;j text;z text;
 begin
 if not evergreen_private.live_session() then raise exception 'Sessão necessária.' using errcode='42501';end if;
 select * into u from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if u.id is null then raise exception 'Confirme seu e-mail.' using errcode='42501';end if;
 n:=coalesce(nullif(trim(p_name),''),nullif(trim(u.raw_user_meta_data->>'display_name'),''),nullif(trim(u.raw_user_meta_data->>'full_name'),''),'Membro');
 j:=coalesce(p_job_title,u.raw_user_meta_data->>'job_title','');
 z:=coalesce(p_timezone,u.raw_user_meta_data->>'timezone','UTC');
 if not exists(select 1 from pg_timezone_names where name=z) then z:='UTC';end if;
 insert into public.eg_profiles(id,display_name,job_title,timezone) values(u.id,n,j,z) on conflict(id) do nothing;
 if p_name is not null or p_job_title is not null then
 update public.eg_profiles set display_name=coalesce(p_name,display_name),job_title=coalesce(p_job_title,job_title) where id=u.id;
 end if;
 if p_invite is not null and exists(select 1 from public.eg_profiles where id=u.id and length(trim(job_title))>0) then perform evergreen_private.accept_invite(p_invite);end if;
 end $$;
create function public.eg_identity_context() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('active',evergreen_private.live_session(),'recent_auth',evergreen_private.recent_auth(),'session_id',auth.jwt()->>'session_id',
 'profile',(select jsonb_build_object('display_name',display_name,'job_title',job_title) from public.eg_profiles where id=auth.uid() and evergreen_private.live_session()),
 'workspaces',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'role',m.role) order by w.created_at)
 from public.eg_members m join public.eg_workspaces w on w.id=m.workspace_id where m.user_id=auth.uid() and evergreen_private.live_session()),'[]'::jsonb));$$;
create function public.eg_identity_sessions() returns jsonb language plpgsql stable security definer set search_path='' as $$
 begin if not evergreen_private.live_session() then raise exception 'Sessão necessária.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'created_at',s.created_at,'user_agent',to_jsonb(s)->>'user_agent','current',s.id::text=auth.jwt()->>'session_id') order by s.created_at desc) from auth.sessions s where s.user_id=auth.uid()),'[]'::jsonb);end $$;

drop function public.eg_public_profiles(uuid);
drop function evergreen_private.public_profiles(uuid);
create function evergreen_private.public_profiles(w uuid) returns table(id uuid,display_name text,username text,bio text,avatar_path text,custom_status text,job_title text) language sql stable security definer set search_path='' as $$
 select p.id,p.display_name,p.username,p.bio,p.avatar_path,p.custom_status,p.job_title from public.eg_profiles p join public.eg_members m on m.user_id=p.id where m.workspace_id=w and evergreen_private.member_of(w);$$;
create function public.eg_public_profiles(p_workspace uuid) returns table(id uuid,display_name text,username text,bio text,avatar_path text,custom_status text,job_title text) language sql security invoker set search_path='' as $$select * from evergreen_private.public_profiles(p_workspace)$$;

-- All newly introduced functions have explicit exposure, no default public execute.
do $$ declare f record;begin for f in
 select p.oid::regprocedure signature,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where
 (n.nspname='public' and p.proname like 'eg_identity_%') or
 (n.nspname='evergreen_private' and p.proname in ('live_session','recent_auth','require_recent','session_write_guard','public_profiles')) or
 (n.nspname='public' and p.proname='eg_public_profiles')
 loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 if f.proname<>'session_write_guard' then execute format('grant execute on function %s to authenticated',f.signature);end if;
 end loop;end $$;
grant execute on function public.eg_identity_check_invite(text,uuid) to anon;


-- Source: 20261029110000_economy_ledger.sql SHA256 1dadcca616483cbf219d177d9b3541eb0c578f1803f8e94914d8097daa741ea3
-- Evergreen Economy: internal ledger, exact cents; NOT a banking connection.

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


-- Source: 20261029120000_founders_governance.sql SHA256 bdd5ff678809ca16d67b7839c448505d80178ead63736a031be9f7e82ea7231f
-- Executive layer. Role labels never replace explicit capabilities/company grants.

create table public.eg_groups(id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 1 and 100),owner_id uuid not null references auth.users,communication_workspace uuid not null unique references public.eg_workspaces,channel_id uuid not null unique references public.eg_channels,created_at timestamptz not null default now());
create table public.eg_group_members(group_id uuid not null references public.eg_groups,user_id uuid not null references auth.users,role text not null check(role in ('group_owner','founder','group_executive')),capabilities text[] not null check(capabilities<@array['overview','companies','finance','people','projects','intelligence','decisions','communication','governance','documents']),primary key(group_id,user_id));
create table public.eg_group_companies(group_id uuid not null references public.eg_groups,workspace_id uuid not null references public.eg_workspaces,primary key(group_id,workspace_id),unique(workspace_id));
create table public.eg_group_scopes(group_id uuid not null,user_id uuid not null,workspace_id uuid not null,capabilities text[] not null check(capabilities<@array['overview','companies','finance','people','projects','intelligence','decisions','documents']),primary key(group_id,user_id,workspace_id),foreign key(group_id,user_id) references public.eg_group_members on delete cascade,foreign key(group_id,workspace_id) references public.eg_group_companies on delete cascade);
create table public.eg_decisions(id uuid primary key default gen_random_uuid(),group_id uuid not null references public.eg_groups,workspace_id uuid,title text not null check(length(trim(title)) between 1 and 200),body text not null check(length(body)<=10000),author_id uuid not null default auth.uid() references auth.users,quorum integer not null check(quorum between 1 and 100),deadline timestamptz not null,status text not null default 'open' check(status in ('open','approved','rejected','expired')),created_at timestamptz not null default now(),foreign key(group_id,workspace_id) references public.eg_group_companies);
create table public.eg_decision_voters(decision_id uuid references public.eg_decisions,user_id uuid references auth.users,primary key(decision_id,user_id));
create table public.eg_decision_votes(decision_id uuid,user_id uuid,approve boolean not null,created_at timestamptz not null default now(),primary key(decision_id,user_id),foreign key(decision_id,user_id) references public.eg_decision_voters);
create table public.eg_founder_documents(id uuid primary key default gen_random_uuid(),group_id uuid not null references public.eg_groups,workspace_id uuid,title text not null check(length(trim(title)) between 1 and 200),path text not null unique,author_id uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),foreign key(group_id,workspace_id) references public.eg_group_companies);
create table public.eg_group_audit(id uuid primary key default gen_random_uuid(),group_id uuid not null references public.eg_groups,actor_id uuid not null default auth.uid() references auth.users,action text not null,details jsonb not null,created_at timestamptz not null default now());
create index eg_group_members_user on public.eg_group_members(user_id,group_id);
create index eg_group_scopes_workspace on public.eg_group_scopes(workspace_id,user_id);
create index eg_decisions_group on public.eg_decisions(group_id,created_at desc);
create index eg_founder_documents_group on public.eg_founder_documents(group_id,workspace_id);
create index eg_group_audit_group on public.eg_group_audit(group_id,created_at desc);
create or replace function evergreen_private.related_finance_workspaces(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
select a=b or exists(select 1 from public.eg_group_companies x join public.eg_group_companies y on y.group_id=x.group_id where x.workspace_id=a and y.workspace_id=b);$$;
create function evergreen_private.founder_can(g uuid,cap text,w uuid default null) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.live_session() and exists(select 1 from public.eg_group_members m where m.group_id=g and m.user_id=auth.uid() and cap=any(m.capabilities) and (w is null or exists(select 1 from public.eg_group_scopes s where s.group_id=g and s.user_id=auth.uid() and s.workspace_id=w and cap=any(s.capabilities))));$$;
create function evergreen_private.group_owner(g uuid) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.founder_can(g,'governance') and exists(select 1 from public.eg_groups where id=g and owner_id=auth.uid());$$;
create function public.eg_founders_access() returns boolean language sql stable security definer set search_path='' as $$select evergreen_private.live_session() and exists(select 1 from public.eg_group_members where user_id=auth.uid() and cardinality(capabilities)>0);$$;
create function public.eg_founders_groups() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'role',m.role,'capabilities',m.capabilities,'owner',g.owner_id=auth.uid())),'[]'::jsonb) from public.eg_groups g join public.eg_group_members m on m.group_id=g.id where m.user_id=auth.uid() and evergreen_private.live_session();$$;
do $$ declare t text;begin foreach t in array array['eg_groups','eg_group_members','eg_group_companies','eg_group_scopes','eg_decisions','eg_decision_voters','eg_decision_votes','eg_founder_documents','eg_group_audit'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);end loop;end $$;
create policy group_read on public.eg_groups for select to authenticated using(exists(select 1 from public.eg_group_members m where m.group_id=id and m.user_id=auth.uid()) and evergreen_private.live_session());
create policy group_member_read on public.eg_group_members for select to authenticated using(user_id=auth.uid() and evergreen_private.live_session() or evergreen_private.founder_can(group_id,'governance'));
create policy group_company_read on public.eg_group_companies for select to authenticated using(evergreen_private.founder_can(group_id,'companies',workspace_id));
create policy group_scope_read on public.eg_group_scopes for select to authenticated using(user_id=auth.uid() and evergreen_private.live_session() or evergreen_private.group_owner(group_id));
create policy decision_read on public.eg_decisions for select to authenticated using(evergreen_private.founder_can(group_id,'decisions',workspace_id));
create policy voter_read on public.eg_decision_voters for select to authenticated using(exists(select 1 from public.eg_decisions d where d.id=decision_id and evergreen_private.founder_can(d.group_id,'decisions',d.workspace_id)));
create policy vote_read on public.eg_decision_votes for select to authenticated using(exists(select 1 from public.eg_decisions d where d.id=decision_id and evergreen_private.founder_can(d.group_id,'decisions',d.workspace_id)));
create policy founder_document_read on public.eg_founder_documents for select to authenticated using(evergreen_private.founder_can(group_id,'documents',workspace_id));
create policy group_audit_read on public.eg_group_audit for select to authenticated using(evergreen_private.founder_can(group_id,'governance'));

-- Dedicated private channel uses the existing chat. It grants no company access.
create function evergreen_private.sync_founder_chat(g uuid,u uuid) returns void language plpgsql security definer set search_path='' as $$
 declare gr public.eg_groups;m public.eg_group_members;n text;
 begin select * into gr from public.eg_groups where id=g;select * into m from public.eg_group_members where group_id=g and user_id=u;
 if gr.id is null then return;end if;
 if m.user_id is not null and 'communication'=any(m.capabilities) then
 select display_name into n from public.eg_profiles where id=u;
 insert into public.eg_members values(gr.communication_workspace,u,case when u=gr.owner_id then 'owner' else 'member' end,coalesce(n,'Membro')) on conflict do nothing;
 insert into public.eg_channel_members values(gr.channel_id,u) on conflict do nothing;
 else
 delete from public.eg_channel_members where channel_id=gr.channel_id and user_id=u;
 if u<>gr.owner_id then delete from public.eg_members where workspace_id=gr.communication_workspace and user_id=u;end if;
 end if;end $$;

create function public.eg_founders_action(p_group uuid,p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
 declare g public.eg_groups;d public.eg_decisions;w uuid;u uuid;result uuid;c uuid;caps text[];yes_count integer;no_count integer;eligible integer;docid uuid;
 begin perform evergreen_private.require_recent();
 if jsonb_typeof(p_data)<>'object' or length(p_data::text)>20000 then raise exception 'Dados inválidos.';end if;
 if p_action='create' then
 if not exists(select 1 from public.eg_members where user_id=auth.uid() and role='owner') then raise exception 'Responsável de empresa necessário.' using errcode='42501';end if;
 w:=evergreen_private.create_workspace(trim(p_data->>'name')||' · Founders');
 c:=evergreen_private.create_channel(w,'fundadores',true);
 insert into public.eg_groups(name,owner_id,communication_workspace,channel_id) values(trim(p_data->>'name'),auth.uid(),w,c) returning id into result;
 insert into public.eg_group_members values(result,auth.uid(),'group_owner',array['overview','companies','finance','people','projects','intelligence','decisions','communication','governance','documents']);
 insert into public.eg_group_audit(group_id,action,details) values(result,'group.created','{}');
 return result;end if;
 select * into g from public.eg_groups where id=p_group;
 if g.id is null or not exists(select 1 from public.eg_group_members where group_id=p_group and user_id=auth.uid()) then raise exception 'Founders não autorizado.' using errcode='42501';end if;
 if p_action in ('link','grant','scope','revoke') then
 if not evergreen_private.group_owner(p_group) then raise exception 'Responsável do grupo necessário.' using errcode='42501';end if;
 if p_action='link' then
 w:=(p_data->>'workspace_id')::uuid;
 if not exists(select 1 from public.eg_members where workspace_id=w and user_id=auth.uid() and role='owner') or exists(select 1 from public.eg_groups where communication_workspace=w) then raise exception 'Vínculo exige ser responsável da empresa e do grupo.' using errcode='42501';end if;
 insert into public.eg_group_companies values(p_group,w);
 insert into public.eg_group_scopes values(p_group,auth.uid(),w,array['overview','companies','people','projects','intelligence','decisions','documents']);
 result:=w;
 else
 u:=(p_data->>'user_id')::uuid;
 if u=g.owner_id then raise exception 'O responsável inicial não pode ser removido ou rebaixado por este fluxo.';end if;
 if p_action='revoke' then delete from public.eg_group_members where group_id=p_group and user_id=u;result:=u;
 else
 if not exists(select 1 from public.eg_members m join public.eg_group_companies co on co.workspace_id=m.workspace_id where co.group_id=p_group and m.user_id=u) then raise exception 'Convide primeiro a pessoa para uma empresa vinculada.';end if;
 select coalesce(array_agg(value),'{}'::text[]) into caps from jsonb_array_elements_text(p_data->'capabilities');
 if p_action='grant' then
 if p_data->>'role' not in ('founder','group_executive') then raise exception 'Papel inválido.';end if;
 insert into public.eg_group_members values(p_group,u,p_data->>'role',caps) on conflict(group_id,user_id) do update set role=excluded.role,capabilities=excluded.capabilities;
 else
 w:=(p_data->>'workspace_id')::uuid;
 insert into public.eg_group_scopes values(p_group,u,w,caps) on conflict(group_id,user_id,workspace_id) do update set capabilities=excluded.capabilities;
 end if;result:=u;
 end if;
 perform evergreen_private.sync_founder_chat(p_group,u);
 end if;
 elsif p_action='self_scope' then
 -- Initial owner also makes company data scopes explicit; no automatic finance.
 if not evergreen_private.group_owner(p_group) then raise exception 'Acesso negado.' using errcode='42501';end if;
 w:=(p_data->>'workspace_id')::uuid;
 if not exists(select 1 from public.eg_group_companies where group_id=p_group and workspace_id=w) then raise exception 'Empresa não vinculada.';end if;
 select coalesce(array_agg(value),'{}'::text[]) into caps from jsonb_array_elements_text(p_data->'capabilities');
 insert into public.eg_group_scopes values(p_group,auth.uid(),w,caps) on conflict(group_id,user_id,workspace_id) do update set capabilities=excluded.capabilities;result:=w;
 elsif p_action='propose' then
 w:=nullif(p_data->>'workspace_id','')::uuid;
 if not evergreen_private.founder_can(p_group,'decisions',w) then raise exception 'Sem permissão para propor.' using errcode='42501';end if;
 if (p_data->>'deadline')::timestamptz<=now() then raise exception 'Prazo futuro necessário.';end if;
 select count(*) into eligible from public.eg_group_members m where m.group_id=p_group and 'decisions'=any(m.capabilities)
 and (w is null or exists(select 1 from public.eg_group_scopes s where s.group_id=p_group and s.user_id=m.user_id and s.workspace_id=w and 'decisions'=any(s.capabilities)));
 if (p_data->>'quorum')::int>eligible then raise exception 'Quórum excede os aprovadores autorizados.';end if;
 insert into public.eg_decisions(group_id,workspace_id,title,body,quorum,deadline) values(p_group,w,trim(p_data->>'title'),coalesce(p_data->>'body',''),(p_data->>'quorum')::int,(p_data->>'deadline')::timestamptz) returning id into result;
 insert into public.eg_decision_voters select result,m.user_id from public.eg_group_members m where m.group_id=p_group and 'decisions'=any(m.capabilities) and (w is null or exists(select 1 from public.eg_group_scopes s where s.group_id=p_group and s.user_id=m.user_id and s.workspace_id=w and 'decisions'=any(s.capabilities)));
 elsif p_action in ('vote','close') then
 select * into d from public.eg_decisions where id=(p_data->>'decision_id')::uuid and group_id=p_group for update;
 if d.id is null or not evergreen_private.founder_can(p_group,'decisions',d.workspace_id) then raise exception 'Decisão não autorizada.' using errcode='42501';end if;
 if d.status<>'open' then raise exception 'Decisão encerrada.';end if;
 if p_action='vote' then
 if d.deadline<=now() or not exists(select 1 from public.eg_decision_voters where decision_id=d.id and user_id=auth.uid()) then raise exception 'Prazo ou elegibilidade inválidos.';end if;
 insert into public.eg_decision_votes values(d.id,auth.uid(),(p_data->>'approve')::boolean,now()) on conflict(decision_id,user_id) do update set approve=excluded.approve,created_at=now();
 else
 if d.author_id<>auth.uid() and not evergreen_private.group_owner(p_group) then raise exception 'Autor ou responsável necessário.';end if;
 select count(*) filter(where v.approve),count(*) filter(where not v.approve) into yes_count,no_count from public.eg_decision_votes v join public.eg_group_members m on m.group_id=p_group and m.user_id=v.user_id where v.decision_id=d.id and 'decisions'=any(m.capabilities) and (d.workspace_id is null or exists(select 1 from public.eg_group_scopes s where s.group_id=p_group and s.user_id=v.user_id and s.workspace_id=d.workspace_id and 'decisions'=any(s.capabilities)));
 if yes_count>=d.quorum then update public.eg_decisions set status='approved' where id=d.id;
 elsif no_count>=d.quorum then update public.eg_decisions set status='rejected' where id=d.id;
 elsif d.deadline<=now() then update public.eg_decisions set status='expired' where id=d.id;
 else raise exception 'Quórum ainda não alcançado.';end if;
 end if;result:=d.id;
 elsif p_action='document' then
 w:=nullif(p_data->>'workspace_id','')::uuid;
 if not evergreen_private.founder_can(p_group,'documents',w) then raise exception 'Documento restrito.' using errcode='42501';end if;
 docid:=gen_random_uuid();
 insert into public.eg_founder_documents(id,group_id,workspace_id,title,path) values(docid,p_group,w,trim(p_data->>'title'),'founders/'||p_group||'/'||docid||'/'||auth.uid()||'/file') returning id into result;
 else raise exception 'Ação inválida.';end if;
 insert into public.eg_group_audit(group_id,action,details) values(p_group,p_action,jsonb_build_object('resource_id',result));
 return result;end $$;

create function public.eg_founders_snapshot(p_group uuid,p_from date default date_trunc('month',current_date)::date,p_to date default current_date) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare g public.eg_groups;
 begin
 if not evergreen_private.live_session() or not exists(select 1 from public.eg_group_members where group_id=p_group and user_id=auth.uid() and cardinality(capabilities)>0) then raise exception 'Founders não autorizado.' using errcode='42501';end if;
 if p_to<p_from or p_to-p_from>3660 then raise exception 'Período inválido.';end if;
 select * into g from public.eg_groups where id=p_group;
 return jsonb_build_object('group',jsonb_build_object('id',g.id,'name',g.name),
 'communication',case when evergreen_private.founder_can(p_group,'communication') then jsonb_build_object('workspace_id',g.communication_workspace,'channel_id',g.channel_id) else null end,
 'companies',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'created_at',w.created_at,'capabilities',s.capabilities))
 from public.eg_group_companies co join public.eg_workspaces w on w.id=co.workspace_id join public.eg_group_scopes s on s.group_id=co.group_id and s.workspace_id=w.id and s.user_id=auth.uid() where co.group_id=p_group and
 exists(select 1 from unnest(s.capabilities) cap where evergreen_private.founder_can(p_group,cap,w.id))),'[]'::jsonb),
 'people',coalesce((select jsonb_agg(jsonb_build_object('workspace_id',m.workspace_id,'id',m.user_id,'name',m.display_name,'role',m.role,'job_title',p.job_title)) from public.eg_members m join public.eg_group_companies co on co.workspace_id=m.workspace_id left join public.eg_profiles p on p.id=m.user_id where co.group_id=p_group and evergreen_private.founder_can(p_group,'people',m.workspace_id)),'[]'::jsonb),
 'records',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'workspace_id',r.workspace_id,'kind',r.kind,'title',r.title,'status',r.status,'due_date',r.due_date,'progress',r.progress,'updated_at',r.updated_at,'assignee_id',r.assignee_id,'project_id',r.project_id)) from public.eg_records r join public.eg_group_companies co on co.workspace_id=r.workspace_id where co.group_id=p_group and not (r.archived_at is not null) and (evergreen_private.founder_can(p_group,'projects',r.workspace_id) or evergreen_private.founder_can(p_group,'intelligence',r.workspace_id))),'[]'::jsonb),
 'finance',coalesce((select jsonb_agg(jsonb_build_object('workspace_id',co.workspace_id,'data',public.eg_economy_snapshot(co.workspace_id,p_from,p_to))) from public.eg_group_companies co where co.group_id=p_group and evergreen_private.founder_can(p_group,'finance',co.workspace_id) and evergreen_private.member_of(co.workspace_id)),'[]'::jsonb),
 'decisions',coalesce((select jsonb_agg(to_jsonb(d)||jsonb_build_object('votes',(select coalesce(jsonb_agg(jsonb_build_object('user_id',v.user_id,'approve',v.approve)),'[]'::jsonb) from public.eg_decision_votes v join public.eg_group_members gm on gm.group_id=p_group and gm.user_id=v.user_id where v.decision_id=d.id and 'decisions'=any(gm.capabilities) and (d.workspace_id is null or exists(select 1 from public.eg_group_scopes gs where gs.group_id=p_group and gs.user_id=v.user_id and gs.workspace_id=d.workspace_id and 'decisions'=any(gs.capabilities))))) order by d.created_at desc) from public.eg_decisions d where d.group_id=p_group and evergreen_private.founder_can(p_group,'decisions',d.workspace_id)),'[]'::jsonb),
 'documents',coalesce((select jsonb_agg(to_jsonb(d)) from public.eg_founder_documents d where d.group_id=p_group and evergreen_private.founder_can(p_group,'documents',d.workspace_id)),'[]'::jsonb),
 'link_options',case when evergreen_private.group_owner(p_group) then coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name)) from public.eg_workspaces w join public.eg_members m on m.workspace_id=w.id and m.user_id=auth.uid() and m.role='owner' where not exists(select 1 from public.eg_groups gx where gx.communication_workspace=w.id) and not exists(select 1 from public.eg_group_companies gc where gc.workspace_id=w.id)),'[]'::jsonb) else '[]'::jsonb end,
 'scope_options',case when evergreen_private.group_owner(p_group) then coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name)) from public.eg_workspaces w join public.eg_group_companies gc on gc.workspace_id=w.id where gc.group_id=p_group),'[]'::jsonb) else '[]'::jsonb end,
 'grant_candidates',case when evergreen_private.group_owner(p_group) then coalesce((select jsonb_agg(to_jsonb(q)) from(select distinct m.user_id id,p.display_name name from public.eg_members m join public.eg_group_companies gc on gc.workspace_id=m.workspace_id join public.eg_profiles p on p.id=m.user_id where gc.group_id=p_group and m.user_id<>g.owner_id)q),'[]'::jsonb) else '[]'::jsonb end,
 'members',case when evergreen_private.founder_can(p_group,'governance') then coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',p.display_name,'role',m.role,'capabilities',m.capabilities)) from public.eg_group_members m left join public.eg_profiles p on p.id=m.user_id where m.group_id=p_group),'[]'::jsonb) else '[]'::jsonb end,
 'audit',case when evergreen_private.founder_can(p_group,'governance') then coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from(select * from public.eg_group_audit where group_id=p_group order by created_at desc limit 100)a),'[]'::jsonb) else '[]'::jsonb end
 );end $$;

-- Same private bucket, new resource authorization. No company document is publicized.
alter function evergreen_private.file_access(text,boolean) rename to original_file_access;
create function evergreen_private.file_access(path text,writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
 declare parts text[];d public.eg_founder_documents;
 begin
 if not evergreen_private.live_session() then return false;end if;
 parts:=string_to_array(path,'/');
 if parts[1]<>'founders' then return evergreen_private.original_file_access(path,writing);end if;
 if array_length(parts,1)<>5 then return false;end if;
 select * into d from public.eg_founder_documents where id=parts[3]::uuid and group_id=parts[2]::uuid and eg_founder_documents.path=file_access.path;
 return d.id is not null and evergreen_private.founder_can(d.group_id,'documents',d.workspace_id) and (not writing or d.author_id=auth.uid() and parts[4]=auth.uid()::text);
 exception when invalid_text_representation then return false;end $$;
-- The ordinary workspace invitation/channel RPCs cannot bypass executive chat access.
create function evergreen_private.founder_chat_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare gr public.eg_groups;
begin
if TG_TABLE_NAME='eg_members' then select * into gr from public.eg_groups where communication_workspace=new.workspace_id;
else select * into gr from public.eg_groups where channel_id=new.channel_id;end if;
if gr.id is not null and not exists(select 1 from public.eg_group_members m where m.group_id=gr.id and m.user_id=new.user_id and 'communication'=any(m.capabilities)) then raise exception 'Canal exclusivo para fundadores autorizados.' using errcode='42501';end if;
return new;end $$;
create trigger eg_founder_member_guard before insert or update on public.eg_members for each row execute function evergreen_private.founder_chat_guard();
create trigger eg_founder_channel_guard before insert or update on public.eg_channel_members for each row execute function evergreen_private.founder_chat_guard();
revoke all on function evergreen_private.founder_chat_guard() from public,anon,authenticated;
-- Existing policies retain function OID on rename: recreate them against the wrapper.
drop policy eg_file_read on storage.objects;drop policy eg_file_insert on storage.objects;drop policy eg_file_delete on storage.objects;
create policy eg_file_read on storage.objects for select to authenticated using(bucket_id='eg-files' and evergreen_private.file_access(name,false));
create policy eg_file_insert on storage.objects for insert to authenticated with check(bucket_id='eg-files' and evergreen_private.file_access(name,true));
create policy eg_file_delete on storage.objects for delete to authenticated using(bucket_id='eg-files' and evergreen_private.file_access(name,true));
do $$ declare f record;begin for f in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('eg_founders_action','eg_founders_access','eg_founders_groups','eg_founders_snapshot') or n.nspname='evergreen_private' and p.proname in('founder_can','group_owner','sync_founder_chat','file_access','original_file_access') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);if f.proname not in('sync_founder_chat','original_file_access') then execute format('grant execute on function %s to authenticated',f.signature);end if;end loop;end $$;


-- Source: 20261029225324_normal_registration.sql SHA256 9562ae59882f48de0a6d89ec3e0a0c39f8217c1ffa3562149d4cad7e7acbbf3b
-- Explicit product change: account registration no longer requires an invitation.
-- Existing companies, memberships and financial/Founders grants remain isolated.

drop trigger if exists eg_staff_invitation_before_signup on auth.users;

create or replace function evergreen_private.create_workspace(p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare w uuid;c uuid;
begin
 if not evergreen_private.live_session() or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then
  raise exception 'Confirme seu e-mail e entre novamente para criar um espaço.' using errcode='42501';
 end if;
 if length(trim(coalesce(p_name,''))) not between 2 and 80 then raise exception 'Use um nome entre 2 e 80 caracteres.' using errcode='22023';end if;
 if not exists(select 1 from public.eg_profiles where id=auth.uid()) then raise exception 'Complete seu perfil antes de criar o espaço.' using errcode='42501';end if;
 insert into public.eg_workspaces(name,owner_id)values(trim(p_name),auth.uid())returning id into w;
 insert into public.eg_members(workspace_id,user_id,role,display_name)values(w,auth.uid(),'owner',(select display_name from public.eg_profiles where id=auth.uid()));
 insert into public.eg_channels(workspace_id,name)values(w,'geral')returning id into c;
 insert into public.eg_channel_members(channel_id,user_id)values(c,auth.uid());
 return w;
end $$;

create or replace function public.eg_identity_bootstrap(p_invite uuid default null,p_name text default null,p_job_title text default null,p_timezone text default null) returns void language plpgsql security definer set search_path='' as $$
 declare u auth.users;n text;j text;z text;
 begin
 if not evergreen_private.live_session() then raise exception 'Sessão necessária.' using errcode='42501';end if;
 select * into u from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if u.id is null then raise exception 'Confirme seu e-mail.' using errcode='42501';end if;
 n:=coalesce(nullif(trim(p_name),''),nullif(trim(u.raw_user_meta_data->>'display_name'),''),nullif(trim(u.raw_user_meta_data->>'full_name'),''),'Membro');
 j:=coalesce(p_job_title,u.raw_user_meta_data->>'job_title','');
 z:=coalesce(p_timezone,u.raw_user_meta_data->>'timezone','UTC');
 if not exists(select 1 from pg_timezone_names where name=z) then z:='UTC';end if;
 insert into public.eg_profiles(id,display_name,job_title,timezone) values(u.id,n,j,z) on conflict(id) do nothing;
 if p_name is not null or p_job_title is not null then
 update public.eg_profiles set display_name=coalesce(p_name,display_name),job_title=coalesce(p_job_title,job_title) where id=u.id;
 end if;
 if p_invite is not null then perform evergreen_private.accept_invite(p_invite);end if;
 end $$;

create or replace function public.eg_identity_context() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('active',evergreen_private.live_session(),'recent_auth',evergreen_private.recent_auth(),'session_id',auth.jwt()->>'session_id',
 'password_recovery',evergreen_private.live_session() and exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a where a->>'method'='recovery' and (a->>'timestamp')~'^[0-9]+$' and to_timestamp((a->>'timestamp')::numeric) between now()-interval '5 minutes' and now()+interval '30 seconds'),
 'profile',(select jsonb_build_object('display_name',display_name,'job_title',job_title)from public.eg_profiles where id=auth.uid() and evergreen_private.live_session()),
 'workspaces',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'role',m.role)order by w.created_at)from public.eg_members m join public.eg_workspaces w on w.id=m.workspace_id where m.user_id=auth.uid() and evergreen_private.live_session()),'[]'::jsonb));
$$;
comment on function evergreen_private.create_workspace(text) is 'Confirmed accounts may create their own isolated workspace; registration never joins existing companies.';

-- Persistent personal reminders are generated on workspace refresh, not a fake timer.
create function public.eg_refresh_due_notifications(p_workspace uuid) returns void language plpgsql security definer set search_path='' as $$
declare today date;
begin
 if not evergreen_private.member_of(p_workspace) then raise exception 'Acesso negado.' using errcode='42501';end if;
 select (now() at time zone case when exists(select 1 from pg_timezone_names where name=p.timezone) then p.timezone else 'UTC' end)::date into today from public.eg_profiles p where p.id=auth.uid();
 today:=coalesce(today,current_date);
 insert into public.eg_notifications(workspace_id,recipient_id,type,title,resource_id,dedupe_key)
 select r.workspace_id,auth.uid(),'deadline',r.title,r.id,'deadline:'||r.id::text||':'||r.due_date::text||':'||auth.uid()::text
 from public.eg_records r where r.workspace_id=p_workspace and r.assignee_id=auth.uid() and r.status<>'done' and r.archived_at is null
 and r.due_date between today and today+3 on conflict(dedupe_key)do nothing;
end $$;
revoke all on function public.eg_refresh_due_notifications(uuid) from public,anon,authenticated;
grant execute on function public.eg_refresh_due_notifications(uuid) to authenticated;
create function evergreen_private.comment_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.eg_records;
begin
 select * into r from public.eg_records where id=new.record_id;
 if not new.deleted and r.assignee_id is not null and position('@'||r.assignee_id::text in new.body)=0 then
  perform evergreen_private.notify(r.workspace_id,r.assignee_id,'comment',left(new.body,200),r.id);
 end if;
 return new;
end $$;
revoke all on function evergreen_private.comment_notification() from public,anon,authenticated;
create trigger eg_relevant_comment after insert on public.eg_comments for each row execute function evergreen_private.comment_notification();


commit;
