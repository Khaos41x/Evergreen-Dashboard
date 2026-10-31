begin;
-- Only the three designated seat holders; never infer identity from a name/job title.
create function evergreen_private.library_member(g uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.eg_founder_seats s join public.eg_councils c on c.id=s.council_id join public.eg_group_members m on m.group_id=c.group_id and m.user_id=s.user_id where c.group_id=g and s.user_id=u and (c.activated_at is null or s.accepted_at is not null));
$$;
create table public.eg_founder_presence(group_id uuid not null references public.eg_groups,user_id uuid not null references auth.users,state text not null check(state in ('online','away')),last_seen timestamptz not null default now(),session_id uuid not null,primary key(group_id,user_id));
alter table public.eg_founder_presence enable row level security;
revoke all on public.eg_founder_presence from public,anon,authenticated;
create function public.eg_library_heartbeat(p_group uuid,p_state text) returns void language plpgsql security definer set search_path='' as $$begin
 if not evergreen_private.live_session() or not evergreen_private.library_member(p_group,auth.uid()) then raise exception 'Biblioteca reservada aos titulares dos três assentos.' using errcode='42501';end if;
 if p_state not in ('online','away') or p_state is null then raise exception 'Estado de presença inválido.';end if;
 insert into public.eg_founder_presence values(p_group,auth.uid(),p_state,now(),(auth.jwt()->>'session_id')::uuid) on conflict(group_id,user_id) do update set state=excluded.state,last_seen=excluded.last_seen,session_id=excluded.session_id;
end $$;
create function public.eg_founder_library(p_group uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not evergreen_private.live_session() or not evergreen_private.library_member(p_group,auth.uid()) then raise exception 'A biblioteca é exclusiva dos titulares dos três assentos de fundadores.' using errcode='42501';end if;
 return jsonb_build_object('scene','founders-library','scope',p_group,'workspace_id',(select workspace_id from public.eg_group_spaces where group_id=p_group),
 'members',(select jsonb_agg(jsonb_build_object('id',coalesce(s.user_id,s.id),'name',coalesce(p.display_name,'Assento '||s.position||' · aguardando titular'),'seat',s.position-1,'seatNumber',s.position,'vacant',s.user_id is null,'jobTitle','Chairman · assento '||s.position,'company',g.name,'presence',case when s.user_id is null then 'unknown' when pr.last_seen>now()-interval '90 seconds' and exists(select 1 from auth.sessions live where live.id=pr.session_id and live.user_id=s.user_id and (live.not_after is null or live.not_after>now())) then pr.state else 'offline' end,'lastSeen',pr.last_seen,'focus',coalesce((select string_agg(distinct f.title,' · ') from public.eg_focus f where f.user_id=s.user_id and f.status='running' and evergreen_private.member_of(f.workspace_id)),'')) order by s.position) from public.eg_founder_seats s join public.eg_councils c on c.id=s.council_id join public.eg_groups g on g.id=c.group_id left join public.eg_profiles p on p.id=s.user_id left join public.eg_founder_presence pr on pr.group_id=g.id and pr.user_id=s.user_id where c.group_id=p_group),
 'tasks','[]'::jsonb,'projects','[]'::jsonb,'activity','[]'::jsonb,'channels','[]'::jsonb);
end $$;
-- Replace the old broad office entry point as well, avoiding a second route around the gate.
create or replace function public.eg_holding_office(p_group uuid) returns jsonb language sql stable security definer set search_path='' as $$select public.eg_founder_library(p_group)$$;
alter function public.eg_os_context() rename to eg_os_context_before_library;
revoke all on function public.eg_os_context_before_library() from public,anon,authenticated;
create function public.eg_os_context() returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 result:=public.eg_os_context_before_library();return jsonb_set(result,'{groups}',coalesce((select jsonb_agg(g||jsonb_build_object('library_access',evergreen_private.library_member((g->>'id')::uuid,auth.uid()))) from jsonb_array_elements(result->'groups')g),'[]'::jsonb));
end $$;
revoke all on function public.eg_os_context() from public,anon,authenticated;grant execute on function public.eg_os_context() to authenticated;
revoke all on function evergreen_private.library_member(uuid,uuid),public.eg_library_heartbeat(uuid,text),public.eg_founder_library(uuid),public.eg_holding_office(uuid) from public,anon,authenticated;
grant execute on function public.eg_library_heartbeat(uuid,text),public.eg_founder_library(uuid),public.eg_holding_office(uuid) to authenticated;
commit;
