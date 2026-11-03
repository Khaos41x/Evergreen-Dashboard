begin;

-- Only these existing companies are offered. No automatic company/user creation.
create table evergreen_private.onboarding_companies(
 workspace_id uuid primary key references public.eg_workspaces on delete cascade
);
alter table evergreen_private.onboarding_companies enable row level security;
revoke all on evergreen_private.onboarding_companies from public,anon,authenticated;
insert into evergreen_private.onboarding_companies(workspace_id)
 select w.id from public.eg_workspaces w where lower(trim(w.name)) in ('orkto','thinkerchess')
 and (select count(*) from public.eg_workspaces other where lower(trim(other.name))=lower(trim(w.name)))=1;

create table evergreen_private.company_onboarding_requests(
 workspace_id uuid not null references public.eg_workspaces on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 relationship text not null check(relationship in ('founder','partner')),
 state text not null default 'pending' check(state in ('pending','approved','declined','withdrawn')),
 revision integer not null default 1 check(revision>0),
 reviewed_by uuid references auth.users,
 updated_at timestamptz not null default now(),
 primary key(workspace_id,user_id)
);
alter table evergreen_private.company_onboarding_requests enable row level security;
revoke all on evergreen_private.company_onboarding_requests from public,anon,authenticated;

create function evergreen_private.onboarding_identity() returns void language plpgsql stable security definer set search_path='' as $$
begin
 if not evergreen_private.live_session() or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then
  raise exception 'Confirme seu e-mail e entre para informar suas empresas.' using errcode='42501';
 end if;
end $$;
revoke all on function evergreen_private.onboarding_identity() from public,anon,authenticated;

create function public.eg_company_onboarding() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform evergreen_private.onboarding_identity();
 return jsonb_build_object('companies',coalesce((
 select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'relationship',pr.relationship,
 'selected_relationship',r.relationship,'request_state',r.state,'revision',r.revision,
 'member',m.user_id is not null and m.suspended_at is null,'suspended',m.suspended_at is not null) order by w.name)
 from evergreen_private.onboarding_companies c join public.eg_workspaces w on w.id=c.workspace_id
 left join public.eg_members m on m.workspace_id=w.id and m.user_id=auth.uid()
 left join public.eg_professional_roles pr on pr.workspace_id=w.id and pr.user_id=auth.uid()
 left join evergreen_private.company_onboarding_requests r on r.workspace_id=w.id and r.user_id=auth.uid()),'[]'::jsonb));
end $$;

create function public.eg_company_onboarding_submit(p_companies jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; w uuid; selected uuid[]:='{}'; relation text;
begin
 perform evergreen_private.onboarding_identity();
 if jsonb_typeof(p_companies) is distinct from 'array' or jsonb_array_length(p_companies) not between 1 and 2 or length(p_companies::text)>1500 then raise exception 'Selecione uma ou duas empresas.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('onboarding:'||auth.uid()::text,0));
 for item in select * from jsonb_array_elements(p_companies) loop
  if jsonb_typeof(item) is distinct from 'object' or coalesce(item->>'workspace_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Empresa inválida.' using errcode='22023';end if;
  w:=(item->>'workspace_id')::uuid;relation:=item->>'relationship';
  if relation is null or relation not in ('founder','partner') or w=any(selected) then raise exception 'Informe uma atuação por empresa.' using errcode='22023';end if;
  if not exists(select 1 from evergreen_private.onboarding_companies where workspace_id=w) or exists(select 1 from public.eg_members where workspace_id=w and user_id=auth.uid() and suspended_at is not null) then raise exception 'Empresa indisponível para sua conta.' using errcode='42501';end if;
  selected:=array_append(selected,w);
  insert into evergreen_private.company_onboarding_requests(workspace_id,user_id,relationship) values(w,auth.uid(),relation)
  on conflict(workspace_id,user_id) do update set relationship=excluded.relationship,state='pending',reviewed_by=null,revision=company_onboarding_requests.revision+1,updated_at=now()
   where company_onboarding_requests.relationship is distinct from excluded.relationship or company_onboarding_requests.state in ('declined','withdrawn');
 end loop;
 update evergreen_private.company_onboarding_requests set state='withdrawn',revision=revision+1,updated_at=now()
 where user_id=auth.uid() and state='pending' and not(workspace_id=any(selected));
 return public.eg_company_onboarding();
end $$;

create function public.eg_company_onboarding_pending(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform evergreen_private.onboarding_identity();
 if not evergreen_private.os_can(p_workspace,'members.manage') then raise exception 'Apenas a administração da empresa confirma vínculos.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',r.user_id,'name',p.display_name,'email',u.email,'relationship',r.relationship,'revision',r.revision,'updated_at',r.updated_at) order by r.updated_at)
 from evergreen_private.company_onboarding_requests r join public.eg_profiles p on p.id=r.user_id join auth.users u on u.id=r.user_id
 where r.workspace_id=p_workspace and r.state='pending'),'[]'::jsonb);
