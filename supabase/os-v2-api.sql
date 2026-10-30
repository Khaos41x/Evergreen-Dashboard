alter function public.eg_holding_context() rename to eg_holding_context_before_os;
revoke all on function public.eg_holding_context_before_os() from public,anon,authenticated;
create function public.eg_holding_context() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v jsonb;begin
 v:=public.eg_holding_context_before_os();
 return jsonb_set(v,'{companies}',coalesce((select jsonb_agg(c) from jsonb_array_elements(v->'companies') c where not exists(select 1 from public.eg_group_spaces s where s.workspace_id=(c->>'id')::uuid)),'[]'::jsonb));
end $$;
revoke all on function public.eg_holding_context() from public,anon,authenticated;grant execute on function public.eg_holding_context() to authenticated;
-- This source is composed into the versioned OS migration by scripts/compose-os-migration.mjs.
create function public.eg_os_context() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not evergreen_private.live_session() then raise exception 'Sessão necessária.' using errcode='42501';end if;
 return jsonb_build_object('groups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'workspace_id',s.workspace_id,'chairman',evergreen_private.os_chairman(g.id),'admin',evergreen_private.os_group_admin(g.id),'council_active',c.activated_at is not null) order by g.name) from public.eg_groups g join public.eg_group_spaces s on s.group_id=g.id join public.eg_councils c on c.group_id=g.id where evergreen_private.os_group_member(g.id)),'[]'::jsonb),
 'companies',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'slug',d.slug,'description',coalesce(d.description,''),'sector',coalesce(d.sector,''),'type',coalesce(d.organization_type,'company'),'legal_state',coalesce(d.legal_state,'forming'),'visibility',coalesce(d.visibility,'private'),'group_id',gc.group_id,'link_type',case when gc.group_id is null then 'EXTERNAL' else 'GROUP_COMPANY' end,'level',coalesce(a.level_code,case m.role when 'owner' then 'A0' when 'admin' then 'A1' else 'A5' end),'level_name',coalesce(l.name,case m.role when 'owner' then 'APEX' when 'admin' then 'PRINCIPAL' else 'MEMBER' end),'job_title',p.job_title,'relationship',r.relationship,'admin',evergreen_private.os_can(w.id,'company.admin'),'unread',(select count(*) from public.eg_notifications n where n.workspace_id=w.id and n.recipient_id=auth.uid() and n.read_at is null)) order by w.name)
 from public.eg_workspaces w join public.eg_members m on m.workspace_id=w.id and m.user_id=auth.uid() left join public.eg_company_details d on d.workspace_id=w.id left join public.eg_group_companies gc on gc.workspace_id=w.id left join public.eg_profiles p on p.id=m.user_id left join public.eg_professional_roles r on r.workspace_id=w.id and r.user_id=m.user_id left join public.eg_organization_assignments a on a.workspace_id=w.id and a.user_id=auth.uid() left join public.eg_organization_levels l on l.workspace_id=w.id and l.code=a.level_code
 where not exists(select 1 from public.eg_groups g where g.communication_workspace=w.id) and not exists(select 1 from public.eg_group_spaces s where s.workspace_id=w.id) and not exists(select 1 from public.eg_shared_channels sc where sc.workspace_id=w.id)),'[]'::jsonb));
