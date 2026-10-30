-- A shared channel gets an isolated workspace, never membership in either company's workspace.
create table public.eg_shared_channels(id uuid primary key,from_workspace uuid not null references public.eg_workspaces,to_workspace uuid not null references public.eg_workspaces,name text not null check(length(trim(name)) between 2 and 60),from_people uuid[] not null,to_people uuid[] not null default '{}',from_approver uuid not null references auth.users,to_approver uuid references auth.users,workspace_id uuid unique references public.eg_workspaces,channel_id uuid unique references public.eg_channels,state text not null default 'pending' check(state in ('pending','approved','active','rejected')),created_at timestamptz not null default now(),check(from_workspace<>to_workspace),check(cardinality(from_people) between 1 and 50),check(cardinality(to_people)<=50));
create index os_shared_channel_from on public.eg_shared_channels(from_workspace);
create index os_shared_channel_to on public.eg_shared_channels(to_workspace);
create function evergreen_private.os_room_person(r public.eg_shared_channels,u uuid) returns boolean language sql stable security definer set search_path='' as $$select (u=any(r.from_people) and exists(select 1 from public.eg_members where workspace_id=r.from_workspace and user_id=u)) or (u=any(r.to_people) and exists(select 1 from public.eg_members where workspace_id=r.to_workspace and user_id=u));$$;
create function public.eg_os_shared_channel(p_action text,p_id uuid,p_workspace uuid default null,p_data jsonb default '{}') returns uuid language plpgsql security definer set search_path='' as $$
declare r public.eg_shared_channels;participants uuid[];u uuid;room uuid;channel uuid;begin
 perform evergreen_private.require_recent();perform pg_advisory_xact_lock(hashtextextended('shared:'||p_id::text,0));
 select * into r from public.eg_shared_channels where id=p_id for update;
 if p_action='request' then
  if not evergreen_private.os_can(p_workspace,'company.admin') or exists(select 1 from public.eg_group_spaces where workspace_id=p_workspace) then raise exception 'Administração da empresa de origem necessária.' using errcode='42501';end if;
  participants:=array(select distinct jsonb_array_elements_text(p_data->'people')::uuid order by 1);
  if r.id is not null then if r.from_workspace<>p_workspace or r.from_approver<>auth.uid() or r.to_workspace<>(p_data->>'to_workspace')::uuid or r.name<>trim(p_data->>'name') or r.from_people<>participants then raise exception 'Identificador já usado com outros dados.';end if;return r.id;end if;
  if not(auth.uid()=any(participants)) or cardinality(participants) not between 1 and 50 then raise exception 'Escolha de 1 a 50 participantes, incluindo você.';end if;
  if not exists(select 1 from public.eg_company_details where workspace_id=(p_data->>'to_workspace')::uuid) or exists(select 1 from public.eg_group_spaces where workspace_id=(p_data->>'to_workspace')::uuid) or exists(select 1 from public.eg_groups where communication_workspace in(p_workspace,(p_data->>'to_workspace')::uuid)) or exists(select 1 from public.eg_shared_channels where workspace_id in(p_workspace,(p_data->>'to_workspace')::uuid)) then raise exception 'Empresa de destino indisponível.';end if;
  foreach u in array participants loop if not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=u) then raise exception 'Participante de origem não autorizado.' using errcode='42501';end if;end loop;
  insert into public.eg_shared_channels(id,from_workspace,to_workspace,name,from_people,from_approver) values(p_id,p_workspace,(p_data->>'to_workspace')::uuid,trim(p_data->>'name'),participants,auth.uid());
 elsif r.id is null then raise exception 'Pedido indisponível.' using errcode='42501';
 elsif p_action='approve' then
  if r.state not in ('pending','approved') or not evergreen_private.os_can(r.to_workspace,'company.admin') then raise exception 'Administração do destino necessária.' using errcode='42501';end if;
  participants:=array(select distinct jsonb_array_elements_text(p_data->'people')::uuid order by 1);if cardinality(participants) not between 1 and 50 then raise exception 'Escolha participantes do destino.';end if;
  foreach u in array participants loop if not exists(select 1 from public.eg_members where workspace_id=r.to_workspace and user_id=u) then raise exception 'Participante do destino não autorizado.' using errcode='42501';end if;end loop;
  if r.state='approved' and r.to_people<>participants then raise exception 'Participantes aprovados são imutáveis; rejeite e crie novo pedido.';end if;
  update public.eg_shared_channels set state='approved',to_people=participants,to_approver=auth.uid() where id=r.id;
 elsif p_action='reject' then
  if r.state='active' or not(evergreen_private.os_can(r.from_workspace,'company.admin') or evergreen_private.os_can(r.to_workspace,'company.admin')) then raise exception 'Pedido não pode ser rejeitado por esta conta.' using errcode='42501';end if;
  update public.eg_shared_channels set state='rejected' where id=r.id;
 elsif p_action='activate' then
  if r.from_approver<>auth.uid() or not evergreen_private.os_can(r.from_workspace,'company.admin') then raise exception 'O administrador que solicitou deve ativar a sala.' using errcode='42501';end if;
  if r.state='active' then return r.workspace_id;end if;
  if r.state<>'approved' or not exists(select 1 from public.eg_members m left join public.eg_organization_assignments a on a.workspace_id=m.workspace_id and a.user_id=m.user_id left join public.eg_organization_levels l on l.workspace_id=a.workspace_id and l.code=a.level_code where m.workspace_id=r.to_workspace and m.user_id=r.to_approver and m.role in('owner','admin') and (l.code is null or 'company.admin'=any(l.permissions))) then raise exception 'Aprovação atual do destino necessária.' using errcode='42501';end if;
  foreach u in array r.from_people||r.to_people loop if not evergreen_private.os_room_person(r,u) then raise exception 'Um participante perdeu acesso à sua empresa. Registre novo pedido.';end if;end loop;
  room:=evergreen_private.create_workspace('Compartilhado · '||left(r.name,45));
  select id into channel from public.eg_channels where workspace_id=room limit 1;
  update public.eg_channels set name=r.name,is_private=true where id=channel;
  update public.eg_shared_channels set state='active',workspace_id=room,channel_id=channel where id=r.id;
  insert into public.eg_members(workspace_id,user_id,role,display_name) select room,x,case when x=auth.uid() then 'owner' else 'member' end,p.display_name from(select distinct unnest(r.from_people||r.to_people)x)q join public.eg_profiles p on p.id=x on conflict do nothing;
  insert into public.eg_channel_members select channel,x from(select distinct unnest(r.from_people||r.to_people)x)q on conflict do nothing;
 else raise exception 'Ação de canal inválida.';end if;
 insert into public.eg_os_audit(workspace_id,action,details) values(coalesce(r.from_workspace,p_workspace),'shared_channel.'||p_action,jsonb_build_object('id',p_id));return coalesce(room,p_id);
