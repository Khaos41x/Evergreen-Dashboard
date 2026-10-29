-- Executive layer. Role labels never replace explicit capabilities/company grants.
begin;
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
commit;
