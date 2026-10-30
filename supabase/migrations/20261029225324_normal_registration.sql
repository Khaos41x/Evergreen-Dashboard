-- Explicit product change: account registration no longer requires an invitation.
-- Existing companies, memberships and financial/Founders grants remain isolated.
begin;
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
