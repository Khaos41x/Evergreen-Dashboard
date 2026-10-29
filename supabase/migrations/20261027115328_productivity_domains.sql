begin;
alter table public.eg_records add column priority text not null default 'normal' check(priority in ('low','normal','high','urgent'));
alter table public.eg_records add column due_date date;
alter table public.eg_records add column archived_at timestamptz;
alter table public.eg_records add column created_at timestamptz not null default now();
alter table public.eg_records add column updated_at timestamptz not null default now();
alter table public.eg_records add column completed_at timestamptz;
alter table public.eg_records add column issue_type text not null default 'problem' check(issue_type in ('problem','suggestion','question'));
alter table public.eg_records add column color text not null default 'emerald' check(color in ('emerald','gray','blue','amber'));
alter table public.eg_records add column icon text not null default 'folder' check(icon in ('folder','target','code','book'));
alter table public.eg_records drop constraint eg_records_kind_check;
alter table public.eg_records add constraint eg_records_kind_check check(kind in ('task','project','objective','issue'));
grant insert(priority,due_date,issue_type),update(priority,due_date,archived_at,issue_type) on public.eg_records to authenticated;
grant insert(color,icon),update(color,icon) on public.eg_records to authenticated;

create table public.eg_checklist (
 id uuid primary key default gen_random_uuid(), record_id uuid not null references public.eg_records on delete cascade,
 text text not null check(length(trim(text)) between 1 and 1000), completed boolean not null default false,
 position integer not null default 0
);
create index eg_checklist_record on public.eg_checklist(record_id,position);
create table public.eg_comments (
 id uuid primary key default gen_random_uuid(), record_id uuid not null references public.eg_records on delete cascade,
 author_id uuid not null default auth.uid() references auth.users, body text not null check(length(trim(body)) between 1 and 4000),
 created_at timestamptz not null default now(), edited_at timestamptz, deleted boolean not null default false
);
create index eg_comments_record on public.eg_comments(record_id,created_at);
create index eg_comments_author on public.eg_comments(author_id);
create table public.eg_inbox (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.eg_workspaces on delete cascade,
 user_id uuid not null default auth.uid() references auth.users, title text not null check(length(trim(title)) between 1 and 200),
 created_at timestamptz not null default now()
);
create index eg_inbox_user on public.eg_inbox(user_id,workspace_id);
create table public.eg_suggestions (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.eg_workspaces on delete cascade,
 sender_id uuid not null default auth.uid() references auth.users, recipient_id uuid not null references auth.users,
 title text not null check(length(trim(title)) between 1 and 200), context text not null default '' check(length(context)<=4000),
 status text not null default 'pending' check(status in ('pending','accepted','rejected')),
 task_id uuid references public.eg_records, created_at timestamptz not null default now(), resolved_at timestamptz,
 foreign key(workspace_id,recipient_id) references public.eg_members(workspace_id,user_id)
);
create index eg_suggestions_recipient on public.eg_suggestions(recipient_id,workspace_id);
create index eg_suggestions_sender on public.eg_suggestions(sender_id);
create table public.eg_handoffs (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.eg_workspaces on delete cascade,
 task_id uuid not null references public.eg_records on delete cascade, sender_id uuid not null references auth.users,
 recipient_id uuid not null references auth.users, completed text not null, current_state text not null, next_steps text not null,
 created_at timestamptz not null default now(), check(length(completed)<=4000 and length(current_state)<=4000 and length(next_steps)<=4000)
);
create index eg_handoffs_task on public.eg_handoffs(task_id);
create index eg_handoffs_workspace on public.eg_handoffs(workspace_id);
create table public.eg_notifications (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.eg_workspaces on delete cascade,
 recipient_id uuid not null references auth.users, type text not null, title text not null, resource_id uuid,
 created_at timestamptz not null default now(), read_at timestamptz,dedupe_key text unique
);
create index eg_notifications_recipient on public.eg_notifications(recipient_id,created_at desc);
create table public.eg_activity (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.eg_workspaces on delete cascade,
 actor_id uuid not null references auth.users, type text not null, title text not null, resource_id uuid,
 created_at timestamptz not null default now()
);
create index eg_activity_workspace on public.eg_activity(workspace_id,created_at desc);
create index eg_activity_actor on public.eg_activity(actor_id);

