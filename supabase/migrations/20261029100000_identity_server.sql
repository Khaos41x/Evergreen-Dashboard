-- Identity BFF: official Supabase sessions, profile metadata and live revocation.
-- Apply only after productivity + designated owner + internal holding migration.
begin;
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
commit;