end $$;

create function public.eg_company_onboarding_review(p_workspace uuid,p_user uuid,p_revision integer,p_accept boolean) returns text language plpgsql security definer set search_path='' as $$
declare r evergreen_private.company_onboarding_requests; was_member boolean;
begin
 perform evergreen_private.onboarding_identity();
 if not evergreen_private.os_can(p_workspace,'members.manage') then raise exception 'Apenas a administração da empresa confirma vínculos.' using errcode='42501';end if;
 perform evergreen_private.require_recent();
 if p_accept is null then raise exception 'Escolha confirmar ou recusar.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('onboarding:'||p_user::text,0));
 select * into r from evergreen_private.company_onboarding_requests where workspace_id=p_workspace and user_id=p_user for update;
 if r.user_id is null or p_revision is distinct from r.revision then raise exception 'A solicitação mudou. Atualize antes de confirmar.' using errcode='22023';end if;
 if (r.state='approved' and p_accept) or (r.state='declined' and not p_accept) then return r.state;end if;
 if r.state<>'pending' then raise exception 'Solicitação encerrada.' using errcode='22023';end if;
 if p_accept then
  if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) or not exists(select 1 from public.eg_profiles where id=p_user) or exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=p_user and suspended_at is not null) then raise exception 'Conta indisponível para acesso.' using errcode='42501';end if;
  was_member:=exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=p_user);
  insert into public.eg_members(workspace_id,user_id,role,display_name) select p_workspace,p_user,'member',display_name from public.eg_profiles where id=p_user on conflict do nothing;
  if not was_member then
   perform evergreen_private.os_seed_levels(p_workspace);
   insert into public.eg_organization_assignments(workspace_id,user_id,level_code,assigned_by) values(p_workspace,p_user,'A5',auth.uid()) on conflict do nothing;
  end if;
  insert into public.eg_professional_roles(workspace_id,user_id,relationship,updated_by) values(p_workspace,p_user,r.relationship,auth.uid())
   on conflict(workspace_id,user_id) do update set relationship=excluded.relationship,updated_by=auth.uid(),updated_at=now(),
    first_partner=case when eg_professional_roles.relationship=excluded.relationship then eg_professional_roles.first_partner else false end,
    first_founder=case when eg_professional_roles.relationship=excluded.relationship then eg_professional_roles.first_founder else false end;
  insert into public.eg_channel_members(channel_id,user_id) select id,p_user from public.eg_channels where workspace_id=p_workspace and name='geral' and not is_private on conflict do nothing;
 end if;
 update evergreen_private.company_onboarding_requests set state=case when p_accept then 'approved' else 'declined' end,reviewed_by=auth.uid(),updated_at=now() where workspace_id=p_workspace and user_id=p_user;
 return case when p_accept then 'approved' else 'declined' end;
end $$;

revoke all on function public.eg_company_onboarding(),public.eg_company_onboarding_submit(jsonb),public.eg_company_onboarding_pending(uuid),public.eg_company_onboarding_review(uuid,uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.eg_company_onboarding(),public.eg_company_onboarding_submit(jsonb),public.eg_company_onboarding_pending(uuid),public.eg_company_onboarding_review(uuid,uuid,integer,boolean) to authenticated;
commit;
