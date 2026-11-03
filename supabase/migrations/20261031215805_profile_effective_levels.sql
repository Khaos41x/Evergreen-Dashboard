begin;
-- Align profile labels with the existing organization-context role fallback.
-- No memberships, level assignments, permissions or attested medals are changed.
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
    'system_level',jsonb_build_object('code',coalesce(a.level_code,case m.role when 'owner' then 'A0' when 'admin' then 'A1' else 'A5' end),'name',coalesce(l.name,case coalesce(a.level_code,case m.role when 'owner' then 'A0' when 'admin' then 'A1' else 'A5' end) when 'A0' then 'APEX' when 'A1' then 'Principal' when 'A2' then 'Executivo' when 'A3' then 'Diretor' when 'A4' then 'Gerente' when 'A5' then 'Integrante' else 'Convidado' end),'updated_at',a.updated_at),
    'participation_bps',(select sum(e.proposed_bps)::integer from public.eg_equity_records e where e.workspace_id=w.id and e.user_id=p.id and e.state='documented' and evergreen_private.os_equity_read(w.id,p.id))
   ) order by w.name)
   from public.eg_members m join public.eg_workspaces w on w.id=m.workspace_id
   left join public.eg_professional_roles r on r.workspace_id=w.id and r.user_id=p.id
   left join public.eg_organization_assignments a on a.workspace_id=w.id and a.user_id=p.id
   left join public.eg_organization_levels l on l.workspace_id=m.workspace_id and l.code=coalesce(a.level_code,case m.role when 'owner' then 'A0' when 'admin' then 'A1' else 'A5' end)
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
commit;