end $$;
create function public.eg_os_snapshot(p_workspace uuid default null,p_group uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare scope uuid;result jsonb;
begin
 if (p_workspace is null)=(p_group is null) then raise exception 'Escolha uma organização.';end if;
 if p_group is not null then
 if not evergreen_private.os_group_member(p_group) then raise exception 'Grupo não autorizado.' using errcode='42501';end if;
 select workspace_id into scope from public.eg_group_spaces where group_id=p_group;
 else scope:=p_workspace;if not evergreen_private.member_of(scope) then raise exception 'Empresa não autorizada.' using errcode='42501';end if;end if;
 select jsonb_build_object('workspace_id',scope,'name',w.name,'group_id',p_group,'admin',case when p_group is null then evergreen_private.os_can(scope,'company.admin') else evergreen_private.os_group_admin(p_group) end,
 'options',jsonb_build_object(
 'seats',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'position',s.position,'name',pr.display_name) order by s.position) from public.eg_founder_seats s join public.eg_councils c on c.id=s.council_id left join public.eg_profiles pr on pr.id=s.user_id where c.group_id=p_group),'[]'::jsonb),
 'companies',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name) order by w.name) from public.eg_group_companies gc join public.eg_workspaces w on w.id=gc.workspace_id where gc.group_id=p_group and evergreen_private.os_group_admin(p_group)),'[]'::jsonb),
 'links',coalesce((select jsonb_agg(jsonb_build_object('id',ol.id,'name',w.name||case ol.kind when 'PARTNER' then ' · parceria' else ' · empresa do grupo' end)) from public.eg_organization_links ol join public.eg_workspaces w on w.id=ol.workspace_id where ol.group_id=p_group and evergreen_private.os_group_admin(p_group)),'[]'::jsonb),
 'equity',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',pr.display_name,'bps',e.proposed_bps,'state',e.state)) from public.eg_equity_records e join public.eg_profiles pr on pr.id=e.user_id where e.workspace_id=scope and evergreen_private.os_equity_read(scope,e.user_id)),'[]'::jsonb),
 'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'currency',c.currency)) from public.eg_fin_accounts a join public.eg_fin_companies c on c.id=a.company_id where c.workspace_id=scope and evergreen_private.finance_role(c.id)),'[]'::jsonb)),
 'can_propose',case when p_group is null then evergreen_private.os_can(scope,'governance') else evergreen_private.os_chairman(p_group) end,
 'details',(select to_jsonb(d) from public.eg_company_details d where d.workspace_id=scope),
 'people',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.display_name,'job_title',p.job_title,'role',m.role,'level',case when p_group is null then a.level_code when exists(select 1 from public.eg_founder_seats fs join public.eg_councils fc on fc.id=fs.council_id where fc.group_id=p_group and fc.activated_at is not null and fs.user_id=m.user_id) then 'E0' else 'E'||right(coalesce(a.level_code,'A5'),1) end,'level_name',case when p_group is null then l.name else (select gl.name from public.eg_group_levels gl where gl.group_id=p_group and gl.code=case when evergreen_private.os_chairman(p_group) and m.user_id=auth.uid() then 'E0' when exists(select 1 from public.eg_founder_seats fs join public.eg_councils fc on fc.id=fs.council_id where fc.group_id=p_group and fc.activated_at is not null and fs.user_id=m.user_id) then 'E0' else 'E'||right(coalesce(a.level_code,'A5'),1) end) end,'relationship',r.relationship) order by p.display_name) from public.eg_members m join public.eg_profiles p on p.id=m.user_id left join public.eg_organization_assignments a on a.workspace_id=m.workspace_id and a.user_id=m.user_id left join public.eg_organization_levels l on l.workspace_id=a.workspace_id and l.code=a.level_code left join public.eg_professional_roles r on r.workspace_id=m.workspace_id and r.user_id=m.user_id where m.workspace_id=scope),'[]'::jsonb),
 'levels',case when p_group is null then coalesce((select jsonb_agg(to_jsonb(l) order by code) from public.eg_organization_levels l where workspace_id=scope),'[]'::jsonb) else coalesce((select jsonb_agg(jsonb_build_object('code',gl.code,'name',gl.name,'permissions',l.permissions) order by gl.code) from public.eg_group_levels gl left join public.eg_organization_levels l on l.workspace_id=scope and l.code='A'||right(gl.code,1) where gl.group_id=p_group),'[]'::jsonb) end,
 'companies',case when p_group is not null then coalesce((select jsonb_agg(jsonb_build_object('id',co.id,'name',co.name,'description',d.description,'operational',evergreen_private.member_of(co.id),'finance',evergreen_private.company_cap(co.id,'finance')) order by co.name) from public.eg_group_companies gc join public.eg_workspaces co on co.id=gc.workspace_id left join public.eg_company_details d on d.workspace_id=co.id where gc.group_id=p_group and (evergreen_private.company_cap(co.id,'companies') or exists(select 1 from public.eg_organization_links ol where ol.group_id=p_group and ol.workspace_id=co.id and ol.state='APPROVED' and 'companies'=any(ol.scopes)))),'[]'::jsonb) else '[]'::jsonb end,
 'links',coalesce((select jsonb_agg(to_jsonb(ol)) from public.eg_organization_links ol where (ol.workspace_id=scope and evergreen_private.os_can(scope,'company.admin')) or (ol.group_id=p_group and evergreen_private.os_group_admin(p_group))),'[]'::jsonb),
 'proposals',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'body',p.body,'kind',p.kind,'payload',p.payload,'status',p.status,'proposer_id',p.proposer_id,'required_votes',p.required_votes,'conflicts',p.conflicts,'eligible',p.eligible,'deadline',p.deadline,'version',p.version,'votes',coalesce((select jsonb_agg(jsonb_build_object('user_id',v.user_id,'approve',v.approve)) from public.eg_os_votes v where v.proposal_id=p.id),'[]'::jsonb)) order by p.created_at desc) from public.eg_os_proposals p where (p.workspace_id=scope or p.group_id=p_group) and evergreen_private.os_proposal_access(p)),'[]'::jsonb),
 'audit',case when evergreen_private.os_can(scope,'company.admin') or evergreen_private.os_group_admin(p_group) then coalesce((select jsonb_agg(to_jsonb(q)) from (select id,action,actor_id,details,created_at from public.eg_os_audit a where a.workspace_id=scope or a.group_id=p_group order by created_at desc limit 100) q),'[]'::jsonb) else '[]'::jsonb end,
 'counts',jsonb_build_object('tasks',(select count(*) from public.eg_records r where r.workspace_id=scope and r.kind='task' and r.archived_at is null and evergreen_private.record_access(r.id) and r.status<>'done'),'projects',(select count(*) from public.eg_records r where r.workspace_id=scope and r.kind='project' and r.archived_at is null and evergreen_private.record_access(r.id)),'channels',(select count(*) from public.eg_channels c where c.workspace_id=scope and not c.archived and evergreen_private.can_read_channel(c.id)))) into result from public.eg_workspaces w where w.id=scope;
 return result;
