begin;
create schema if not exists evergreen_private;
revoke all on schema evergreen_private from public;
grant usage on schema evergreen_private to authenticated;

create table public.eg_profiles (
 id uuid primary key references auth.users on delete cascade,
 display_name text not null check (length(trim(display_name)) between 1 and 80)
);
create table public.eg_workspaces (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 80),
 owner_id uuid not null references auth.users,
 created_at timestamptz not null default now()
);
create table public.eg_members (
 workspace_id uuid not null references public.eg_workspaces on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 role text not null check(role in ('owner','admin','member')),
 display_name text not null check(length(trim(display_name)) between 1 and 80),
 primary key(workspace_id,user_id)
);
create index eg_members_user on public.eg_members(user_id);
create table public.eg_channels (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.eg_workspaces on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80),
 is_private boolean not null default false,
 unique(workspace_id,name)
);
create index eg_channels_workspace on public.eg_channels(workspace_id);
create table public.eg_channel_members (
 channel_id uuid not null references public.eg_channels on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 primary key(channel_id,user_id)
);
create index eg_channel_members_user on public.eg_channel_members(user_id);
create table public.eg_invites (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.eg_workspaces on delete cascade,
 email text not null check(length(email) between 3 and 254),
 token uuid not null unique default gen_random_uuid(),
 expires_at timestamptz not null default now()+interval '7 days',
 accepted_by uuid references auth.users,
 created_by uuid not null default auth.uid() references auth.users
);
create index eg_invites_workspace on public.eg_invites(workspace_id);
create table public.eg_messages (
 id uuid primary key default gen_random_uuid(),
 channel_id uuid not null references public.eg_channels on delete cascade,
 author_id uuid not null default auth.uid() references auth.users,
 author_name text not null,
 body text not null check(length(trim(body)) between 1 and 4000),
 created_at timestamptz not null default now(),
 edited_at timestamptz,
 deleted boolean not null default false
);
create index eg_messages_history on public.eg_messages(channel_id,created_at desc,id desc);
create table public.eg_records (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.eg_workspaces on delete cascade,
 kind text not null check(kind in ('task','project','objective')),
 title text not null check(length(trim(title)) between 1 and 200),
 description text not null default '' check(length(description)<=10000),
 status text not null default 'todo' check(status in ('backlog','todo','in-progress','done')),
 assignee_id uuid,
 project_id uuid references public.eg_records,
 objective_id uuid references public.eg_records,
 progress integer not null default 0 check(progress between 0 and 100),
 version integer not null default 1,
 source_key text,
 unique(workspace_id,source_key),
 foreign key(workspace_id,assignee_id) references public.eg_members(workspace_id,user_id)
);
create index eg_records_workspace on public.eg_records(workspace_id);
create index eg_records_assignee on public.eg_records(assignee_id);
create index eg_records_project on public.eg_records(project_id);
create index eg_records_objective on public.eg_records(objective_id);

-- Non-exposed lookup functions avoid recursive membership RLS. All use auth.uid().
create function evergreen_private.member_of(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.eg_members where workspace_id=w and user_id=auth.uid());
$$;
create function evergreen_private.admin_of(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.eg_members where workspace_id=w and user_id=auth.uid() and role in ('owner','admin'));
$$;
create function evergreen_private.can_read_channel(c uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.eg_channels ch where ch.id=c and evergreen_private.member_of(ch.workspace_id)
 and (not ch.is_private or exists(select 1 from public.eg_channel_members cm where cm.channel_id=c and cm.user_id=auth.uid())));
$$;
create function evergreen_private.joined_channel(c uuid) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.can_read_channel(c) and exists(select 1 from public.eg_channel_members where channel_id=c and user_id=auth.uid());
$$;

alter table public.eg_profiles enable row level security;
alter table public.eg_workspaces enable row level security;
alter table public.eg_members enable row level security;
alter table public.eg_channels enable row level security;
alter table public.eg_channel_members enable row level security;
alter table public.eg_invites enable row level security;
alter table public.eg_messages enable row level security;
alter table public.eg_records enable row level security;

