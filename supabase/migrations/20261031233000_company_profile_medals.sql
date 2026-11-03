begin;
alter table public.eg_professional_roles add column first_founder boolean not null default false;
alter table public.eg_professional_roles add constraint eg_first_founder_relationship check(not first_founder or relationship='founder');
create unique index eg_first_founder_per_company on public.eg_professional_roles(workspace_id) where first_founder;

create function evergreen_private.profile_relationship_v3(p_workspace uuid,p_user uuid,p_relationship text,p_first_partner boolean,p_first_founder boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not evergreen_private.admin_of(p_workspace) then raise exception 'Apenas administradores desta empresa podem definir vínculos.' using errcode='42501'; end if;
 if p_relationship is null or p_relationship not in ('founder','partner','ceo','leader','member') then raise exception 'Atuação profissional inválida.' using errcode='22023'; end if;
 if coalesce(p_first_partner,false) and p_relationship<>'partner' or coalesce(p_first_founder,false) and p_relationship<>'founder' then raise exception 'A medalha deve corresponder ao vínculo profissional.' using errcode='22023'; end if;
 if not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=p_user) then raise exception 'A pessoa precisa ser membro desta empresa.' using errcode='42501'; end if;
 -- Serialize designations within this company, including concurrent administrators.
 perform 1 from public.eg_workspaces where id=p_workspace for update;
 if p_first_partner then update public.eg_professional_roles set first_partner=false,updated_by=auth.uid(),updated_at=now() where workspace_id=p_workspace and user_id<>p_user and first_partner; end if;
 if p_first_founder then update public.eg_professional_roles set first_founder=false,updated_by=auth.uid(),updated_at=now() where workspace_id=p_workspace and user_id<>p_user and first_founder; end if;
 insert into public.eg_professional_roles(workspace_id,user_id,relationship,updated_by,first_partner,first_founder)
 values(p_workspace,p_user,p_relationship,auth.uid(),coalesce(p_first_partner,false),coalesce(p_first_founder,false))
 on conflict(workspace_id,user_id) do update set relationship=excluded.relationship,updated_by=auth.uid(),updated_at=now(),first_partner=excluded.first_partner,first_founder=excluded.first_founder;
end $$;
create function public.eg_profile_relationship_medals(p_workspace uuid,p_user uuid,p_relationship text,p_first_partner boolean,p_first_founder boolean)
returns void language sql security invoker set search_path='' as $$
 select evergreen_private.profile_relationship_v3(p_workspace,p_user,p_relationship,p_first_partner,p_first_founder);
$$;
create or replace function public.eg_profile_relationship_v2(p_workspace uuid,p_user uuid,p_relationship text,p_first_partner boolean)
returns void language sql security invoker set search_path='' as $$
 select evergreen_private.profile_relationship_v3(p_workspace,p_user,p_relationship,p_first_partner,false);
$$;
create function evergreen_private.profile_honors_v3(p_workspace uuid,p_user uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare profile jsonb;
begin
 profile:=evergreen_private.professional_profile(p_workspace,p_user);
 return jsonb_build_object(
  'first_partner',coalesce((select first_partner from public.eg_professional_roles where workspace_id=p_workspace and user_id=p_user),false),
  'first_founder',coalesce((select first_founder from public.eg_professional_roles where workspace_id=p_workspace and user_id=p_user),false),
  'companies',coalesce((select jsonb_agg(jsonb_build_object('id',r.workspace_id,'first_partner',r.first_partner,'first_founder',r.first_founder))
   from public.eg_professional_roles r where r.user_id=p_user and exists(select 1 from jsonb_array_elements(profile->'companies') c where (c->>'id')::uuid=r.workspace_id)),'[]'::jsonb));
end $$;
create or replace function public.eg_profile_honors(p_workspace uuid,p_user uuid)
returns jsonb language sql stable security invoker set search_path='' as $$select evergreen_private.profile_honors_v3(p_workspace,p_user);$$;
revoke all on function evergreen_private.profile_relationship_v3(uuid,uuid,text,boolean,boolean),evergreen_private.profile_honors_v3(uuid,uuid),public.eg_profile_relationship_medals(uuid,uuid,text,boolean,boolean) from public,anon,authenticated;
grant execute on function evergreen_private.profile_relationship_v3(uuid,uuid,text,boolean,boolean),evergreen_private.profile_honors_v3(uuid,uuid),public.eg_profile_relationship_medals(uuid,uuid,text,boolean,boolean) to authenticated;
commit;