end $$;
create function public.eg_os_shared_channels(p_workspace uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not evergreen_private.live_session() then raise exception 'Sessão necessária.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'state',r.state,'from_workspace',r.from_workspace,'to_workspace',r.to_workspace,'from_approver',r.from_approver,'from_people',r.from_people,'to_people',r.to_people,'workspace_id',r.workspace_id,'channel_id',r.channel_id,'can_open',r.state='active' and evergreen_private.os_room_person(r,auth.uid()))) from public.eg_shared_channels r where (p_workspace is null and r.state='active' and evergreen_private.os_room_person(r,auth.uid())) or (p_workspace in(r.from_workspace,r.to_workspace) and evergreen_private.os_can(p_workspace,'company.admin'))),'[]'::jsonb);
end $$;
-- Membership cannot widen beyond the two approved participant lists, even through legacy RPCs.
create function evergreen_private.os_shared_member_guard() returns trigger language plpgsql security definer set search_path='' as $$declare r public.eg_shared_channels;begin
 select * into r from public.eg_shared_channels where workspace_id=new.workspace_id;
 if r.id is not null and not evergreen_private.os_room_person(r,new.user_id) then raise exception 'Só participantes aprovados podem entrar nesta sala.' using errcode='42501';end if;return new;
end $$;
create trigger os_shared_member_guard before insert or update on public.eg_members for each row execute function evergreen_private.os_shared_member_guard();
create function evergreen_private.os_shared_member_revoked() returns trigger language plpgsql security definer set search_path='' as $$declare r public.eg_shared_channels;begin
 for r in select * from public.eg_shared_channels where state='active' and old.workspace_id in(from_workspace,to_workspace) and (old.user_id=any(from_people||to_people)) loop
  if not evergreen_private.os_room_person(r,old.user_id) then delete from public.eg_channel_members where channel_id=r.channel_id and user_id=old.user_id;delete from public.eg_members where workspace_id=r.workspace_id and user_id=old.user_id;end if;
 end loop;return old;
end $$;
create trigger os_shared_member_revoked after delete on public.eg_members for each row execute function evergreen_private.os_shared_member_revoked();
alter table public.eg_shared_channels enable row level security;revoke all on public.eg_shared_channels from public,anon,authenticated;
revoke all on function evergreen_private.os_room_person(public.eg_shared_channels,uuid),evergreen_private.os_shared_member_guard(),evergreen_private.os_shared_member_revoked(),public.eg_os_shared_channel(text,uuid,uuid,jsonb),public.eg_os_shared_channels(uuid) from public,anon,authenticated;
grant execute on function public.eg_os_shared_channel(text,uuid,uuid,jsonb),public.eg_os_shared_channels(uuid) to authenticated;

-- Shared-room write permissions cannot exceed a participant's current company level.
create or replace function evergreen_private.os_can(w uuid,permission text) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.member_of(w) and coalesce((select permission=any(l.permissions) from public.eg_organization_assignments a join public.eg_organization_levels l on l.workspace_id=a.workspace_id and l.code=a.level_code where a.workspace_id=w and a.user_id=auth.uid()),
 case when permission in ('company.admin','members.manage','governance') then evergreen_private.admin_of(w) when permission like 'finance.%' then exists(select 1 from public.eg_fin_companies c where c.workspace_id=w and evergreen_private.finance_role(c.id,case when permission='finance.read' then array['admin','editor','viewer'] else array['admin','editor'] end)) else true end)
 and coalesce((select (auth.uid()=any(r.from_people) and evergreen_private.os_can(r.from_workspace,permission)) or (auth.uid()=any(r.to_people) and evergreen_private.os_can(r.to_workspace,permission)) from public.eg_shared_channels r where r.workspace_id=w),true);
$$;