create policy profile_read on public.eg_profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_insert on public.eg_profiles for insert to authenticated with check(id=(select auth.uid()));
create policy profile_update on public.eg_profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy workspace_read on public.eg_workspaces for select to authenticated using(evergreen_private.member_of(id));
create policy workspace_update on public.eg_workspaces for update to authenticated using(evergreen_private.admin_of(id)) with check(evergreen_private.admin_of(id));
create policy members_read on public.eg_members for select to authenticated using(evergreen_private.member_of(workspace_id));
create policy channels_read on public.eg_channels for select to authenticated using(evergreen_private.can_read_channel(id));
create policy channel_members_read on public.eg_channel_members for select to authenticated using(evergreen_private.can_read_channel(channel_id));
create policy invites_read on public.eg_invites for select to authenticated using(evergreen_private.admin_of(workspace_id));
create policy invites_insert on public.eg_invites for insert to authenticated with check(evergreen_private.admin_of(workspace_id) and created_by=(select auth.uid()) and accepted_by is null);
create policy invites_delete on public.eg_invites for delete to authenticated using(evergreen_private.admin_of(workspace_id));
create policy messages_read on public.eg_messages for select to authenticated using(evergreen_private.can_read_channel(channel_id));
create policy messages_insert on public.eg_messages for insert to authenticated with check(evergreen_private.joined_channel(channel_id) and author_id=(select auth.uid()) and not deleted);
create policy messages_update on public.eg_messages for update to authenticated using(evergreen_private.joined_channel(channel_id) and author_id=(select auth.uid())) with check(evergreen_private.joined_channel(channel_id) and author_id=(select auth.uid()));
create policy records_read on public.eg_records for select to authenticated using(evergreen_private.member_of(workspace_id));
create policy records_insert on public.eg_records for insert to authenticated with check(evergreen_private.member_of(workspace_id));
create policy records_update on public.eg_records for update to authenticated using(evergreen_private.member_of(workspace_id)) with check(evergreen_private.member_of(workspace_id));
create policy records_delete on public.eg_records for delete to authenticated using(evergreen_private.member_of(workspace_id));

create function evergreen_private.message_stamp() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='INSERT' then
  new.author_name := coalesce((select display_name from public.eg_profiles where id=auth.uid()),'Membro');
  new.created_at := now(); new.edited_at := null;
 else
  if old.deleted then raise exception 'Mensagem excluída'; end if;
  new.edited_at := now();
  if new.deleted then new.body := '[Mensagem excluída]'; end if;
 end if;
 return new;
end $$;
create trigger eg_message_stamp before insert or update on public.eg_messages for each row execute function evergreen_private.message_stamp();

create function evergreen_private.record_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if new.workspace_id<>old.workspace_id or new.kind<>old.kind or new.source_key is distinct from old.source_key then raise exception 'Escopo imutável'; end if;
  new.version:=old.version+1;
 end if;
 if new.project_id is not null and not exists(select 1 from public.eg_records where id=new.project_id and workspace_id=new.workspace_id and kind='project') then raise exception 'Projeto fora do workspace'; end if;
 if new.objective_id is not null and not exists(select 1 from public.eg_records where id=new.objective_id and workspace_id=new.workspace_id and kind='objective') then raise exception 'Objetivo fora do workspace'; end if;
 return new;
end $$;
create trigger eg_record_guard before insert or update on public.eg_records for each row execute function evergreen_private.record_guard();

create function evergreen_private.profile_names() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.eg_members set display_name=new.display_name where user_id=new.id;
 return new;
end $$;
create trigger eg_profile_names after update of display_name on public.eg_profiles for each row execute function evergreen_private.profile_names();

