begin;

-- A first partner is descriptive profile data. It never grants authorization.
alter table public.eg_professional_roles
 add column first_partner boolean not null default false;
alter table public.eg_professional_roles
 add constraint eg_professional_first_partner_relationship
 check(not first_partner or relationship='partner');
create unique index eg_professional_first_partner_per_company
 on public.eg_professional_roles(workspace_id) where first_partner;

create function public.eg_profile_relationship_v2(
 p_workspace uuid,p_user uuid,p_relationship text,p_first_partner boolean
) returns void language plpgsql security definer set search_path='' as $$
begin
 if not evergreen_private.admin_of(p_workspace) then
  raise exception 'Apenas administradores desta empresa podem definir vínculos.' using errcode='42501';
 end if;
 if p_relationship not in ('founder','partner','ceo','leader','member') or p_relationship is null then
  raise exception 'Atuação profissional inválida.' using errcode='22023';
 end if;
 if p_first_partner and p_relationship<>'partner' then
  raise exception 'A distinção de primeiro sócio exige atuação como sócio.' using errcode='22023';
 end if;
 if not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=p_user) then
  raise exception 'A pessoa precisa ser membro desta empresa.' using errcode='42501';
 end if;
 if p_first_partner then
  update public.eg_professional_roles set first_partner=false
   where workspace_id=p_workspace and user_id<>p_user and first_partner;
 end if;
 insert into public.eg_professional_roles(workspace_id,user_id,relationship,updated_by,first_partner)
 values(p_workspace,p_user,p_relationship,auth.uid(),p_first_partner)
 on conflict(workspace_id,user_id) do update set relationship=excluded.relationship,
  updated_by=auth.uid(),updated_at=now(),first_partner=excluded.first_partner;
end $$;

-- Keep the older RPC safe: changing a role clears a first-partner designation.
create or replace function public.eg_profile_relationship(p_workspace uuid,p_user uuid,p_relationship text)
 returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.eg_profile_relationship_v2(p_workspace,p_user,p_relationship,false);
end $$;

create function public.eg_profile_honors(p_workspace uuid,p_user uuid)
 returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not evergreen_private.profile_visible(p_workspace,p_user)
  or not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=p_user) then
  raise exception 'Perfil não disponível nesta empresa.' using errcode='42501';
 end if;
 return jsonb_build_object('first_partner',coalesce((
  select first_partner from public.eg_professional_roles
  where workspace_id=p_workspace and user_id=p_user and relationship='partner'
 ),false));
end $$;
revoke all on function public.eg_profile_relationship_v2(uuid,uuid,text,boolean),public.eg_profile_honors(uuid,uuid) from public,anon,authenticated;
grant execute on function public.eg_profile_relationship_v2(uuid,uuid,text,boolean),public.eg_profile_honors(uuid,uuid) to authenticated;

-- Each seat holder may rename only their own executive office.
alter table public.eg_founder_seats
 add column office_name text not null default 'Escritório executivo'
 check(length(trim(office_name)) between 2 and 50);

create function public.eg_founder_office_rename(p_group uuid,p_name text)
 returns void language plpgsql security definer set search_path='' as $$
declare clean_name text:=trim(coalesce(p_name,''));
begin
 if not evergreen_private.live_session() or not evergreen_private.library_member(p_group,auth.uid()) then
  raise exception 'Apenas titulares autorizados podem renomear seu próprio escritório.' using errcode='42501';
 end if;
 if length(clean_name) not between 2 and 50 then
  raise exception 'O nome do escritório precisa ter de 2 a 50 caracteres.' using errcode='22023';
 end if;
 update public.eg_founder_seats s set office_name=clean_name
  from public.eg_councils c where c.id=s.council_id and c.group_id=p_group
   and s.user_id=auth.uid();
 if not found then raise exception 'Não foi encontrado um assento desta conta.' using errcode='42501'; end if;
end $$;

create or replace function public.eg_founder_library(p_group uuid)
 returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not evergreen_private.live_session() or not evergreen_private.library_member(p_group,auth.uid()) then
  raise exception 'A biblioteca é exclusiva dos titulares dos três assentos de fundadores.' using errcode='42501';
 end if;
 return jsonb_build_object(
  'scene','founders-library',
  'scope',p_group,
  'workspace_id',(select workspace_id from public.eg_group_spaces where group_id=p_group),
  'members',(
   select jsonb_agg(jsonb_build_object(
    'id',coalesce(s.user_id,s.id),
    'name',coalesce(p.display_name,'Assento '||s.position||' · aguardando titular'),
    'seat',s.position-1,
    'seatNumber',s.position,
    'vacant',s.user_id is null,
    'officeName',s.office_name,
    'jobTitle','Chairman · assento '||s.position,
    'company',g.name,
    'presence',case
     when s.user_id is null then 'unknown'
     when pr.last_seen>now()-interval '90 seconds'
      and exists(select 1 from auth.sessions live where live.id=pr.session_id and live.user_id=s.user_id and (live.not_after is null or live.not_after>now()))
      then pr.state
     else 'offline'
    end,
    'lastSeen',pr.last_seen,
    'focus',coalesce((select string_agg(distinct f.title,' · ') from public.eg_focus f
      where f.user_id=s.user_id and f.status='running' and evergreen_private.member_of(f.workspace_id)),'')
   ) order by s.position)
   from public.eg_founder_seats s
   join public.eg_councils c on c.id=s.council_id
   join public.eg_groups g on g.id=c.group_id
   left join public.eg_profiles p on p.id=s.user_id
   left join public.eg_founder_presence pr on pr.group_id=g.id and pr.user_id=s.user_id
   where c.group_id=p_group
  ),
  'tasks','[]'::jsonb,'projects','[]'::jsonb,'activity','[]'::jsonb,'channels','[]'::jsonb
 );
end $$;

revoke all on function public.eg_founder_office_rename(uuid,text) from public,anon,authenticated;
grant execute on function public.eg_founder_office_rename(uuid,text) to authenticated;
commit;