end $$;

create function public.eg_os_link(p_action text,p_workspace uuid default null,p_group uuid default null,p_id uuid default null,p_data jsonb default '{}') returns uuid language plpgsql security definer set search_path='' as $$
declare l public.eg_organization_links;result uuid;
begin
 perform evergreen_private.require_recent();
 if p_action='request' then
 if not evergreen_private.os_can(p_workspace,'company.admin') or not exists(select 1 from public.eg_groups where id=p_group) then raise exception 'Organização ou grupo indisponível.' using errcode='42501';end if;
 if exists(select 1 from public.eg_groups where communication_workspace=p_workspace) or exists(select 1 from public.eg_group_spaces where workspace_id=p_workspace) then raise exception 'Workspaces institucionais não podem ser vinculados como empresas.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_group::text||p_workspace::text,0));
 select * into l from public.eg_organization_links where group_id=p_group and workspace_id=p_workspace;
 if found then if l.kind<>coalesce(p_data->>'kind','GROUP_COMPANY') or l.scopes<>array(select jsonb_array_elements_text(coalesce(p_data->'scopes','["companies"]'::jsonb))) then raise exception 'Já existe um pedido com outro escopo.';end if;return l.id;end if;
 insert into public.eg_organization_links(group_id,workspace_id,kind,scopes,company_approved_by) values(p_group,p_workspace,coalesce(p_data->>'kind','GROUP_COMPANY'),array(select jsonb_array_elements_text(coalesce(p_data->'scopes','["companies"]'::jsonb))),auth.uid()) returning id into result;
 else
 select * into l from public.eg_organization_links where id=p_id for update;if l.id is null then raise exception 'Vínculo indisponível.';end if;result:=l.id;
 if l.state<>'PENDING' then raise exception 'O vínculo não está pendente.';end if;
 if p_action='company_approve' then
 if not evergreen_private.os_can(l.workspace_id,'company.admin') then raise exception 'Aprovação da empresa necessária.' using errcode='42501';end if;
 update public.eg_organization_links set company_approved_by=auth.uid(),version=version+1 where id=l.id;
 elsif p_action in ('group_approve','reject') then
 if not evergreen_private.os_group_admin(l.group_id) then raise exception 'Aprovação do grupo necessária.' using errcode='42501';end if;
 if p_action='group_approve' and exists(select 1 from public.eg_councils where group_id=l.group_id and activated_at is not null) then raise exception 'COUNCIL_REQUIRED: aprove o vínculo por proposta colegiada.' using errcode='42501';end if;
 update public.eg_organization_links set group_approved_by=auth.uid(),state=case when p_action='reject' then 'REJECTED' else state end,version=version+1 where id=l.id;
 else raise exception 'Ação de vínculo inválida.';end if;
 select * into l from public.eg_organization_links where id=l.id;
 if l.company_approved_by is not null and l.group_approved_by is not null and l.state='PENDING' then
 update public.eg_organization_links set state='APPROVED',version=version+1 where id=l.id;
 if l.kind='GROUP_COMPANY' then insert into public.eg_group_companies values(l.group_id,l.workspace_id);end if;
 end if;
 end if;
 insert into public.eg_os_audit(workspace_id,group_id,action,details) values(coalesce(l.workspace_id,p_workspace),coalesce(l.group_id,p_group),'link.'||p_action,jsonb_build_object('id',result));return result;