create function evergreen_private.create_workspace(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare w uuid; c uuid;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 insert into public.eg_workspaces(name,owner_id) values(trim(p_name),auth.uid()) returning id into w;
 insert into public.eg_members values(w,auth.uid(),'owner',coalesce((select display_name from public.eg_profiles where id=auth.uid()),'Membro'));
 insert into public.eg_channels(workspace_id,name) values(w,'geral') returning id into c;
 insert into public.eg_channel_members values(c,auth.uid());
 return w;
end $$;
create function public.eg_create_workspace(p_name text) returns uuid language sql security invoker set search_path='' as $$ select evergreen_private.create_workspace(p_name); $$;

create function evergreen_private.accept_invite(p_token uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.eg_invites; account_email text;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 select email into account_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into inv from public.eg_invites where token=p_token for update;
 if inv.id is null or inv.expires_at<=now() or lower(inv.email) is distinct from lower(account_email) or (inv.accepted_by is not null and inv.accepted_by<>auth.uid()) then raise exception 'Convite inválido, expirado ou destinado a outro e-mail. Confirme seu e-mail.'; end if;
 insert into public.eg_members values(inv.workspace_id,auth.uid(),'member',coalesce((select display_name from public.eg_profiles where id=auth.uid()),'Membro')) on conflict do nothing;
 update public.eg_invites set accepted_by=auth.uid() where id=inv.id;
 insert into public.eg_channel_members select id,auth.uid() from public.eg_channels where workspace_id=inv.workspace_id and not is_private on conflict do nothing;
 return inv.workspace_id;
end $$;
create function public.eg_accept_invite(p_token uuid) returns uuid language sql security invoker set search_path='' as $$ select evergreen_private.accept_invite(p_token); $$;

create function evergreen_private.create_channel(p_workspace uuid,p_name text,p_private boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid;
begin
 if not evergreen_private.admin_of(p_workspace) then raise exception 'Administrador necessário'; end if;
 insert into public.eg_channels(workspace_id,name,is_private) values(p_workspace,trim(p_name),p_private) returning id into c;
 insert into public.eg_channel_members values(c,auth.uid());
 return c;
end $$;
create function public.eg_create_channel(p_workspace uuid,p_name text,p_private boolean) returns uuid language sql security invoker set search_path='' as $$ select evergreen_private.create_channel(p_workspace,p_name,p_private); $$;

create function evergreen_private.channel_membership(p_channel uuid,p_user uuid,p_join boolean) returns void language plpgsql security definer set search_path='' as $$
declare ch public.eg_channels;
begin
 select * into ch from public.eg_channels where id=p_channel;
 if not evergreen_private.member_of(ch.workspace_id) or not exists(select 1 from public.eg_members where workspace_id=ch.workspace_id and user_id=p_user) then raise exception 'Membro inválido'; end if;
 if p_user<>auth.uid() or (p_join and ch.is_private) then
  if not evergreen_private.admin_of(ch.workspace_id) or not evergreen_private.can_read_channel(p_channel) then raise exception 'Acesso negado'; end if;
 end if;
 if p_join then insert into public.eg_channel_members values(p_channel,p_user) on conflict do nothing;
 else delete from public.eg_channel_members where channel_id=p_channel and user_id=p_user;
 end if;
end $$;
create function public.eg_channel_membership(p_channel uuid,p_user uuid,p_join boolean) returns void language sql security invoker set search_path='' as $$ select evergreen_private.channel_membership(p_channel,p_user,p_join); $$;

create function evergreen_private.manage_member(p_workspace uuid,p_user uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not evergreen_private.admin_of(p_workspace) then raise exception 'Administrador necessário'; end if;
 if exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=p_user and role='owner') then raise exception 'Proprietário não pode ser removido ou rebaixado'; end if;
 if not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=auth.uid() and role='owner') then raise exception 'Somente o proprietário gerencia papéis'; end if;
 if p_role='remove' then
  delete from public.eg_invites where workspace_id=p_workspace and accepted_by=p_user;
  update public.eg_records set assignee_id=null where workspace_id=p_workspace and assignee_id=p_user;
  delete from public.eg_channel_members where user_id=p_user and channel_id in(select id from public.eg_channels where workspace_id=p_workspace);
  delete from public.eg_members where workspace_id=p_workspace and user_id=p_user;
 elsif p_role in ('admin','member') then update public.eg_members set role=p_role where workspace_id=p_workspace and user_id=p_user;
 else raise exception 'Papel inválido'; end if;
end $$;
create function public.eg_manage_member(p_workspace uuid,p_user uuid,p_role text) returns void language sql security invoker set search_path='' as $$ select evergreen_private.manage_member(p_workspace,p_user,p_role); $$;

-- No blanket write grants: scope, author, role and server timestamps are immutable.
revoke all on public.eg_profiles,public.eg_workspaces,public.eg_members,public.eg_channels,public.eg_channel_members,public.eg_invites,public.eg_messages,public.eg_records from anon,authenticated;
grant select on public.eg_profiles,public.eg_workspaces,public.eg_members,public.eg_channels,public.eg_channel_members,public.eg_invites,public.eg_messages,public.eg_records to authenticated;
grant insert(id,display_name),update(display_name) on public.eg_profiles to authenticated;
grant update(name) on public.eg_workspaces to authenticated;
grant insert(workspace_id,email),delete on public.eg_invites to authenticated;
grant insert(id,channel_id,body),update(body,deleted) on public.eg_messages to authenticated;
grant insert(id,workspace_id,kind,title,description,status,assignee_id,project_id,objective_id,progress,source_key),update(title,description,status,assignee_id,project_id,objective_id,progress),delete on public.eg_records to authenticated;

do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='evergreen_private' or (n.nspname='public' and p.proname like 'eg_%') loop
 execute format('revoke all on function %s from public,anon',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
alter publication supabase_realtime add table public.eg_messages,public.eg_records,public.eg_members,public.eg_channels,public.eg_channel_members;
commit;
