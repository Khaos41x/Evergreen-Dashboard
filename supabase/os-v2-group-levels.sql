-- Group technical levels are separate from legal titles, equity and company scopes.
create table public.eg_group_levels(group_id uuid not null references public.eg_groups,code text not null check(code ~ '^E[0-6]$'),name text not null check(length(trim(name)) between 1 and 40),primary key(group_id,code));
create function evergreen_private.os_seed_group_levels(g uuid) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;begin
 insert into public.eg_group_levels select g,'E'||i, (array['CHAIRMAN','PRINCIPAL','EXECUTIVE','DIRECTOR','MANAGER','MEMBER','GUEST'])[i+1] from generate_series(0,6)i on conflict do nothing;
 select workspace_id into w from public.eg_group_spaces where group_id=g;perform evergreen_private.os_seed_levels(w);
end $$;
do $$declare g uuid;begin for g in select group_id from public.eg_group_spaces loop perform evergreen_private.os_seed_group_levels(g);end loop;end $$;
create function evergreen_private.os_group_setup() returns trigger language plpgsql security definer set search_path='' as $$begin perform evergreen_private.os_seed_group_levels(new.group_id);return new;end $$;
create trigger os_group_setup after insert on public.eg_group_spaces for each row execute function evergreen_private.os_group_setup();
create function evergreen_private.os_group_level_apply(g uuid,u uuid,code text) returns void language plpgsql security definer set search_path='' as $$
declare w uuid;begin
 if code is null or code !~ '^E[1-6]$' or not exists(select 1 from public.eg_group_members where group_id=g and user_id=u) or exists(select 1 from public.eg_founder_seats s join public.eg_councils c on c.id=s.council_id where c.group_id=g and s.user_id=u) then raise exception 'Nível E0 é exclusivo dos três assentos; escolha E1 a E6 para um membro confirmado.';end if;
 select workspace_id into w from public.eg_group_spaces where group_id=g;perform evergreen_private.os_seed_group_levels(g);
 insert into public.eg_organization_assignments values(w,u,'A'||right(code,1),auth.uid(),now()) on conflict(workspace_id,user_id) do update set level_code=excluded.level_code,assigned_by=auth.uid(),updated_at=now();
 update public.eg_members set role=case code when 'E1' then 'admin' else 'member' end where workspace_id=w and user_id=u;
end $$;
create function public.eg_os_group_level(p_group uuid,p_code text,p_user uuid default null,p_name text default null) returns void language plpgsql security definer set search_path='' as $$begin
 perform evergreen_private.require_recent();if not evergreen_private.os_group_admin(p_group) then raise exception 'Administração do grupo necessária.' using errcode='42501';end if;
 if exists(select 1 from public.eg_councils where group_id=p_group and activated_at is not null) then raise exception 'COUNCIL_REQUIRED: altere níveis do grupo por deliberação.' using errcode='42501';end if;
 if p_user is not null then perform evergreen_private.os_group_level_apply(p_group,p_user,p_code);else update public.eg_group_levels set name=trim(p_name) where group_id=p_group and code=p_code;if not found then raise exception 'Nível inválido.';end if;end if;
 insert into public.eg_os_audit(group_id,action,details)values(p_group,'group.level',jsonb_build_object('user',p_user,'code',p_code,'name',p_name));
end $$;
-- Group conversations accept ordinary invited members without conferring strategic access.
create function evergreen_private.os_general_member_added() returns trigger language plpgsql security definer set search_path='' as $$
declare g uuid;begin
 select group_id into g from public.eg_group_spaces where workspace_id=new.workspace_id;
 if g is not null and not exists(select 1 from public.eg_group_members where group_id=g and user_id=new.user_id) then insert into public.eg_group_members values(g,new.user_id,'group_executive',array[]::text[]);end if;
 return new;
end $$;
create trigger os_general_member_added after insert on public.eg_members for each row execute function evergreen_private.os_general_member_added();
alter table public.eg_group_levels enable row level security;
revoke all on public.eg_group_levels from public,anon,authenticated;grant select on public.eg_group_levels to authenticated;
create policy os_group_levels_read on public.eg_group_levels for select to authenticated using(evergreen_private.os_group_member(group_id));
revoke all on function evergreen_private.os_seed_group_levels(uuid),evergreen_private.os_group_setup(),evergreen_private.os_group_level_apply(uuid,uuid,text),evergreen_private.os_general_member_added(),public.eg_os_group_level(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.eg_os_group_level(uuid,text,uuid,text) to authenticated;
-- General-group membership and technical levels must not bypass Council through company APIs.
create function evergreen_private.os_company_level_guard(p_workspace uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from public.eg_group_spaces where workspace_id=p_workspace) then raise exception 'COUNCIL_REQUIRED: gerencie níveis e remoções do grupo pelo Conselho Evergreen.' using errcode='42501';end if;
end $$;
do $$declare f record;definition text;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in('eg_os_assign_level','eg_os_level_name','eg_os_level_permissions','eg_os_company_update')) or(n.nspname='evergreen_private' and p.proname='manage_member') loop
  definition:=regexp_replace(pg_get_functiondef(f.oid),'(?i)(begin[[:space:]])','\1 perform evergreen_private.os_company_level_guard(p_workspace); ');
  execute definition;
 end loop;
end $$;
revoke all on function evergreen_private.os_company_level_guard(uuid) from public,anon,authenticated;