end $$;

create function public.eg_os_group_chat(p_workspace uuid,p_name text,p_people uuid[],p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;u uuid;prior public.eg_os_requests;data jsonb:=jsonb_build_object('name',p_name,'people',p_people,'workspace',p_workspace);
begin
 if not evergreen_private.os_can(p_workspace,'chat.write') then raise exception 'Conversa não autorizada.' using errcode='42501';end if;
 if p_request is null or cardinality(p_people) not between 1 and 99 or length(trim(p_name)) not between 2 and 60 then raise exception 'Nome e participantes obrigatórios.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,0));select * into prior from public.eg_os_requests where user_id=auth.uid() and request_id=p_request;
 if found then if prior.operation<>'group-chat' or prior.payload<>data then raise exception 'Identificador reutilizado.';end if;return prior.result;end if;
 foreach u in array array_append(p_people,auth.uid()) loop if not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=u) then raise exception 'Todos os participantes devem pertencer a esta organização.' using errcode='42501';end if;end loop;
 insert into public.eg_channels(workspace_id,name,is_private) values(p_workspace,trim(p_name)||' · '||left(p_request::text,8),true) returning id into result;
 insert into public.eg_channel_members(channel_id,user_id) select result,x from (select distinct unnest(array_append(p_people,auth.uid())) x) q;
 insert into public.eg_os_requests values(auth.uid(),p_request,'group-chat',data,result);return result;
end $$;

-- Enforce technical write levels in privileged legacy procedures as well as RLS.
alter function evergreen_private.create_channel(uuid,text,boolean) rename to create_channel_before_os;
create function evergreen_private.create_channel(p_workspace uuid,p_name text,p_private boolean) returns uuid language plpgsql security definer set search_path='' as $$begin
 if not evergreen_private.os_can(p_workspace,'company.admin') then raise exception 'Criação de canais não autorizada.' using errcode='42501';end if;return evergreen_private.create_channel_before_os(p_workspace,p_name,p_private);end $$;
revoke all on function evergreen_private.create_channel_before_os(uuid,text,boolean),evergreen_private.create_channel(uuid,text,boolean) from public,anon,authenticated;
grant execute on function evergreen_private.create_channel(uuid,text,boolean) to authenticated;

do $$ declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('eg_os_context','eg_os_snapshot','eg_os_link','eg_os_group_chat') loop
execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to authenticated',f.signature);end loop;end $$;

create function public.eg_os_channels(p_workspace uuid) returns table(id uuid,name text) language sql stable security invoker set search_path='' as $$select c.id,c.name from public.eg_channels c where c.workspace_id=p_workspace and not c.archived and evergreen_private.can_read_channel(c.id) order by c.name$$;
revoke all on function public.eg_os_channels(uuid) from public,anon,authenticated;grant execute on function public.eg_os_channels(uuid) to authenticated;
