begin;

-- A personal cover uses the existing private avatar bucket and the same owner path.
alter table public.eg_profiles add column cover_path text;
grant update(cover_path) on public.eg_profiles to authenticated;

create or replace function evergreen_private.profile_guard() returns trigger
language plpgsql set search_path='' as $$
declare profile_preferences jsonb; reader_count integer; invalid_value boolean;
begin
 if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'Timezone inválido'; end if;
 if new.avatar_path is not null and split_part(new.avatar_path,'/',1)<>new.id::text then raise exception 'Avatar inválido'; end if;
 if new.cover_path is not null and (split_part(new.cover_path,'/',1)<>new.id::text or new.cover_path !~ '^[0-9a-f-]{36}/covers/[A-Za-z0-9_.-]{1,120}$') then raise exception 'Capa inválida'; end if;
 if length(new.preferences::text)>4000 or
  (new.preferences ? 'notify_assignments' and jsonb_typeof(new.preferences->'notify_assignments')<>'boolean') or
  (new.preferences ? 'notify_mentions' and jsonb_typeof(new.preferences->'notify_mentions')<>'boolean') or
  (new.preferences ? 'focus_minutes' and (jsonb_typeof(new.preferences->'focus_minutes')<>'number' or (new.preferences->>'focus_minutes')::numeric not between 1 and 480)) or
  (new.preferences ? 'daily_goal_minutes' and (jsonb_typeof(new.preferences->'daily_goal_minutes')<>'number' or (new.preferences->>'daily_goal_minutes')::numeric not between 0 and 1440)) then raise exception 'Preferências inválidas'; end if;

 profile_preferences:=new.preferences->'professional_profile';
 if profile_preferences is not null then
  if jsonb_typeof(profile_preferences)<>'object' then raise exception 'Preferências profissionais inválidas'; end if;
  if profile_preferences ? 'visibility' and profile_preferences->>'visibility' not in ('workspace','selected','private') then raise exception 'Visibilidade inválida'; end if;
  if profile_preferences ? 'show_custom_status' and jsonb_typeof(profile_preferences->'show_custom_status')<>'boolean' then raise exception 'Preferência de status inválida'; end if;
  if profile_preferences ? 'allowed_users' then
   if jsonb_typeof(profile_preferences->'allowed_users')<>'array' or jsonb_array_length(profile_preferences->'allowed_users')>100 then raise exception 'Lista de pessoas autorizadas inválida'; end if;
   select count(*) into reader_count from jsonb_array_elements_text(profile_preferences->'allowed_users') as item(value)
    where item.value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
   if reader_count>0 then raise exception 'Lista de pessoas autorizadas inválida'; end if;
  end if;
  if profile_preferences ? 'specialties' then
   if jsonb_typeof(profile_preferences->'specialties')<>'array' or jsonb_array_length(profile_preferences->'specialties')>20 then raise exception 'Especializações inválidas'; end if;
   select exists(select 1 from jsonb_array_elements_text(profile_preferences->'specialties') as item(value) where length(trim(item.value)) not between 1 and 50) into invalid_value;
   if invalid_value then raise exception 'Especializações inválidas'; end if;
  end if;
 end if;
 return new;
end $$;