create function evergreen_private.record_access(r uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.eg_records where id=r and evergreen_private.member_of(workspace_id));
$$;
create function evergreen_private.notify(w uuid,u uuid,t text,label text,r uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not evergreen_private.member_of(w) then raise exception 'Acesso negado'; end if;
 if u is not null and u<>auth.uid() and exists(select 1 from public.eg_members where workspace_id=w and user_id=u) then
 insert into public.eg_notifications(workspace_id,recipient_id,type,title,resource_id) values(w,u,t,label,r);
 end if;
end $$;
-- Internal trigger helper, not a user-callable notification API.
revoke all on function evergreen_private.notify(uuid,uuid,text,text,uuid) from public,anon,authenticated;

alter table public.eg_checklist enable row level security;
alter table public.eg_comments enable row level security;
alter table public.eg_inbox enable row level security;
alter table public.eg_suggestions enable row level security;
alter table public.eg_handoffs enable row level security;
alter table public.eg_notifications enable row level security;
alter table public.eg_activity enable row level security;
create policy checklist_read on public.eg_checklist for select to authenticated using(evergreen_private.record_access(record_id));
create policy comments_read on public.eg_comments for select to authenticated using(evergreen_private.record_access(record_id));
create policy comments_insert on public.eg_comments for insert to authenticated with check(author_id=auth.uid() and evergreen_private.record_access(record_id) and not deleted);
create policy comments_update on public.eg_comments for update to authenticated using(author_id=auth.uid() and evergreen_private.record_access(record_id)) with check(author_id=auth.uid() and evergreen_private.record_access(record_id));
create policy inbox_read on public.eg_inbox for select to authenticated using(user_id=auth.uid() and evergreen_private.member_of(workspace_id));
create policy inbox_insert on public.eg_inbox for insert to authenticated with check(user_id=auth.uid() and evergreen_private.member_of(workspace_id));
create policy inbox_update on public.eg_inbox for update to authenticated using(user_id=auth.uid() and evergreen_private.member_of(workspace_id)) with check(user_id=auth.uid() and evergreen_private.member_of(workspace_id));
create policy inbox_delete on public.eg_inbox for delete to authenticated using(user_id=auth.uid() and evergreen_private.member_of(workspace_id));
create policy suggestion_read on public.eg_suggestions for select to authenticated using((sender_id=auth.uid() or recipient_id=auth.uid()) and evergreen_private.member_of(workspace_id));
create policy suggestion_insert on public.eg_suggestions for insert to authenticated with check(sender_id=auth.uid() and evergreen_private.member_of(workspace_id) and status='pending' and task_id is null);
create policy handoff_read on public.eg_handoffs for select to authenticated using(evergreen_private.member_of(workspace_id));
create policy notification_read on public.eg_notifications for select to authenticated using(recipient_id=auth.uid() and evergreen_private.member_of(workspace_id));
create policy notification_update on public.eg_notifications for update to authenticated using(recipient_id=auth.uid() and evergreen_private.member_of(workspace_id)) with check(recipient_id=auth.uid() and evergreen_private.member_of(workspace_id));
create policy activity_read on public.eg_activity for select to authenticated using(evergreen_private.member_of(workspace_id));
revoke all on public.eg_checklist,public.eg_comments,public.eg_inbox,public.eg_suggestions,public.eg_handoffs,public.eg_notifications,public.eg_activity from anon,authenticated;
grant select on public.eg_checklist,public.eg_comments,public.eg_inbox,public.eg_suggestions,public.eg_handoffs,public.eg_notifications,public.eg_activity to authenticated;
grant insert(record_id,body),update(body,deleted) on public.eg_comments to authenticated;
grant insert(workspace_id,title),update(title),delete on public.eg_inbox to authenticated;
grant insert(workspace_id,recipient_id,title,context) on public.eg_suggestions to authenticated;
grant update(read_at) on public.eg_notifications to authenticated;

create function evergreen_private.productivity_events() returns trigger language plpgsql security definer set search_path='' as $$
declare w uuid; target uuid; label text;
begin
 if auth.uid() is null then return new; end if;
 if TG_TABLE_NAME='eg_records' then
  w:=new.workspace_id; label:=new.title;
  if TG_OP='UPDATE' then
   if new.kind='objective' and old.progress is distinct from new.progress then insert into public.eg_activity(workspace_id,actor_id,type,title,resource_id) values(w,auth.uid(),'objective_progress',label||' · '||new.progress||'%',new.id); end if;
   if old.status is distinct from new.status and new.status='done' then insert into public.eg_activity(workspace_id,actor_id,type,title,resource_id) values(w,auth.uid(),new.kind||'_completed',label,new.id); end if;
   if new.assignee_id is distinct from old.assignee_id then perform evergreen_private.notify(w,new.assignee_id,'assigned',label,new.id); end if;
  else
   insert into public.eg_activity(workspace_id,actor_id,type,title,resource_id) values(w,auth.uid(),new.kind||'_created',label,new.id);
   perform evergreen_private.notify(w,new.assignee_id,'assigned',label,new.id);
  end if;
 elsif TG_TABLE_NAME='eg_suggestions' then perform evergreen_private.notify(new.workspace_id,new.recipient_id,'suggestion',new.title,new.id);
 elsif TG_TABLE_NAME='eg_handoffs' then
  perform evergreen_private.notify(new.workspace_id,new.recipient_id,'handoff',new.next_steps,new.task_id);
  insert into public.eg_activity(workspace_id,actor_id,type,title,resource_id) values(new.workspace_id,auth.uid(),'handoff',new.next_steps,new.task_id);
 elsif TG_TABLE_NAME='eg_comments' then
  select workspace_id,title into w,label from public.eg_records where id=new.record_id;
  if TG_OP='UPDATE' then new.edited_at:=now(); if old.deleted then raise exception 'Comentário excluído'; end if; end if;
  if new.deleted then new.body:='[Comentário excluído]'; else
   for target in select user_id from public.eg_members where workspace_id=w and position('@'||user_id::text in new.body)>0 loop
    perform evergreen_private.notify(w,target,'mention',label,new.record_id);
   end loop;
  end if;
 end if;
 return new;
end $$;
create trigger eg_record_events after insert or update on public.eg_records for each row execute function evergreen_private.productivity_events();
create trigger eg_suggestion_events after insert on public.eg_suggestions for each row execute function evergreen_private.productivity_events();
create trigger eg_handoff_events after insert on public.eg_handoffs for each row execute function evergreen_private.productivity_events();
create trigger eg_comment_events before insert or update on public.eg_comments for each row execute function evergreen_private.productivity_events();
create function evergreen_private.record_timestamps() returns trigger language plpgsql set search_path='' as $$
begin
 new.updated_at:=now();
 if new.status='done' then if TG_OP='INSERT' or old.status<>'done' then new.completed_at:=now(); end if; else new.completed_at:=null; end if;
 return new;
end $$;
create trigger eg_record_timestamps before insert or update on public.eg_records for each row execute function evergreen_private.record_timestamps();

create function evergreen_private.save_checklist(p_record uuid,p_version integer,p_items jsonb) returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; n integer:=0; w uuid;
begin
 select workspace_id into w from public.eg_records where id=p_record for update;
 if not evergreen_private.member_of(w) then raise exception 'Acesso negado'; end if;
 if not exists(select 1 from public.eg_records where id=p_record and version=p_version) then raise exception 'Item alterado em outra sessão; recarregue antes de salvar'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>200 then raise exception 'Checklist inválido'; end if;
 delete from public.eg_checklist where record_id=p_record;
 for item in select * from jsonb_array_elements(p_items) loop
  insert into public.eg_checklist(record_id,text,completed,position) values(p_record,item->>'text',coalesce((item->>'completed')::boolean,false),n); n:=n+1;
 end loop;
 update public.eg_records set progress=coalesce((select round(100.0*count(*) filter(where completed)/nullif(count(*),0)) from public.eg_checklist where record_id=p_record),0) where id=p_record;
end $$;
create function public.eg_save_checklist(p_record uuid,p_version integer,p_items jsonb) returns void language sql security invoker set search_path='' as $$select evergreen_private.save_checklist(p_record,p_version,p_items)$$;

create function evergreen_private.resolve_suggestion(p_id uuid,p_accept boolean,p_title text) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.eg_suggestions; r uuid;
begin
 select * into s from public.eg_suggestions where id=p_id for update;
 if s.recipient_id is distinct from auth.uid() or not evergreen_private.member_of(s.workspace_id) or s.status<>'pending' then raise exception 'Sugestão indisponível'; end if;
 if p_accept then
  insert into public.eg_records(workspace_id,kind,title,description,assignee_id) values(s.workspace_id,'task',coalesce(nullif(trim(p_title),''),s.title),s.context,auth.uid()) returning id into r;
 end if;
 update public.eg_suggestions set status=case when p_accept then 'accepted' else 'rejected' end,task_id=r,resolved_at=now() where id=p_id;
 return r;
end $$;
create function public.eg_resolve_suggestion(p_id uuid,p_accept boolean,p_title text) returns uuid language sql security invoker set search_path='' as $$select evergreen_private.resolve_suggestion(p_id,p_accept,p_title)$$;
create function evergreen_private.handoff(p_task uuid,p_recipient uuid,p_completed text,p_state text,p_next text,p_version integer) returns void language plpgsql security definer set search_path='' as $$
declare t public.eg_records;
begin
 select * into t from public.eg_records where id=p_task for update;
 if not evergreen_private.member_of(t.workspace_id) or (t.assignee_id is distinct from auth.uid() and not evergreen_private.admin_of(t.workspace_id)) then raise exception 'Somente responsável ou administrador pode transferir'; end if;
 if t.version<>p_version then raise exception 'Tarefa alterada; recarregue'; end if;
 if not exists(select 1 from public.eg_members where workspace_id=t.workspace_id and user_id=p_recipient) then raise exception 'Destinatário inválido'; end if;
 insert into public.eg_handoffs(workspace_id,task_id,sender_id,recipient_id,completed,current_state,next_steps) values(t.workspace_id,p_task,auth.uid(),p_recipient,p_completed,p_state,p_next);
 update public.eg_records set assignee_id=p_recipient where id=p_task;
end $$;
create function public.eg_handoff(p_task uuid,p_recipient uuid,p_completed text,p_state text,p_next text,p_version integer) returns void language sql security invoker set search_path='' as $$select evergreen_private.handoff(p_task,p_recipient,p_completed,p_state,p_next,p_version)$$;
create function evergreen_private.convert_inbox(p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare i public.eg_inbox; r uuid;
begin
 select * into i from public.eg_inbox where id=p_id for update;
 if i.user_id is distinct from auth.uid() or not evergreen_private.member_of(i.workspace_id) then raise exception 'Acesso negado'; end if;
 insert into public.eg_records(workspace_id,kind,title,assignee_id) values(i.workspace_id,'task',i.title,auth.uid()) returning id into r;
 delete from public.eg_inbox where id=p_id;
 return r;
end $$;
create function public.eg_convert_inbox(p_id uuid) returns uuid language sql security invoker set search_path='' as $$select evergreen_private.convert_inbox(p_id)$$;

-- Focus is timestamp-based and server-authored; one open session per user across workspaces.
create table public.eg_focus (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.eg_workspaces on delete cascade,
 user_id uuid not null default auth.uid() references auth.users,title text not null check(length(trim(title)) between 1 and 200),
 description text not null default '' check(length(description)<=4000),task_id uuid references public.eg_records,objective_id uuid references public.eg_records,
 mode text not null check(mode in ('timer','stopwatch')),status text not null default 'running' check(status in ('running','paused','completed')),
 started_at timestamptz not null default now(),paused_at timestamptz,paused_ms bigint not null default 0 check(paused_ms>=0),
 duration_ms bigint check(duration_ms between 60000 and 28800000),ended_at timestamptz,elapsed_ms bigint not null default 0,
 depth text check(depth in ('distracted','normal','deep')),note text not null default '' check(length(note)<=4000)
);
create unique index eg_focus_one_active on public.eg_focus(user_id) where status in ('running','paused');
create index eg_focus_workspace on public.eg_focus(workspace_id,started_at desc);
alter table public.eg_focus enable row level security;
create policy focus_read on public.eg_focus for select to authenticated using(evergreen_private.member_of(workspace_id));
revoke all on public.eg_focus from anon,authenticated;
grant select on public.eg_focus to authenticated;
create function evergreen_private.focus_action(p_workspace uuid,p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare f public.eg_focus; r uuid; t uuid; o uuid; elapsed bigint;
begin
 if not evergreen_private.member_of(p_workspace) then raise exception 'Acesso negado'; end if;
 if p_action='start' then
  t:=nullif(p_data->>'task_id','')::uuid; o:=nullif(p_data->>'objective_id','')::uuid;
  if t is not null and not exists(select 1 from public.eg_records where id=t and workspace_id=p_workspace and kind='task') then raise exception 'Tarefa inválida'; end if;
  if o is not null and not exists(select 1 from public.eg_records where id=o and workspace_id=p_workspace and kind='objective') then raise exception 'Objetivo inválido'; end if;
  insert into public.eg_focus(workspace_id,user_id,title,description,mode,duration_ms,task_id,objective_id) values(p_workspace,auth.uid(),p_data->>'title',coalesce(p_data->>'description',''),p_data->>'mode',case when p_data->>'mode'='timer' then (p_data->>'duration_ms')::bigint end,t,o) returning id into r;
  return r;
 end if;
 select * into f from public.eg_focus where user_id=auth.uid() and workspace_id=p_workspace and status in ('running','paused') for update;
 if f.id is null then raise exception 'Nenhuma sessão ativa'; end if;
 elapsed:=greatest(0,extract(epoch from(coalesce(f.paused_at,now())-f.started_at))*1000-f.paused_ms);
 if p_action='pause' and f.status='running' then update public.eg_focus set status='paused',paused_at=now() where id=f.id;
 elsif p_action='resume' and f.status='paused' then update public.eg_focus set status='running',paused_ms=paused_ms+greatest(0,extract(epoch from(now()-paused_at))*1000),paused_at=null where id=f.id;
 elsif p_action='extend' and f.mode='timer' then update public.eg_focus set duration_ms=duration_ms+300000 where id=f.id;
 elsif p_action='switch' then
  t:=(p_data->>'task_id')::uuid;
  if not exists(select 1 from public.eg_records where id=t and workspace_id=p_workspace and kind='task' and archived_at is null) then raise exception 'Tarefa inválida'; end if;
  if f.mode='timer' then elapsed:=least(elapsed,f.duration_ms); end if;
  update public.eg_focus set status='completed',ended_at=now(),elapsed_ms=elapsed,note='Context switched to another task' where id=f.id;
  insert into public.eg_activity(workspace_id,actor_id,type,title,resource_id) values(p_workspace,auth.uid(),'focus_completed',f.title,f.id);
  insert into public.eg_focus(workspace_id,user_id,title,description,mode,duration_ms,task_id,objective_id)
  select p_workspace,auth.uid(),title,f.description,f.mode,case when f.mode='timer' then greatest(60000,f.duration_ms-elapsed) end,id,objective_id from public.eg_records where id=t returning id into r;
  return r;
 elsif p_action='finish' then
  if f.mode='timer' then elapsed:=least(elapsed,f.duration_ms); end if;
  update public.eg_focus set status='completed',ended_at=now(),elapsed_ms=elapsed,depth=p_data->>'depth',note=coalesce(p_data->>'note','') where id=f.id;
  if coalesce((p_data->>'complete_task')::boolean,false) and f.task_id is not null then update public.eg_records set status='done' where id=f.task_id; end if;
  insert into public.eg_activity(workspace_id,actor_id,type,title,resource_id) values(p_workspace,auth.uid(),'focus_completed',f.title,f.id);
 else raise exception 'Action incompatible avec état de session'; end if;
 return f.id;
end $$;
create function public.eg_focus_action(p_workspace uuid,p_action text,p_data jsonb) returns uuid language sql security invoker set search_path='' as $$select evergreen_private.focus_action(p_workspace,p_action,p_data)$$;

-- Private Presence topics. Payload identity is not used for any authorization.
create function evergreen_private.workspace_topic(topic text) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if topic !~ '^eg-presence:[0-9a-f-]{36}$' then return false; end if;
 return evergreen_private.member_of(split_part(topic,':',2)::uuid);
exception when invalid_text_representation then return false;
end $$;
create policy eg_presence_read on realtime.messages for select to authenticated using(extension='presence' and evergreen_private.workspace_topic(realtime.topic()));
create policy eg_presence_write on realtime.messages for insert to authenticated with check(extension='presence' and evergreen_private.workspace_topic(realtime.topic()));

do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='evergreen_private' and p.proname in ('record_access','save_checklist','resolve_suggestion','handoff','convert_inbox','focus_action','workspace_topic')) or (n.nspname='public' and p.proname in ('eg_save_checklist','eg_resolve_suggestion','eg_handoff','eg_convert_inbox','eg_focus_action')) loop
 execute format('revoke all on function %s from public,anon',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
revoke all on function evergreen_private.productivity_events(),evergreen_private.record_timestamps() from public,anon,authenticated;
alter publication supabase_realtime add table public.eg_checklist,public.eg_comments,public.eg_inbox,public.eg_suggestions,public.eg_handoffs,public.eg_notifications,public.eg_activity,public.eg_focus;
-- Profile fields are private; teammates use a narrowly scoped public profile RPC.
alter table public.eg_profiles add column real_name text not null default '' check(length(real_name)<=100);
alter table public.eg_profiles add column username text unique check(username is null or username ~ '^[a-z0-9_]{3,30}$');
alter table public.eg_profiles add column bio text not null default '' check(length(bio)<=280);
alter table public.eg_profiles add column timezone text not null default 'UTC';
alter table public.eg_profiles add column avatar_path text;
alter table public.eg_profiles add column custom_status text not null default '' check(length(custom_status)<=80);
alter table public.eg_profiles add column preferences jsonb not null default '{"focus_minutes":25,"daily_goal_minutes":0,"notify_assignments":true,"notify_mentions":true}'::jsonb check(jsonb_typeof(preferences)='object');
grant update(real_name,username,bio,timezone,avatar_path,custom_status,preferences) on public.eg_profiles to authenticated;
create function evergreen_private.profile_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'Timezone inválido'; end if;
 if new.avatar_path is not null and split_part(new.avatar_path,'/',1)<>new.id::text then raise exception 'Avatar inválido'; end if;
 if length(new.preferences::text)>4000 or
 (new.preferences ? 'notify_assignments' and jsonb_typeof(new.preferences->'notify_assignments')<>'boolean') or
 (new.preferences ? 'notify_mentions' and jsonb_typeof(new.preferences->'notify_mentions')<>'boolean') or
 (new.preferences ? 'focus_minutes' and (jsonb_typeof(new.preferences->'focus_minutes')<>'number' or (new.preferences->>'focus_minutes')::numeric not between 1 and 480)) or
 (new.preferences ? 'daily_goal_minutes' and (jsonb_typeof(new.preferences->'daily_goal_minutes')<>'number' or (new.preferences->>'daily_goal_minutes')::numeric not between 0 and 1440)) then raise exception 'Preferências inválidas'; end if;
 return new;
end $$;
create trigger eg_profile_guard before insert or update on public.eg_profiles for each row execute function evergreen_private.profile_guard();
create function evergreen_private.teammate(u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (u=auth.uid() or exists(select 1 from public.eg_members a join public.eg_members b on a.workspace_id=b.workspace_id where a.user_id=auth.uid() and b.user_id=u));
$$;
create function evergreen_private.public_profiles(w uuid) returns table(id uuid,display_name text,username text,bio text,avatar_path text,custom_status text) language sql stable security definer set search_path='' as $$
 select p.id,p.display_name,p.username,p.bio,p.avatar_path,p.custom_status from public.eg_profiles p join public.eg_members m on m.user_id=p.id where m.workspace_id=w and evergreen_private.member_of(w);
$$;
create function public.eg_public_profiles(p_workspace uuid) returns table(id uuid,display_name text,username text,bio text,avatar_path text,custom_status text) language sql security invoker set search_path='' as $$select * from evergreen_private.public_profiles(p_workspace)$$;

-- Objective areas and goals. A task can contribute at most once per Objective.
create table public.eg_areas (
 id uuid primary key default gen_random_uuid(),objective_id uuid not null references public.eg_records on delete cascade,
 title text not null check(length(trim(title)) between 1 and 120),weight numeric not null default 1 check(weight>0 and weight<=100)
);
create index eg_areas_objective on public.eg_areas(objective_id);
create table public.eg_goals (
 id uuid primary key default gen_random_uuid(),area_id uuid not null references public.eg_areas on delete cascade,
 title text not null check(length(trim(title)) between 1 and 120),strategy text not null check(strategy in ('tasks','numeric','manual','milestones')),
 current_value numeric not null default 0 check(current_value>=0),target_value numeric not null default 1 check(target_value>0),weight numeric not null default 1 check(weight>0 and weight<=100)
);
create index eg_goals_area on public.eg_goals(area_id);
create table public.eg_goal_tasks (
 goal_id uuid not null references public.eg_goals on delete cascade,task_id uuid not null references public.eg_records on delete cascade,
 objective_id uuid not null references public.eg_records on delete cascade,primary key(goal_id,task_id),unique(objective_id,task_id)
);
create index eg_goal_tasks_task on public.eg_goal_tasks(task_id);
create index eg_goal_tasks_objective on public.eg_goal_tasks(objective_id);
create function evergreen_private.goal_objective(g uuid) returns uuid language sql stable security definer set search_path='' as $$select a.objective_id from public.eg_areas a join public.eg_goals gl on gl.area_id=a.id where gl.id=g$$;
create function evergreen_private.goal_access(g uuid) returns boolean language sql stable security definer set search_path='' as $$select evergreen_private.record_access(evergreen_private.goal_objective(g))$$;
alter table public.eg_areas enable row level security;
alter table public.eg_goals enable row level security;
alter table public.eg_goal_tasks enable row level security;
create policy areas_read on public.eg_areas for select to authenticated using(evergreen_private.record_access(objective_id));
create policy goals_read on public.eg_goals for select to authenticated using(evergreen_private.record_access((select objective_id from public.eg_areas where id=area_id)));
create policy goal_tasks_read on public.eg_goal_tasks for select to authenticated using(evergreen_private.goal_access(goal_id));
revoke all on public.eg_areas,public.eg_goals,public.eg_goal_tasks from anon,authenticated;
grant select on public.eg_areas,public.eg_goals,public.eg_goal_tasks to authenticated;
create function evergreen_private.goal_progress(g uuid) returns numeric language sql stable security definer set search_path='' as $$
 select case when gl.strategy='tasks' then coalesce((select 100.0*count(*) filter(where r.status='done')/nullif(count(*),0) from public.eg_goal_tasks l join public.eg_records r on r.id=l.task_id where l.goal_id=g),0)
 else least(100,100*gl.current_value/gl.target_value) end from public.eg_goals gl where gl.id=g;
$$;
create function evergreen_private.recalculate_objective(o uuid) returns void language plpgsql security definer set search_path='' as $$
declare progress_value numeric;
begin
 select coalesce(sum(ap.progress*a.weight)/nullif(sum(a.weight),0),0) into progress_value from public.eg_areas a
 cross join lateral(select coalesce(sum(evergreen_private.goal_progress(g.id)*g.weight)/nullif(sum(g.weight),0),0) progress from public.eg_goals g where g.area_id=a.id) ap where a.objective_id=o;
 update public.eg_records set progress=round(progress_value) where id=o and kind='objective';
end $$;
create function evergreen_private.goal_action(w uuid,action text,data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare o uuid; a uuid; g uuid; t uuid;
begin
 o:=(data->>'objective_id')::uuid;
 if not evergreen_private.member_of(w) or not exists(select 1 from public.eg_records where id=o and workspace_id=w and kind='objective') then raise exception 'Objetivo inválido'; end if;
 if action='area' then insert into public.eg_areas(objective_id,title,weight) values(o,data->>'title',coalesce((data->>'weight')::numeric,1));
 elsif action='goal' then
  a:=(data->>'area_id')::uuid;
  if not exists(select 1 from public.eg_areas where id=a and objective_id=o) then raise exception 'Área inválida'; end if;
  insert into public.eg_goals(area_id,title,strategy,target_value,weight) values(a,data->>'title',data->>'strategy',coalesce((data->>'target')::numeric,1),coalesce((data->>'weight')::numeric,1));
 else
  g:=(data->>'goal_id')::uuid;
  if evergreen_private.goal_objective(g) is distinct from o then raise exception 'Meta inválida'; end if;
  if action='value' then
   if not exists(select 1 from public.eg_records where id=o and (assignee_id=auth.uid() or evergreen_private.admin_of(w))) then raise exception 'Somente responsável ou administrador altera progresso manual'; end if;
   update public.eg_goals set current_value=(data->>'value')::numeric where id=g and strategy<>'tasks';
  elsif action='link' then
   t:=(data->>'task_id')::uuid;
   if not exists(select 1 from public.eg_records where id=t and workspace_id=w and kind='task') then raise exception 'Tarefa inválida'; end if;
   insert into public.eg_goal_tasks(goal_id,task_id,objective_id) values(g,t,o);
  elsif action='unlink' then delete from public.eg_goal_tasks where goal_id=g and task_id=(data->>'task_id')::uuid;
  elsif action='delete' then delete from public.eg_goals where id=g;
  else raise exception 'Ação inválida'; end if;
 end if;
 perform evergreen_private.recalculate_objective(o);
end $$;
create function public.eg_goal_action(p_workspace uuid,p_action text,p_data jsonb) returns void language sql security invoker set search_path='' as $$select evergreen_private.goal_action(p_workspace,p_action,p_data)$$;
create function evergreen_private.task_goal_update() returns trigger language plpgsql security definer set search_path='' as $$
declare o uuid;
begin
 if new.kind='task' and old.status is distinct from new.status then
  for o in select distinct objective_id from public.eg_goal_tasks where task_id=new.id loop perform evergreen_private.recalculate_objective(o); end loop;
 end if;
 return new;
end $$;
create trigger eg_task_goal_update after update on public.eg_records for each row execute function evergreen_private.task_goal_update();

-- Chat threads, DMs, read cursors, reactions and resource links.
alter table public.eg_channels add column description text not null default '' check(length(description)<=1000);
alter table public.eg_channels add column archived boolean not null default false;
alter table public.eg_channels add column dm_key text;
create unique index eg_dm_pair on public.eg_channels(workspace_id,dm_key) where dm_key is not null;
alter table public.eg_messages add column parent_id uuid references public.eg_messages;
alter table public.eg_messages add column pinned boolean not null default false;
alter table public.eg_messages add column linked_record_id uuid references public.eg_records;
create index eg_messages_parent on public.eg_messages(parent_id);
create index eg_messages_linked_record on public.eg_messages(linked_record_id);
grant insert(parent_id),update(linked_record_id) on public.eg_messages to authenticated;
create table public.eg_reactions (
 message_id uuid not null references public.eg_messages on delete cascade,user_id uuid not null default auth.uid() references auth.users,
 emoji text not null check(emoji in ('👍','❤️','🎉','👀','✅')),primary key(message_id,user_id,emoji)
);
create index eg_reactions_user on public.eg_reactions(user_id);
create table public.eg_reads (
 channel_id uuid not null references public.eg_channels on delete cascade,user_id uuid not null default auth.uid() references auth.users,
 last_read_at timestamptz not null default now(),primary key(channel_id,user_id)
);
create index eg_reads_user on public.eg_reads(user_id);
alter table public.eg_reactions enable row level security;
alter table public.eg_reads enable row level security;
create function evergreen_private.message_access(m uuid) returns boolean language sql stable security definer set search_path='' as $$select evergreen_private.can_read_channel(channel_id) from public.eg_messages where id=m$$;
create policy reactions_read on public.eg_reactions for select to authenticated using(evergreen_private.message_access(message_id));
create policy reactions_insert on public.eg_reactions for insert to authenticated with check(user_id=auth.uid() and evergreen_private.message_access(message_id));
create policy reactions_delete on public.eg_reactions for delete to authenticated using(user_id=auth.uid() and evergreen_private.message_access(message_id));
create policy reads_read on public.eg_reads for select to authenticated using(evergreen_private.can_read_channel(channel_id));
revoke all on public.eg_reactions,public.eg_reads from anon,authenticated;
grant select,delete on public.eg_reactions to authenticated;
grant insert(message_id,emoji) on public.eg_reactions to authenticated;
grant select on public.eg_reads to authenticated;
create function evergreen_private.read_channel(c uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not evergreen_private.can_read_channel(c) then raise exception 'Acesso negado'; end if;
 insert into public.eg_reads(channel_id,user_id,last_read_at) values(c,auth.uid(),now()) on conflict(channel_id,user_id) do update set last_read_at=excluded.last_read_at;
end $$;
create function public.eg_read_channel(p_channel uuid) returns void language sql security invoker set search_path='' as $$select evergreen_private.read_channel(p_channel)$$;
create function evergreen_private.due_notifications(w uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not evergreen_private.member_of(w) then raise exception 'Acesso negado'; end if;
 if exists(select 1 from public.eg_profiles where id=auth.uid() and preferences->>'notify_deadlines'='false') then return; end if;
 insert into public.eg_notifications(workspace_id,recipient_id,type,title,resource_id,dedupe_key)
 select w,auth.uid(),'due',title,id,'due:'||id::text||':'||due_date::text from public.eg_records where workspace_id=w and assignee_id=auth.uid() and kind='task' and status<>'done' and archived_at is null and due_date between current_date and current_date+1
 on conflict(dedupe_key) do nothing;
end $$;
create function public.eg_due_notifications(p_workspace uuid) returns void language sql security invoker set search_path='' as $$select evergreen_private.due_notifications(p_workspace)$$;
revoke all on function evergreen_private.due_notifications(uuid),public.eg_due_notifications(uuid) from public,anon;
grant execute on function evergreen_private.due_notifications(uuid),public.eg_due_notifications(uuid) to authenticated;
create function evergreen_private.direct_channel(w uuid,u uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid; pair text;
begin
 if not evergreen_private.member_of(w) or u=auth.uid() or not exists(select 1 from public.eg_members where workspace_id=w and user_id=u) then raise exception 'Membro inválido'; end if;
 pair:=least(u::text,auth.uid()::text)||':'||greatest(u::text,auth.uid()::text);
 insert into public.eg_channels(workspace_id,name,is_private,dm_key) values(w,'DM '||pair,true,pair) on conflict(workspace_id,dm_key) where dm_key is not null do update set dm_key=excluded.dm_key returning id into c;
 insert into public.eg_channel_members values(c,auth.uid()),(c,u) on conflict do nothing;
 return c;
end $$;
create function public.eg_direct_channel(p_workspace uuid,p_user uuid) returns uuid language sql security invoker set search_path='' as $$select evergreen_private.direct_channel(p_workspace,p_user)$$;
create or replace function evergreen_private.channel_membership(p_channel uuid,p_user uuid,p_join boolean) returns void language plpgsql security definer set search_path='' as $$
declare ch public.eg_channels;
begin
 select * into ch from public.eg_channels where id=p_channel;
 if not evergreen_private.member_of(ch.workspace_id) or not exists(select 1 from public.eg_members where workspace_id=ch.workspace_id and user_id=p_user) then raise exception 'Membro inválido'; end if;
 if ch.dm_key is not null then raise exception 'Participantes de DM são fixos'; end if;
 if p_user<>auth.uid() or (p_join and ch.is_private) then if not evergreen_private.admin_of(ch.workspace_id) or not evergreen_private.can_read_channel(p_channel) then raise exception 'Acesso negado'; end if; end if;
 if p_join then insert into public.eg_channel_members values(p_channel,p_user) on conflict do nothing;
 else delete from public.eg_channel_members where channel_id=p_channel and user_id=p_user; end if;
end $$;
create function evergreen_private.channel_edit(c uuid,n text,d text,a boolean) returns void language plpgsql security definer set search_path='' as $$
declare ch public.eg_channels;
begin
 select * into ch from public.eg_channels where id=c;
 if not evergreen_private.admin_of(ch.workspace_id) or not evergreen_private.can_read_channel(c) or ch.dm_key is not null then raise exception 'Acesso negado'; end if;
 update public.eg_channels set name=n,description=d,archived=a where id=c;
end $$;
create function public.eg_channel_edit(p_channel uuid,p_name text,p_description text,p_archived boolean) returns void language sql security invoker set search_path='' as $$select evergreen_private.channel_edit(p_channel,p_name,p_description,p_archived)$$;
create function evergreen_private.pin_message(m uuid,p boolean) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;c uuid;
begin
 select ch.workspace_id,ch.id into w,c from public.eg_messages msg join public.eg_channels ch on ch.id=msg.channel_id where msg.id=m;
 if not evergreen_private.admin_of(w) or not evergreen_private.can_read_channel(c) then raise exception 'Acesso negado'; end if;
 update public.eg_messages set pinned=p where id=m;
end $$;
create function public.eg_pin_message(p_message uuid,p_pinned boolean) returns void language sql security invoker set search_path='' as $$select evergreen_private.pin_message(p_message,p_pinned)$$;
create function evergreen_private.message_context(m uuid,k text) returns uuid language plpgsql security definer set search_path='' as $$
declare msg public.eg_messages;w uuid;r uuid;
begin
 select * into msg from public.eg_messages where id=m for update;
 if not evergreen_private.message_access(m) or msg.deleted or k not in ('task','issue') then raise exception 'Acesso negado'; end if;
 if msg.linked_record_id is not null then return msg.linked_record_id; end if;
 select workspace_id into w from public.eg_channels where id=msg.channel_id;
 insert into public.eg_records(workspace_id,kind,title,description,assignee_id) values(w,k,left(msg.body,200),'Source message: '||m::text||E'\n\n'||msg.body,auth.uid()) returning id into r;
 update public.eg_messages set linked_record_id=r where id=m;
 return r;
end $$;
create function public.eg_message_context(p_message uuid,p_kind text) returns uuid language sql security invoker set search_path='' as $$select evergreen_private.message_context(p_message,p_kind)$$;
create function evergreen_private.issue_to_task(i uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare issue public.eg_records;r uuid;
begin
 select * into issue from public.eg_records where id=i and kind='issue' for update;
 if not evergreen_private.member_of(issue.workspace_id) then raise exception 'Acesso negado'; end if;
 select id into r from public.eg_records where workspace_id=issue.workspace_id and source_key='issue:'||i::text;
 if r is not null then return r; end if;
 insert into public.eg_records(workspace_id,kind,title,description,assignee_id,priority,project_id,objective_id,source_key)
 values(issue.workspace_id,'task',issue.title,issue.description||E'\n\nSource issue: '||i::text,issue.assignee_id,issue.priority,issue.project_id,issue.objective_id,'issue:'||i::text) returning id into r;
 return r;
end $$;
create function public.eg_issue_to_task(p_issue uuid) returns uuid language sql security invoker set search_path='' as $$select evergreen_private.issue_to_task(p_issue)$$;
revoke all on function evergreen_private.issue_to_task(uuid),public.eg_issue_to_task(uuid) from public,anon;
grant execute on function evergreen_private.issue_to_task(uuid),public.eg_issue_to_task(uuid) to authenticated;
create or replace function evergreen_private.message_stamp() returns trigger language plpgsql security definer set search_path='' as $$
declare c public.eg_channels;u uuid;
begin
 select * into c from public.eg_channels where id=new.channel_id;
 if TG_OP='INSERT' then
  if c.archived then raise exception 'Canal arquivado'; end if;
  if new.parent_id is not null and not exists(select 1 from public.eg_messages where id=new.parent_id and channel_id=new.channel_id and parent_id is null and not deleted) then raise exception 'Thread inválida'; end if;
  new.author_name:=coalesce((select display_name from public.eg_profiles where id=auth.uid()),'Membro');new.created_at:=now();new.edited_at:=null;
 else
  if old.deleted then raise exception 'Mensagem excluída'; end if;
  if new.linked_record_id is not null and not exists(select 1 from public.eg_records where id=new.linked_record_id and workspace_id=c.workspace_id) then raise exception 'Referência inválida'; end if;
  if new.body is distinct from old.body or new.deleted is distinct from old.deleted then new.edited_at:=now(); end if;
  if new.deleted then new.body:='[Mensagem excluída]'; end if;
 end if;
 if not new.deleted and (TG_OP='INSERT' or new.body is distinct from old.body) then
  for u in select user_id from public.eg_channel_members where channel_id=c.id and (c.dm_key is not null or position('@'||user_id::text in new.body)>0) loop
   perform evergreen_private.notify(c.workspace_id,u,case when c.dm_key is not null then 'dm' else 'message_mention' end,left(new.body,200),c.id);
  end loop;
  if new.parent_id is not null then
   for u in select distinct msg.author_id from public.eg_messages msg join public.eg_channel_members cm on cm.channel_id=c.id and cm.user_id=msg.author_id where msg.id=new.parent_id or msg.parent_id=new.parent_id loop
    perform evergreen_private.notify(c.workspace_id,u,'thread',left(new.body,200),c.id);
   end loop;
  end if;
 end if;
 return new;
end $$;
-- Grant only vetted entry points, never internal recalculation/notification helpers.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='evergreen_private' and p.proname in ('teammate','public_profiles','goal_objective','goal_access','goal_action','message_access','read_channel','direct_channel','channel_edit','pin_message','message_context') or n.nspname='public' and p.proname in ('eg_public_profiles','eg_goal_action','eg_read_channel','eg_direct_channel','eg_channel_edit','eg_pin_message','eg_message_context') loop
 execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
revoke all on function evergreen_private.profile_guard(),evergreen_private.goal_progress(uuid),evergreen_private.recalculate_objective(uuid),evergreen_private.task_goal_update(),evergreen_private.message_stamp() from public,anon,authenticated;
create function evergreen_private.progress_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='objective' and exists(select 1 from public.eg_areas where objective_id=new.id) then
  select round(coalesce(sum(ap.progress*a.weight)/nullif(sum(a.weight),0),0)) into new.progress from public.eg_areas a
  cross join lateral(select coalesce(sum(evergreen_private.goal_progress(g.id)*g.weight)/nullif(sum(g.weight),0),0) progress from public.eg_goals g where g.area_id=a.id) ap where a.objective_id=new.id;
 elsif new.kind='task' and exists(select 1 from public.eg_checklist where record_id=new.id) then
  select round(100.0*count(*) filter(where completed)/count(*)) into new.progress from public.eg_checklist where record_id=new.id;
 elsif new.kind='objective' and old.progress is distinct from new.progress and new.assignee_id is distinct from auth.uid() and not evergreen_private.admin_of(new.workspace_id) then
  raise exception 'Somente responsável ou administrador altera progresso manual';
 end if;
 return new;
end $$;
create trigger eg_progress_guard before update on public.eg_records for each row execute function evergreen_private.progress_guard();
revoke all on function evergreen_private.progress_guard() from public,anon,authenticated;

-- Private Storage: authorization is checked again when obtaining a signed URL.
create function evergreen_private.file_access(path text,writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare parts text[];resource uuid;w uuid;
begin
 parts:=string_to_array(path,'/');
 if array_length(parts,1)<>5 or parts[1] not in ('record','channel') then return false; end if;
 w:=parts[2]::uuid;resource:=parts[3]::uuid;
 if not evergreen_private.member_of(w) or (writing and parts[4]<>auth.uid()::text) then return false; end if;
 if parts[1]='record' then return exists(select 1 from public.eg_records where id=resource and workspace_id=w);
 else return exists(select 1 from public.eg_channels where id=resource and workspace_id=w) and evergreen_private.can_read_channel(resource); end if;
exception when invalid_text_representation then return false;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('eg-files','eg-files',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf','text/plain','application/zip']),
 ('eg-avatars','eg-avatars',false,2097152,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy eg_file_read on storage.objects for select to authenticated using(bucket_id='eg-files' and evergreen_private.file_access(name,false));
create policy eg_file_insert on storage.objects for insert to authenticated with check(bucket_id='eg-files' and evergreen_private.file_access(name,true));
create policy eg_file_delete on storage.objects for delete to authenticated using(bucket_id='eg-files' and evergreen_private.file_access(name,true));
create policy eg_avatar_read on storage.objects for select to authenticated using(bucket_id='eg-avatars' and evergreen_private.teammate((storage.foldername(name))[1]::uuid));
create policy eg_avatar_insert on storage.objects for insert to authenticated with check(bucket_id='eg-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy eg_avatar_delete on storage.objects for delete to authenticated using(bucket_id='eg-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create function evergreen_private.unread_counts(w uuid) returns table(channel_id uuid,unread_count bigint) language sql stable security definer set search_path='' as $$
 select c.id,count(m.id) from public.eg_channels c left join public.eg_reads r on r.channel_id=c.id and r.user_id=auth.uid()
 left join public.eg_messages m on m.channel_id=c.id and m.author_id<>auth.uid() and m.created_at>coalesce(r.last_read_at,'epoch'::timestamptz) and not m.deleted
 where c.workspace_id=w and evergreen_private.can_read_channel(c.id) group by c.id;
$$;
create function public.eg_unread_counts(p_workspace uuid) returns table(channel_id uuid,unread_count bigint) language sql security invoker set search_path='' as $$select * from evergreen_private.unread_counts(p_workspace)$$;
revoke all on function evergreen_private.unread_counts(uuid),public.eg_unread_counts(uuid) from public,anon;
grant execute on function evergreen_private.unread_counts(uuid),public.eg_unread_counts(uuid) to authenticated;
create or replace function evergreen_private.notify(w uuid,u uuid,t text,label text,r uuid) returns void language plpgsql security definer set search_path='' as $$
declare prefs jsonb;
begin
 if auth.uid() is null or not evergreen_private.member_of(w) then raise exception 'Acesso negado'; end if;
 select preferences into prefs from public.eg_profiles where id=u;
 if t in ('assigned','handoff') and coalesce((prefs->>'notify_assignments')::boolean,true)=false then return; end if;
 if t in ('mention','message_mention','thread') and coalesce((prefs->>'notify_mentions')::boolean,true)=false then return; end if;
 if u is not null and u<>auth.uid() and exists(select 1 from public.eg_members where workspace_id=w and user_id=u) then
 insert into public.eg_notifications(workspace_id,recipient_id,type,title,resource_id) values(w,u,t,label,r);
 end if;
end $$;
revoke all on function evergreen_private.notify(uuid,uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function evergreen_private.file_access(text,boolean) from public,anon;
grant execute on function evergreen_private.file_access(text,boolean) to authenticated;
alter publication supabase_realtime add table public.eg_areas,public.eg_goals,public.eg_goal_tasks,public.eg_reactions,public.eg_reads;
commit;
