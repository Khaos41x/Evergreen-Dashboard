-- Professional identity is descriptive. It NEVER grants workspace or financial privileges.
begin;
create table public.eg_professional_roles(
 workspace_id uuid not null references public.eg_workspaces on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 relationship text not null check(relationship in ('founder','partner','ceo','leader','member')),
 updated_by uuid not null references auth.users,
 updated_at timestamptz not null default now(),
 primary key(workspace_id,user_id),
 foreign key(workspace_id,user_id) references public.eg_members(workspace_id,user_id) on delete cascade
);
create index eg_professional_roles_user on public.eg_professional_roles(user_id,workspace_id);
create table public.eg_original_founders(
 group_id uuid not null references public.eg_groups on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 declared_by uuid not null references auth.users,
 declared_at timestamptz not null default now(),
 primary key(group_id,user_id),
 foreign key(group_id,user_id) references public.eg_group_members(group_id,user_id) on delete cascade
);
create index eg_original_founders_user on public.eg_original_founders(user_id,group_id);
alter table public.eg_professional_roles enable row level security;
alter table public.eg_original_founders enable row level security;
revoke all on public.eg_professional_roles,public.eg_original_founders from public,anon,authenticated;
grant select on public.eg_professional_roles,public.eg_original_founders to authenticated;
create policy professional_roles_read on public.eg_professional_roles for select to authenticated using(evergreen_private.member_of(workspace_id));
create policy original_founders_read on public.eg_original_founders for select to authenticated using(
 evergreen_private.live_session() and (evergreen_private.founder_can(group_id,'people') or exists(
 select 1 from public.eg_group_companies c where c.group_id=eg_original_founders.group_id and evergreen_private.member_of(c.workspace_id))));

-- Narrow projection avoids exposing private names, preferences, or email addresses.
-- Definer is needed because the existing profiles table is self-only.
create function public.eg_professional_profile(p_workspace uuid,p_user uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not evergreen_private.member_of(p_workspace) or not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=p_user) then
 raise exception 'Perfil não disponível nesta empresa.' using errcode='42501'; end if;
 select jsonb_build_object('id',p.id,'display_name',p.display_name,'job_title',p.job_title,'bio',p.bio,'username',p.username,'custom_status',p.custom_status,
 'companies',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'relationship',r.relationship) order by w.name)
 from public.eg_members m join public.eg_workspaces w on w.id=m.workspace_id left join public.eg_professional_roles r on r.workspace_id=w.id and r.user_id=p.id
 where m.user_id=p.id and evergreen_private.member_of(w.id) and not exists(select 1 from public.eg_groups g where g.communication_workspace=w.id)),'[]'::jsonb),
 'original_founders',coalesce((select jsonb_agg(jsonb_build_object('name',g.name) order by g.name) from public.eg_original_founders f join public.eg_groups g on g.id=f.group_id
 where f.user_id=p.id and (evergreen_private.founder_can(g.id,'people') or exists(select 1 from public.eg_group_companies c where c.group_id=g.id and evergreen_private.member_of(c.workspace_id)))),'[]'::jsonb)) into result
 from public.eg_profiles p where p.id=p_user;
 if result is null then raise exception 'Perfil ainda não disponível.' using errcode='P0002'; end if;
 return result;
end $$;
create function public.eg_profile_relationship(p_workspace uuid,p_user uuid,p_relationship text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not evergreen_private.admin_of(p_workspace) then raise exception 'Apenas administradores desta empresa podem definir vínculos.' using errcode='42501';end if;
 if not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=p_user) then raise exception 'A pessoa precisa ser membro desta empresa.' using errcode='42501';end if;
 insert into public.eg_professional_roles(workspace_id,user_id,relationship,updated_by) values(p_workspace,p_user,p_relationship,auth.uid())
 on conflict(workspace_id,user_id) do update set relationship=excluded.relationship,updated_by=auth.uid(),updated_at=now();
end $$;
-- Founders of the holding are explicitly attested by its owner, never inferred from a job title.
create function public.eg_profile_original_founder(p_group uuid,p_user uuid,p_original boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not evergreen_private.group_owner(p_group) then raise exception 'Apenas o responsável pela holding pode confirmar fundadores originais.' using errcode='42501';end if;
 perform evergreen_private.require_recent();
 if not exists(select 1 from public.eg_group_members where group_id=p_group and user_id=p_user and role in ('group_owner','founder')) then raise exception 'Confirme primeiro a participação da pessoa nos fundadores.' using errcode='42501';end if;
 if p_original then insert into public.eg_original_founders(group_id,user_id,declared_by) values(p_group,p_user,auth.uid()) on conflict do nothing;
 else delete from public.eg_original_founders where group_id=p_group and user_id=p_user;end if;
 insert into public.eg_group_audit(group_id,action,details) values(p_group,'original_founder',jsonb_build_object('user_id',p_user,'original',p_original));
end $$;
revoke all on function public.eg_professional_profile(uuid,uuid),public.eg_profile_relationship(uuid,uuid,text),public.eg_profile_original_founder(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.eg_professional_profile(uuid,uuid),public.eg_profile_relationship(uuid,uuid,text),public.eg_profile_original_founder(uuid,uuid,boolean) to authenticated;
-- Nominees are a controlled roster, never authentication identities or automatic grants.
create table public.eg_founder_nominees(id uuid primary key default gen_random_uuid(),group_id uuid not null references public.eg_groups on delete cascade,display_name text not null check(length(trim(display_name)) between 1 and 80),declared_by uuid not null references auth.users,created_at timestamptz not null default now(),unique(group_id,display_name));
alter table public.eg_founder_nominees enable row level security;
revoke all on public.eg_founder_nominees from public,anon,authenticated;
grant select on public.eg_founder_nominees to authenticated;
create policy nominee_owner_read on public.eg_founder_nominees for select to authenticated using(evergreen_private.group_owner(group_id));
create function public.eg_professional_levels(p_group uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not evergreen_private.group_owner(p_group) then raise exception 'Apenas o responsável gerencia níveis.' using errcode='42501';end if;
 return jsonb_build_object('members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.display_name,'role',m.role,'original',f.user_id is not null) order by p.display_name) from public.eg_group_members m join public.eg_profiles p on p.id=m.user_id left join public.eg_original_founders f on f.group_id=m.group_id and f.user_id=m.user_id where m.group_id=p_group),'[]'::jsonb),
 'pending',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',display_name) order by created_at) from public.eg_founder_nominees where group_id=p_group),'[]'::jsonb));
end $$;
create function public.eg_founder_nominee(p_group uuid,p_name text,p_user uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not evergreen_private.group_owner(p_group) then raise exception 'Apenas o responsável indica fundadores.' using errcode='42501';end if;
 perform evergreen_private.require_recent();
 if p_user is null then
 insert into public.eg_founder_nominees(group_id,display_name,declared_by) values(p_group,trim(p_name),auth.uid()) on conflict(group_id,display_name) do nothing;
 else
 if not exists(select 1 from public.eg_original_founders where group_id=p_group and user_id=p_user) then raise exception 'Confirme a conta como fundador original primeiro.' using errcode='42501';end if;
 delete from public.eg_founder_nominees where group_id=p_group and display_name=trim(p_name);
 end if;
 insert into public.eg_group_audit(group_id,action,details) values(p_group,'founder_nominee',jsonb_build_object('name',trim(p_name),'user_id',p_user));
end $$;
revoke all on function public.eg_professional_levels(uuid),public.eg_founder_nominee(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.eg_professional_levels(uuid),public.eg_founder_nominee(uuid,text,uuid) to authenticated;
commit;