-- The profile owner chooses the audience. Members can only see a profile when
-- both parties belong to the requested workspace and the owner allows it.
create or replace function evergreen_private.profile_visible(w uuid,u uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select evergreen_private.member_of(w) and auth.uid() is not null and exists(
  select 1 from public.eg_profiles p
  join public.eg_members subject_members on subject_members.user_id=p.id and subject_members.workspace_id=w
  join public.eg_members viewer_members on viewer_members.workspace_id=w and viewer_members.user_id=auth.uid()
  where p.id=u and subject_members.suspended_at is null and viewer_members.suspended_at is null and (
   p.id=auth.uid()
   or coalesce(p.preferences#>>'{professional_profile,visibility}','workspace')='workspace'
   or (coalesce(p.preferences#>>'{professional_profile,visibility}','workspace')='selected'
       and coalesce(p.preferences#>'{professional_profile,allowed_users}','[]'::jsonb) ? auth.uid()::text)
  )
 );
$$;

-- Keep the existing list projection narrow and enforce profile visibility here too,
-- including when another part of the app requests teammate names or status.
create or replace function evergreen_private.public_profiles(w uuid)
returns table(id uuid,display_name text,username text,bio text,avatar_path text,custom_status text,job_title text)
language sql stable security definer set search_path='' as $$
 select p.id,p.display_name,p.username,p.bio,p.avatar_path,
  case when p.preferences#>>'{professional_profile,show_custom_status}'='true' then p.custom_status else '' end,
  p.job_title
 from public.eg_profiles p join public.eg_members m on m.user_id=p.id
 where m.workspace_id=w and evergreen_private.profile_visible(w,p.id);
$$;

create or replace function evergreen_private.professional_profile(p_workspace uuid,p_user uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; profile_visibility text;
begin
 if auth.uid() is null or not evergreen_private.profile_visible(p_workspace,p_user) then
  raise exception 'Perfil não disponível nesta empresa.' using errcode='42501';
 end if;
 select coalesce(p.preferences#>>'{professional_profile,visibility}','workspace') into profile_visibility
 from public.eg_profiles p where p.id=p_user;
 if profile_visibility is null then raise exception 'Perfil ainda não disponível.' using errcode='P0002'; end if;

 select jsonb_build_object(
  'id',p.id,
  'display_name',p.display_name,
  'job_title',p.job_title,
  'bio',p.bio,
  'username',p.username,
  'custom_status',case when p.preferences#>>'{professional_profile,show_custom_status}'='true' then p.custom_status else '' end,
  'cover_path',p.cover_path,
  'specialties',coalesce(p.preferences#>'{professional_profile,specialties}','[]'::jsonb),
  'companies',coalesce((
   select jsonb_agg(jsonb_build_object(
    'id',w.id,'name',w.name,'relationship',r.relationship,
    'relationship_updated_at',r.updated_at,
    'system_level',case when a.level_code is null then null else jsonb_build_object('code',a.level_code,'name',l.name,'updated_at',a.updated_at) end,
    'participation_bps',(select sum(e.proposed_bps)::integer from public.eg_equity_records e where e.workspace_id=w.id and e.user_id=p.id and e.state='documented' and evergreen_private.os_equity_read(w.id,p.id))
   ) order by w.name)
   from public.eg_members m join public.eg_workspaces w on w.id=m.workspace_id
   left join public.eg_professional_roles r on r.workspace_id=w.id and r.user_id=p.id
   left join public.eg_organization_assignments a on a.workspace_id=w.id and a.user_id=p.id
   left join public.eg_organization_levels l on l.workspace_id=a.workspace_id and l.code=a.level_code
   where m.user_id=p.id and evergreen_private.member_of(w.id)
    and not exists(select 1 from public.eg_groups g where g.communication_workspace=w.id)
  ),'[]'::jsonb),
  'original_founders',coalesce((
   select jsonb_agg(jsonb_build_object('name',g.name,'declared_at',f.declared_at) order by g.name)
   from public.eg_original_founders f join public.eg_groups g on g.id=f.group_id
   where f.user_id=p.id and (evergreen_private.founder_can(g.id,'people') or exists(
    select 1 from public.eg_group_companies c where c.group_id=g.id and evergreen_private.member_of(c.workspace_id)
   ))
  ),'[]'::jsonb),
  'trajectory',coalesce((
   select jsonb_agg(recent.event order by recent.happened_at desc)
   from (
    select events.event,events.happened_at from (
     select jsonb_build_object('kind','project','title',a.title,'description','Marco de projeto registrado','happened_at',a.created_at) as event,a.created_at as happened_at
     from public.eg_activity a where a.workspace_id=p_workspace and a.actor_id=p.id and a.type in ('project_created','project_completed')
     union all
     select jsonb_build_object('kind','role','title',w.name,'description','Vínculo profissional atualizado','happened_at',r.updated_at),r.updated_at
     from public.eg_professional_roles r join public.eg_workspaces w on w.id=r.workspace_id where r.workspace_id=p_workspace and r.user_id=p.id
     union all
     select jsonb_build_object('kind','founder','title',g.name,'description','Fundador original confirmado','happened_at',f.declared_at),f.declared_at
     from public.eg_original_founders f join public.eg_groups g on g.id=f.group_id
     where f.user_id=p.id and (evergreen_private.founder_can(g.id,'people') or exists(
      select 1 from public.eg_group_companies c where c.group_id=g.id and evergreen_private.member_of(c.workspace_id)
     ))
    ) events order by events.happened_at desc limit 12
   ) recent
  ),'[]'::jsonb),
  'executive',case when p.id=auth.uid() then jsonb_build_object(
   'linked_companies',jsonb_array_length(coalesce((
    select jsonb_agg(w.id) from public.eg_members m join public.eg_workspaces w on w.id=m.workspace_id
    where m.user_id=p.id and evergreen_private.member_of(w.id) and not exists(select 1 from public.eg_groups g where g.communication_workspace=w.id)
   ),'[]'::jsonb)),
   'active_roles',(
    select count(*)::integer from public.eg_professional_roles r join public.eg_members m on m.workspace_id=r.workspace_id and m.user_id=r.user_id
    join public.eg_workspaces w on w.id=r.workspace_id where r.user_id=p.id and evergreen_private.member_of(w.id)
     and not exists(select 1 from public.eg_groups g where g.communication_workspace=w.id)
   ) + (
    select count(*)::integer from public.eg_original_founders f join public.eg_groups g on g.id=f.group_id
    where f.user_id=p.id and (evergreen_private.founder_can(g.id,'people') or exists(select 1 from public.eg_group_companies c where c.group_id=g.id and evergreen_private.member_of(c.workspace_id)))
   ),
   'assigned_projects',(
    select count(*)::integer from public.eg_records r join public.eg_members m on m.workspace_id=r.workspace_id and m.user_id=p.id
    where r.assignee_id=p.id and r.kind='project' and r.status<>'done' and evergreen_private.member_of(r.workspace_id)
     and not exists(select 1 from public.eg_groups g where g.communication_workspace=r.workspace_id)
   ),
   'pending_decisions',(
    select count(*)::integer from public.eg_os_proposals q
    where p.id=auth.uid() and p.id=any(q.eligible) and q.kind<>'finance' and q.status='open' and q.deadline>now()
     and evergreen_private.os_proposal_access(q)
     and not exists(select 1 from public.eg_os_votes v where v.proposal_id=q.id and v.user_id=p.id)
   ),
   'administrative_responsibilities',(
    select count(*)::integer from public.eg_members m join public.eg_workspaces w on w.id=m.workspace_id
    left join public.eg_organization_assignments a on a.workspace_id=m.workspace_id and a.user_id=m.user_id
    left join public.eg_organization_levels l on l.workspace_id=a.workspace_id and l.code=a.level_code
    where m.user_id=p.id and evergreen_private.member_of(w.id)
     and not exists(select 1 from public.eg_groups g where g.communication_workspace=w.id)
     and ((a.level_code is not null and 'company.admin'=any(l.permissions)) or (a.level_code is null and m.role in ('owner','admin')))
   )
  ) else null end
 ) into result
 from public.eg_profiles p where p.id=p_user;

 if result is null then raise exception 'Perfil ainda não disponível.' using errcode='P0002'; end if;
 return result;
end $$;

-- The exposed RPC is invoker-only. Its narrowly scoped definer helper lives in
-- the non-exposed schema and checks both workspace membership and user consent.
create or replace function public.eg_professional_profile(p_workspace uuid,p_user uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select evergreen_private.professional_profile(p_workspace,p_user);
$$;

drop policy if exists eg_avatar_read on storage.objects;
create policy eg_avatar_read on storage.objects for select to authenticated using(
 bucket_id='eg-avatars' and (
  split_part(name,'/',1)=auth.uid()::text
  or exists(
   select 1 from public.eg_members m
   where m.user_id=case when split_part(name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(name,'/',1)::uuid else null end
    and evergreen_private.profile_visible(m.workspace_id,m.user_id)
  )
 )
);

revoke all on function evergreen_private.profile_visible(uuid,uuid),evergreen_private.professional_profile(uuid,uuid),public.eg_professional_profile(uuid,uuid) from public,anon,authenticated;
grant execute on function evergreen_private.profile_visible(uuid,uuid),evergreen_private.professional_profile(uuid,uuid),public.eg_professional_profile(uuid,uuid) to authenticated;
commit;
