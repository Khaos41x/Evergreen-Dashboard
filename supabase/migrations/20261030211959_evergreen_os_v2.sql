-- Evergreen Platform != Evergreen Group != independent company workspaces.
begin;
alter table public.eg_company_details add column slug text;
alter table public.eg_company_details add column onboarding_config jsonb not null default '{}' check(length(onboarding_config::text)<=12000);
alter table public.eg_company_details add column sector text not null default '' check(length(sector)<=100);
alter table public.eg_company_details add column organization_type text not null default 'company' check(organization_type in ('company','project','association'));
alter table public.eg_company_details add column legal_state text not null default 'forming' check(legal_state in ('forming','registered','internal'));
alter table public.eg_company_details add column visibility text not null default 'private' check(visibility in ('private','directory'));
create unique index eg_company_slug on public.eg_company_details(lower(slug)) where slug is not null;
alter table public.eg_company_details add constraint eg_company_slug_format check(slug is null or slug ~ '^[a-z0-9][a-z0-9-]{2,62}$');

create table public.eg_os_audit(id uuid primary key default gen_random_uuid(),workspace_id uuid references public.eg_workspaces,group_id uuid references public.eg_groups,actor_id uuid not null default auth.uid() references auth.users,action text not null,details jsonb not null,created_at timestamptz not null default now());
create index eg_os_audit_workspace on public.eg_os_audit(workspace_id,created_at desc);
create index eg_os_audit_group on public.eg_os_audit(group_id,created_at desc);
create table public.eg_os_requests(user_id uuid not null references auth.users,request_id uuid not null,operation text not null,payload jsonb not null,result uuid not null,primary key(user_id,request_id));
create table public.eg_organization_levels(workspace_id uuid not null references public.eg_workspaces on delete cascade,code text not null check(code in ('A0','A1','A2','A3','A4','A5','A6')),name text not null check(length(trim(name)) between 1 and 40),permissions text[] not null check(permissions<@array['work.read','work.write','chat.write','files.write','members.manage','company.admin','finance.read','finance.write','finance.approve','governance']),primary key(workspace_id,code));
create table public.eg_organization_assignments(workspace_id uuid not null,user_id uuid not null,level_code text not null,assigned_by uuid not null references auth.users,updated_at timestamptz not null default now(),primary key(workspace_id,user_id),foreign key(workspace_id,user_id) references public.eg_members on delete cascade,foreign key(workspace_id,level_code) references public.eg_organization_levels(workspace_id,code));
create index eg_organization_assignments_user on public.eg_organization_assignments(user_id,workspace_id);
create table public.eg_group_spaces(group_id uuid primary key references public.eg_groups on delete cascade,workspace_id uuid not null unique references public.eg_workspaces);
create table public.eg_organization_links(id uuid primary key default gen_random_uuid(),group_id uuid not null references public.eg_groups,workspace_id uuid not null references public.eg_workspaces,kind text not null check(kind in ('GROUP_COMPANY','PARTNER')),state text not null default 'PENDING' check(state in ('PENDING','APPROVED','REJECTED','REVOKED')),scopes text[] not null check(scopes<@array['companies','people','projects','finance','intelligence','documents','decisions','overview']),requested_by uuid not null default auth.uid() references auth.users,company_approved_by uuid references auth.users,group_approved_by uuid references auth.users,version integer not null default 1,created_at timestamptz not null default now(),unique(group_id,workspace_id));
create index eg_organization_links_workspace on public.eg_organization_links(workspace_id,state);

create function evergreen_private.os_seed_levels(w uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.eg_organization_levels values
 (w,'A0','APEX',array['work.read','work.write','chat.write','files.write','members.manage','company.admin','finance.read','finance.write','finance.approve','governance']),
 (w,'A1','PRINCIPAL',array['work.read','work.write','chat.write','files.write','members.manage','company.admin','governance']),
 (w,'A2','EXECUTIVE',array['work.read','work.write','chat.write','files.write','governance']),
 (w,'A3','DIRECTOR',array['work.read','work.write','chat.write','files.write']),
 (w,'A4','MANAGER',array['work.read','work.write','chat.write','files.write']),
 (w,'A5','MEMBER',array['work.read','work.write','chat.write','files.write']),
 (w,'A6','GUEST',array['work.read']) on conflict do nothing;
end $$;
create function evergreen_private.os_can(w uuid,permission text) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.member_of(w) and coalesce((select permission=any(l.permissions) from public.eg_organization_assignments a join public.eg_organization_levels l on l.workspace_id=a.workspace_id and l.code=a.level_code where a.workspace_id=w and a.user_id=auth.uid()),
 case when permission in ('company.admin','members.manage','governance') then evergreen_private.admin_of(w) when permission like 'finance.%' then exists(select 1 from public.eg_fin_companies c where c.workspace_id=w and evergreen_private.finance_role(c.id,case when permission='finance.read' then array['admin','editor','viewer'] else array['admin','editor'] end)) else true end);
$$;
create function public.eg_os_company_create(p_request uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare prior public.eg_os_requests;w uuid;c uuid;nm text;slug text;invite_email text;
begin
 if not evergreen_private.live_session() or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Confirme seu e-mail antes de criar uma organização.' using errcode='42501';end if;
 if p_request is null or jsonb_typeof(p_data)<>'object' or length(p_data::text)>16000 then raise exception 'Dados inválidos.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,0));
 select * into prior from public.eg_os_requests where user_id=auth.uid() and request_id=p_request;
 if found then if prior.operation<>'company.create' or prior.payload<>p_data then raise exception 'Identificador já usado com outra configuração.';end if;return prior.result;end if;
 nm:=trim(p_data->>'name');slug:=lower(trim(p_data->>'slug'));
 if length(nm) not between 2 and 80 or slug is null or slug !~ '^[a-z0-9][a-z0-9-]{2,62}$' then raise exception 'Nome e identificador da organização são obrigatórios.';end if;
 w:=evergreen_private.create_workspace(nm);
 insert into public.eg_company_details(workspace_id,slug,description,sector,organization_type,legal_state,visibility,responsible_id) values(w,slug,coalesce(p_data->>'description',''),coalesce(p_data->>'sector',''),coalesce(p_data->>'type','company'),coalesce(p_data->>'legal_state','forming'),coalesce(p_data->>'visibility','private'),auth.uid());
 perform evergreen_private.os_seed_levels(w);
 insert into public.eg_organization_assignments values(w,auth.uid(),'A0',auth.uid(),now());
 insert into public.eg_professional_roles(workspace_id,user_id,relationship,updated_by) values(w,auth.uid(),'founder',auth.uid());
 update public.eg_company_details set onboarding_config=jsonb_build_object('governance',coalesce(p_data->>'governance','single')) where workspace_id=w;
 if p_data?'invitations' then
 if jsonb_typeof(p_data->'invitations')<>'array' or jsonb_array_length(p_data->'invitations')>20 then raise exception 'Até vinte convites são permitidos.';end if;
 for invite_email in select distinct lower(trim(value)) from jsonb_array_elements_text(p_data->'invitations') loop
 if invite_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or length(invite_email)>254 then raise exception 'E-mail de convite inválido.';end if;
 insert into public.eg_invites(workspace_id,email) values(w,invite_email);
 end loop;
 end if;
 insert into public.eg_os_requests values(auth.uid(),p_request,'company.create',p_data,w);
 insert into public.eg_os_audit(workspace_id,action,details) values(w,'company.created',jsonb_build_object('slug',slug,'link','EXTERNAL','legal_state',coalesce(p_data->>'legal_state','forming')));
 return w;
end $$;
create function public.eg_os_company_update(p_workspace uuid,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not evergreen_private.os_can(p_workspace,'company.admin') then raise exception 'Administração desta organização necessária.' using errcode='42501';end if;
 perform evergreen_private.require_recent();
 if length(p_data::text)>16000 then raise exception 'Dados excedem o limite.';end if;
 update public.eg_workspaces set name=trim(p_data->>'name') where id=p_workspace;
 insert into public.eg_company_details(workspace_id,description,sector,organization_type,legal_state,visibility) values(p_workspace,coalesce(p_data->>'description',''),coalesce(p_data->>'sector',''),coalesce(p_data->>'type','company'),coalesce(p_data->>'legal_state','forming'),coalesce(p_data->>'visibility','private'))
 on conflict(workspace_id) do update set description=excluded.description,sector=excluded.sector,organization_type=excluded.organization_type,legal_state=excluded.legal_state,visibility=excluded.visibility,updated_at=now();
 insert into public.eg_os_audit(workspace_id,action,details) values(p_workspace,'company.updated',jsonb_build_object('fields',array['name','description','sector','type','legal_state','visibility']));
end $$;
create function public.eg_os_assign_level(p_workspace uuid,p_user uuid,p_code text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform evergreen_private.require_recent();
 if not exists(select 1 from public.eg_workspaces where id=p_workspace and owner_id=auth.uid()) or not evergreen_private.os_can(p_workspace,'members.manage') then raise exception 'Apenas o responsável desta empresa atribui níveis.' using errcode='42501';end if;
 if p_user=auth.uid() or exists(select 1 from public.eg_workspaces where id=p_workspace and owner_id=p_user) then raise exception 'O responsável inicial não pode ser alterado por este fluxo.';end if;
 if p_code='A0' then raise exception 'Transferência de responsabilidade exige deliberação específica.';end if;
 perform evergreen_private.os_seed_levels(p_workspace);
 insert into public.eg_organization_assignments values(p_workspace,p_user,p_code,auth.uid(),now()) on conflict(workspace_id,user_id) do update set level_code=p_code,assigned_by=auth.uid(),updated_at=now();
 update public.eg_members set role=case when p_code='A1' then 'admin' else 'member' end where workspace_id=p_workspace and user_id=p_user;
 insert into public.eg_os_audit(workspace_id,action,details) values(p_workspace,'level.assigned',jsonb_build_object('user_id',p_user,'code',p_code));
end $$;
create function public.eg_os_level_name(p_workspace uuid,p_code text,p_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not evergreen_private.os_can(p_workspace,'company.admin') then raise exception 'Administração necessária.' using errcode='42501';end if;
 perform evergreen_private.require_recent();perform evergreen_private.os_seed_levels(p_workspace);
 update public.eg_organization_levels set name=trim(p_name) where workspace_id=p_workspace and code=p_code;
 if not found then raise exception 'Nível inválido.';end if;
 insert into public.eg_os_audit(workspace_id,action,details) values(p_workspace,'level.renamed',jsonb_build_object('code',p_code,'name',trim(p_name)));
end $$;

-- Exactly three permanent identifiers; occupied seats have equal base authority.
create table public.eg_councils(id uuid primary key default gen_random_uuid(),group_id uuid not null unique references public.eg_groups,activated_at timestamptz,ordinary_quorum integer not null default 2 check(ordinary_quorum between 2 and 3));
create table public.eg_founder_seats(id uuid primary key default gen_random_uuid(),council_id uuid not null references public.eg_councils,position integer not null check(position between 1 and 3),user_id uuid references auth.users,accepted_at timestamptz,assigned_by uuid references auth.users,unique(council_id,position),unique(council_id,user_id),check(accepted_at is null or user_id is not null));
create index eg_founder_seats_user on public.eg_founder_seats(user_id,council_id);
create table public.eg_os_proposals(id uuid primary key default gen_random_uuid(),group_id uuid references public.eg_groups,workspace_id uuid references public.eg_workspaces,title text not null check(length(trim(title)) between 2 and 200),body text not null default '' check(length(body)<=10000),kind text not null check(kind in ('ordinary','fundamental','permission','seat','equity','finance','link')),payload jsonb not null default '{}' check(length(payload::text)<=16000),proposer_id uuid not null default auth.uid() references auth.users,eligible uuid[] not null,conflicts uuid[] not null default '{}',required_votes integer not null check(required_votes between 1 and 100),status text not null default 'open' check(status in ('open','approved','rejected','executed')),deadline timestamptz not null,version integer not null default 1,created_at timestamptz not null default now(),executed_at timestamptz,check((group_id is null)<>(workspace_id is null)));
create index eg_os_proposals_group on public.eg_os_proposals(group_id,created_at desc);
create index eg_os_proposals_workspace on public.eg_os_proposals(workspace_id,created_at desc);
create table public.eg_os_votes(proposal_id uuid not null references public.eg_os_proposals,user_id uuid not null default auth.uid() references auth.users,approve boolean not null,created_at timestamptz not null default now(),primary key(proposal_id,user_id));

create function evergreen_private.os_chairman(g uuid) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.live_session() and exists(select 1 from public.eg_councils c join public.eg_founder_seats s on s.council_id=c.id where c.group_id=g and c.activated_at is not null and s.user_id=auth.uid() and s.accepted_at is not null);
$$;
create function evergreen_private.os_group_member(g uuid) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.live_session() and (exists(select 1 from public.eg_group_spaces s where s.group_id=g and evergreen_private.member_of(s.workspace_id)) or exists(select 1 from public.eg_group_members where group_id=g and user_id=auth.uid()));
$$;
create function evergreen_private.os_group_admin(g uuid) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.os_chairman(g) or (not exists(select 1 from public.eg_councils where group_id=g and activated_at is not null) and evergreen_private.group_owner(g));
$$;
create function public.eg_os_council(p_group uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not evergreen_private.os_group_member(p_group) then raise exception 'Conselho não autorizado.' using errcode='42501';end if;
 return jsonb_build_object('council',(select jsonb_build_object('id',id,'active',activated_at is not null,'ordinary_quorum',ordinary_quorum) from public.eg_councils where group_id=p_group),
 'can_designate',evergreen_private.os_group_admin(p_group),'seats',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'position',s.position,'user_id',s.user_id,'name',p.display_name,'accepted',s.accepted_at is not null) order by s.position) from public.eg_founder_seats s join public.eg_councils c on c.id=s.council_id left join public.eg_profiles p on p.id=s.user_id where c.group_id=p_group),'[]'::jsonb),
 'candidates',case when evergreen_private.os_group_admin(p_group) then coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.display_name)) from public.eg_group_members m join public.eg_profiles p on p.id=m.user_id where m.group_id=p_group and m.role in ('group_owner','founder')),'[]'::jsonb) else '[]'::jsonb end);
end $$;
create function public.eg_os_seat(p_group uuid,p_action text,p_seat uuid default null,p_user uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare c public.eg_councils;u record;caps text[]:=array['overview','companies','finance','people','projects','intelligence','decisions','communication','governance','documents'];
begin
 perform evergreen_private.require_recent();
 select * into c from public.eg_councils where group_id=p_group for update;
 if c.id is null then raise exception 'Conselho ainda não configurado.';end if;
 if c.activated_at is not null then raise exception 'Assentos ativados só podem mudar por deliberação unânime do conselho.' using errcode='42501';end if;
 if p_action='accept' then
 update public.eg_founder_seats set accepted_at=now() where id=p_seat and council_id=c.id and user_id=auth.uid();if not found then raise exception 'Assento não atribuído à sua conta.' using errcode='42501';end if;
 else
 if not evergreen_private.os_group_admin(p_group) then raise exception 'Responsável pela designação inicial necessário.' using errcode='42501';end if;
 if p_action='designate' then
 if not exists(select 1 from public.eg_group_members where group_id=p_group and user_id=p_user and role in ('group_owner','founder')) then raise exception 'Convide a pessoa e confirme sua participação antes da designação.';end if;
 update public.eg_founder_seats set user_id=p_user,accepted_at=null,assigned_by=auth.uid() where id=p_seat and council_id=c.id and accepted_at is null;
 if not found then raise exception 'Assento indisponível; um aceite já registrado não pode ser substituído.';end if;
 elsif p_action='activate' then
 if (select count(*) from public.eg_founder_seats where council_id=c.id and accepted_at is not null)<>3 then raise exception 'Os três titulares precisam aceitar pessoalmente seus assentos.';end if;
 for u in select user_id from public.eg_founder_seats where council_id=c.id loop
 update public.eg_group_members set capabilities=caps where group_id=p_group and user_id=u.user_id;
 insert into public.eg_original_founders(group_id,user_id,declared_by) values(p_group,u.user_id,auth.uid()) on conflict do nothing;
 perform evergreen_private.sync_founder_chat(p_group,u.user_id);
 insert into public.eg_organization_assignments(workspace_id,user_id,level_code,assigned_by) select gs.workspace_id,u.user_id,'A0',auth.uid() from public.eg_group_spaces gs where gs.group_id=p_group on conflict(workspace_id,user_id) do update set level_code='A0',assigned_by=auth.uid(),updated_at=now();
 update public.eg_members set role=case when user_id=candidate_group.owner_id then 'owner' else 'admin' end from public.eg_groups candidate_group join public.eg_group_spaces gs on gs.group_id=candidate_group.id where candidate_group.id=p_group and public.eg_members.workspace_id=gs.workspace_id and public.eg_members.user_id=u.user_id;
 end loop;
 update public.eg_councils set activated_at=now() where id=c.id;
 else raise exception 'Ação de assento inválida.';end if;
 end if;
 insert into public.eg_os_audit(group_id,action,details) values(p_group,'council.'||p_action,jsonb_build_object('seat_id',p_seat,'user_id',p_user));
end $$;

create function evergreen_private.os_proposal_access(p public.eg_os_proposals) returns boolean language sql stable security definer set search_path='' as $$
 select case when p.group_id is not null then (evergreen_private.os_chairman(p.group_id) or evergreen_private.founder_can(p.group_id,'decisions')) else (evergreen_private.os_can(p.workspace_id,'governance') or (p.kind='finance' and p.proposer_id=auth.uid() and exists(select 1 from public.eg_fin_companies c where c.workspace_id=p.workspace_id and evergreen_private.finance_role(c.id)))) end;
$$;
create function public.eg_os_propose(p_group uuid,p_workspace uuid,p_title text,p_body text,p_kind text,p_payload jsonb,p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare users uuid[];conflicts uuid[]:='{}';quorum integer;result uuid;prior public.eg_os_requests;data jsonb;
begin
 perform evergreen_private.require_recent();
 data:=jsonb_build_object('group',p_group,'workspace',p_workspace,'title',p_title,'body',p_body,'kind',p_kind,'payload',p_payload);
 if p_request is null or (p_group is null)=(p_workspace is null) or jsonb_typeof(p_payload)<>'object' or p_kind not in ('ordinary','fundamental','permission','seat','equity','finance','link') then raise exception 'Proposta inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,0));select * into prior from public.eg_os_requests where user_id=auth.uid() and request_id=p_request;
 if found then if prior.operation<>'proposal' or prior.payload<>data then raise exception 'Identificador de proposta já utilizado.';end if;return prior.result;end if;
 if p_group is not null then
 if not evergreen_private.os_group_admin(p_group) then raise exception 'Chairman necessário para propor deliberação.' using errcode='42501';end if;
 if not exists(select 1 from public.eg_councils where group_id=p_group and activated_at is not null) then raise exception 'Ative os três assentos antes das deliberações.';end if;
 select array_agg(s.user_id order by s.position) into users from public.eg_founder_seats s join public.eg_councils c on c.id=s.council_id where c.group_id=p_group and s.accepted_at is not null;
 select case when p_kind in ('fundamental','seat') then 3 when p_kind='permission' then 2 else ordinary_quorum end into quorum from public.eg_councils where group_id=p_group;
 else
 if not evergreen_private.os_can(p_workspace,'governance') and not(p_kind='finance' and evergreen_private.os_financial(p_workspace,true)) then raise exception 'Conselho desta empresa não autorizado.' using errcode='42501';end if;
 select array_agg(m.user_id order by m.user_id) into users from public.eg_members m where m.workspace_id=p_workspace and m.role in ('owner','admin');
 quorum:=case when p_kind='ordinary' then case when exists(select 1 from public.eg_company_details d where d.workspace_id=p_workspace and d.onboarding_config->>'governance'='collegiate') then 2 else 1 end else 2 end;
 end if;

 if p_kind='finance' then
 if p_workspace is null or p_payload->>'action' not in ('authorization','policy') or p_payload->>'action' is null then raise exception 'Autorização financeira inválida.';end if;
 if p_payload->>'action'='policy' then
 if coalesce(p_payload->>'enabled','') not in ('true','false') or coalesce(p_payload->>'threshold_cents','') !~ '^[0-9]+$' or (p_payload->>'threshold_cents')::numeric not between 1 and 9000000000000000 then raise exception 'Política inválida.';end if;
 else
 if not exists(select 1 from public.eg_fin_accounts a join public.eg_fin_companies c on c.id=a.company_id where a.id=(p_payload->>'account_id')::uuid and c.workspace_id=p_workspace) or coalesce(p_payload->>'cents','') !~ '^[0-9]+$' or (p_payload->>'cents')::numeric not between 1 and 9000000000000000 or coalesce(p_payload->>'transaction_kind','') not in ('expense','transfer') or length(coalesce(p_payload->>'description','')) not between 2 and 300 or nullif(p_payload->>'request_id','')::uuid is null then raise exception 'Dados do lançamento inválidos.';end if;
 p_payload:=jsonb_set(p_payload,'{currency}',to_jsonb((select c.currency from public.eg_fin_accounts a join public.eg_fin_companies c on c.id=a.company_id where a.id=(p_payload->>'account_id')::uuid)));
 if p_payload->>'transaction_kind'='transfer' and not exists(select 1 from public.eg_fin_accounts where id=(p_payload->>'to_account_id')::uuid) then raise exception 'Destino necessário.';end if;
 end if;
 end if;
 if p_kind in ('permission','equity','finance') then conflicts:=array[auth.uid()];end if;
 if p_kind='equity' then
 if not exists(select 1 from public.eg_equity_records e where e.id=(p_payload->>'equity_id')::uuid and e.workspace_id=p_workspace) then raise exception 'Participação indisponível neste contexto.' using errcode='42501';end if;
 conflicts:=array_append(conflicts,(select e.user_id from public.eg_equity_records e where e.id=(p_payload->>'equity_id')::uuid));
 end if;
 if nullif(p_payload->>'user_id','') is not null then conflicts:=array_append(conflicts,(p_payload->>'user_id')::uuid);end if;
 if cardinality(users)<quorum then raise exception 'Não há votantes suficientes para este quórum. Convide os responsáveis necessários.';end if;
 insert into public.eg_os_proposals(group_id,workspace_id,title,body,kind,payload,eligible,conflicts,required_votes,deadline) values(p_group,p_workspace,trim(p_title),coalesce(p_body,''),p_kind,p_payload,users,conflicts,quorum,now()+interval '7 days') returning id into result;
 insert into public.eg_os_requests values(auth.uid(),p_request,'proposal',data,result);
 insert into public.eg_os_audit(group_id,workspace_id,action,details) values(p_group,p_workspace,'proposal.created',jsonb_build_object('id',result,'kind',p_kind,'required',quorum));return result;
end $$;
create function public.eg_os_vote(p_proposal uuid,p_approve boolean) returns void language plpgsql security definer set search_path='' as $$
declare p public.eg_os_proposals;yes_count integer;no_count integer;
begin
 perform evergreen_private.require_recent();select * into p from public.eg_os_proposals where id=p_proposal for update;
 if p.id is null or not evergreen_private.os_proposal_access(p) or not(auth.uid()=any(p.eligible)) then raise exception 'Voto não autorizado.' using errcode='42501';end if;
 if p.status<>'open' or p.deadline<=now() then raise exception 'Votação encerrada ou expirada.';end if;
 if p_approve and auth.uid()=any(p.conflicts) then raise exception 'Conflito de interesses: você não pode aprovar esta proposta.' using errcode='42501';end if;
 if p.group_id is not null and not evergreen_private.os_chairman(p.group_id) then raise exception 'Assento não está ativo.' using errcode='42501';end if;
 if p.workspace_id is not null and not evergreen_private.admin_of(p.workspace_id) then raise exception 'Vínculo de aprovação revogado.' using errcode='42501';end if;
 insert into public.eg_os_votes values(p.id,auth.uid(),p_approve,now());
 select count(*) filter(where approve),count(*) filter(where not approve) into yes_count,no_count from public.eg_os_votes where proposal_id=p.id;
 update public.eg_os_proposals set status=case when yes_count>=required_votes then 'approved' when cardinality(eligible)-no_count<required_votes then 'rejected' else 'open' end,version=version+1 where id=p.id;
 insert into public.eg_os_audit(group_id,workspace_id,action,details) values(p.group_id,p.workspace_id,'proposal.voted',jsonb_build_object('id',p.id,'approve',p_approve));
end $$;

-- Legacy administrative paths cannot bypass an active council.
alter function public.eg_founders_action(uuid,text,jsonb) rename to eg_founders_action_before_os;
revoke all on function public.eg_founders_action_before_os(uuid,text,jsonb) from public,anon,authenticated;
create function public.eg_founders_action(p_group uuid,p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if p_action in ('grant','scope','revoke','link','self_scope') and exists(select 1 from public.eg_councils where group_id=p_group and activated_at is not null) then raise exception 'COUNCIL_REQUIRED: proponha a alteração ao conselho.' using errcode='42501';end if;
 return public.eg_founders_action_before_os(p_group,p_action,p_data);
end $$;
alter function public.eg_profile_original_founder(uuid,uuid,boolean) rename to eg_profile_original_founder_before_os;
revoke all on function public.eg_profile_original_founder_before_os(uuid,uuid,boolean) from public,anon,authenticated;
create function public.eg_profile_original_founder(p_group uuid,p_user uuid,p_original boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.eg_councils where group_id=p_group and activated_at is not null) then raise exception 'Chairmen são definidos pelos três assentos protegidos do conselho.' using errcode='42501';end if;
 if p_original and not exists(select 1 from public.eg_original_founders where group_id=p_group and user_id=p_user) and (select count(*) from public.eg_original_founders where group_id=p_group)>=3 then raise exception 'Existem exatamente três assentos originais; nenhum quarto assento pode ser criado.';end if;
 perform public.eg_profile_original_founder_before_os(p_group,p_user,p_original);
end $$;

-- Existing groups acquire a genuine general workspace, separate from reserved founders chat.
create function evergreen_private.os_init_group(gid uuid) returns void language plpgsql security definer set search_path='' as $$
declare g public.eg_groups;w uuid;ch uuid;m record;co uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('os-group:'||gid::text,0));
 if exists(select 1 from public.eg_group_spaces where group_id=gid) then return;end if;
 select * into g from public.eg_groups where id=gid;if g.id is null then raise exception 'Grupo inválido.';end if;
 insert into public.eg_councils(group_id) values(g.id) returning id into co;
 insert into public.eg_founder_seats(council_id,position,user_id,assigned_by) select co,n,case when n=1 then g.owner_id end,g.owner_id from generate_series(1,3) n;
 insert into public.eg_workspaces(name,owner_id) values(g.name,g.owner_id) returning id into w;
 insert into public.eg_members(workspace_id,user_id,role,display_name) select w,g.owner_id,'owner',display_name from public.eg_profiles where id=g.owner_id;
 for m in select gm.user_id,p.display_name from public.eg_group_members gm join public.eg_profiles p on p.id=gm.user_id where gm.group_id=g.id loop
 insert into public.eg_members values(w,m.user_id,case when m.user_id=g.owner_id then 'owner' else 'member' end,m.display_name) on conflict do nothing;
 end loop;
 insert into public.eg_channels(workspace_id,name,is_private) values(w,'geral',false) returning id into ch;
 insert into public.eg_channel_members(channel_id,user_id) select ch,user_id from public.eg_members where workspace_id=w;
 insert into public.eg_group_spaces values(g.id,w);
end $$;
create function evergreen_private.os_group_trigger() returns trigger language plpgsql security definer set search_path='' as $$begin perform evergreen_private.os_init_group(new.id);return new;end $$;
create trigger eg_os_group_created after insert on public.eg_groups for each row execute function evergreen_private.os_group_trigger();
do $$ declare item record;begin
 for item in select id from public.eg_groups loop perform evergreen_private.os_init_group(item.id);end loop;
 insert into public.eg_organization_links(group_id,workspace_id,kind,state,scopes,requested_by,company_approved_by,group_approved_by)
 select c.group_id,c.workspace_id,'GROUP_COMPANY','APPROVED',array['overview','companies','people','projects','finance','intelligence','decisions','documents'],g.owner_id,w.owner_id,g.owner_id from public.eg_group_companies c join public.eg_groups g on g.id=c.group_id join public.eg_workspaces w on w.id=c.workspace_id;
end $$;

-- Current legacy data-access checks remain necessary; technical levels additionally restrict writes.
create policy eg_os_record_write on public.eg_records as restrictive for all to authenticated using(evergreen_private.os_can(workspace_id,'work.read')) with check(evergreen_private.os_can(workspace_id,'work.write'));
create policy eg_os_message_write on public.eg_messages as restrictive for insert to authenticated with check(exists(select 1 from public.eg_channels c where c.id=channel_id and evergreen_private.os_can(c.workspace_id,'chat.write')));
create policy eg_os_message_update on public.eg_messages as restrictive for update to authenticated using(exists(select 1 from public.eg_channels c where c.id=channel_id and evergreen_private.os_can(c.workspace_id,'chat.write'))) with check(exists(select 1 from public.eg_channels c where c.id=channel_id and evergreen_private.os_can(c.workspace_id,'chat.write')));

do $$ declare t text;begin foreach t in array array['eg_os_audit','eg_os_requests','eg_organization_levels','eg_organization_assignments','eg_group_spaces','eg_organization_links','eg_councils','eg_founder_seats','eg_os_proposals','eg_os_votes'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);
 execute format('create policy eg_live_session on public.%I as restrictive for all to authenticated using(evergreen_private.live_session()) with check(evergreen_private.live_session())',t);
 end loop;end $$;
create policy os_audit_read on public.eg_os_audit for select to authenticated using((workspace_id is not null and evergreen_private.os_can(workspace_id,'company.admin')) or (group_id is not null and evergreen_private.os_group_admin(group_id)));
create policy os_request_read on public.eg_os_requests for select to authenticated using(user_id=auth.uid());
create policy os_level_read on public.eg_organization_levels for select to authenticated using(evergreen_private.member_of(workspace_id));
create policy os_assignment_read on public.eg_organization_assignments for select to authenticated using(evergreen_private.member_of(workspace_id));
create policy os_group_space_read on public.eg_group_spaces for select to authenticated using(evergreen_private.os_group_member(group_id));
create policy os_links_read on public.eg_organization_links for select to authenticated using(evergreen_private.os_group_admin(group_id) or evergreen_private.os_can(workspace_id,'company.admin'));
create policy os_council_read on public.eg_councils for select to authenticated using(evergreen_private.os_group_member(group_id));
create policy os_seat_read on public.eg_founder_seats for select to authenticated using(exists(select 1 from public.eg_councils c where c.id=council_id and evergreen_private.os_group_member(c.group_id)));
create policy os_proposal_read on public.eg_os_proposals for select to authenticated using(evergreen_private.os_proposal_access(eg_os_proposals));
create policy os_vote_read on public.eg_os_votes for select to authenticated using(exists(select 1 from public.eg_os_proposals p where p.id=proposal_id and evergreen_private.os_proposal_access(p)));

do $$ declare f record;begin
 for f in select p.oid::regprocedure signature,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in ('eg_os_company_create','eg_os_company_update','eg_os_assign_level','eg_os_level_name','eg_os_council','eg_os_seat','eg_os_propose','eg_os_vote','eg_founders_action','eg_profile_original_founder')) or (n.nspname='evergreen_private' and p.proname like 'os_%') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 if f.nspname='public' or f.signature::text like '%os_can%' or f.signature::text like '%os_group_%' or f.signature::text like '%os_proposal_access%' then execute format('grant execute on function %s to authenticated',f.signature);end if;
 end loop;
end $$;
create policy eg_os_record_delete on public.eg_records as restrictive for delete to authenticated using(evergreen_private.os_can(workspace_id,'work.write'));





































-- OS API composition begins
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

-- OS operations composition begins
create table public.eg_equity_records(id uuid primary key,user_id uuid not null references auth.users,workspace_id uuid not null references public.eg_workspaces,relationship text not null check(relationship in ('founder','cofounder','partner','shareholder')),proposed_bps integer not null check(proposed_bps between 1 and 10000),voting_bps integer not null default 0 check(voting_bps between 0 and 10000),responsibilities text not null default '' check(length(responsibilities)<=2000),state text not null default 'proposed' check(state in ('proposed','documented','exited','rejected')),document_path text,document_sha256 text check(document_sha256 is null or document_sha256 ~ '^[a-f0-9]{64}$'),proposal_id uuid references public.eg_os_proposals,created_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),version integer not null default 1);
create index eg_equity_workspace on public.eg_equity_records(workspace_id,user_id);
create table public.eg_os_commitments(id uuid primary key,workspace_id uuid not null references public.eg_workspaces,account_id uuid not null references public.eg_fin_accounts,kind text not null check(kind in ('payable','receivable')),description text not null check(length(trim(description)) between 2 and 300),category text not null default '' check(length(category)<=100),cost_center text not null default '' check(length(cost_center)<=100),cents bigint not null check(cents between 1 and 9000000000000000),due_on date not null,currency text not null check(currency ~ '^[A-Z]{3}$'),recurrence text not null default 'none' check(recurrence in ('none','weekly','monthly','yearly')),anchor_on date not null,series_id uuid not null,sequence integer not null default 0,state text not null default 'open' check(state in ('open','settled','cancelled')),event_id uuid references public.eg_fin_events,created_by uuid not null default auth.uid() references auth.users,version integer not null default 1,created_at timestamptz not null default now(),unique(series_id,sequence));
create index eg_os_commitment_due on public.eg_os_commitments(workspace_id,state,due_on);
create table public.eg_intercompany_requests(id uuid primary key,from_account uuid not null references public.eg_fin_accounts,to_account uuid not null references public.eg_fin_accounts,from_workspace uuid not null references public.eg_workspaces,to_workspace uuid not null references public.eg_workspaces,kind text not null check(kind in ('transfer','loan','service','reimbursement','allocation','contribution')),cents bigint not null check(cents between 1 and 9000000000000000),currency text not null check(currency ~ '^[A-Z]{3}$'),description text not null check(length(trim(description)) between 2 and 300),created_by uuid not null default auth.uid() references auth.users,state text not null default 'pending' check(state in ('pending','approved','rejected','executed')),event_id uuid references public.eg_fin_events,created_at timestamptz not null default now(),version integer not null default 1,check(from_workspace<>to_workspace),check(from_account<>to_account));
create index eg_intercompany_from on public.eg_intercompany_requests(from_workspace,created_at desc);
create index eg_intercompany_to on public.eg_intercompany_requests(to_workspace,created_at desc);
create table public.eg_intercompany_approvals(request_id uuid not null references public.eg_intercompany_requests,side text not null check(side in ('from','to')),approved_by uuid not null references auth.users,created_at timestamptz not null default now(),primary key(request_id,side));
create table public.eg_os_seat_consents(proposal_id uuid primary key references public.eg_os_proposals,user_id uuid not null references auth.users,accepted_at timestamptz not null default now());

create function evergreen_private.os_financial(w uuid,edit boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.os_can(w,case when edit then 'finance.write' else 'finance.read' end) and exists(select 1 from public.eg_fin_companies c where c.workspace_id=w and evergreen_private.finance_role(c.id,case when edit then array['admin','editor'] else array['admin','editor','viewer'] end));
$$;
create function evergreen_private.os_equity_read(w uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$select evergreen_private.member_of(w) and (auth.uid()=u or evergreen_private.os_can(w,'governance'));$$;
create function public.eg_os_equity(p_action text,p_workspace uuid,p_id uuid,p_data jsonb default '{}') returns uuid language plpgsql security definer set search_path='' as $$
declare e public.eg_equity_records;path text;result uuid;u uuid;
begin
 perform evergreen_private.require_recent();
 if not evergreen_private.os_can(p_workspace,'governance') then raise exception 'Gestão societária não autorizada.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('equity:'||p_workspace::text,0));
 if p_action='propose' then
 u:=(p_data->>'user_id')::uuid;
 if not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=u) then raise exception 'Convide a pessoa para esta empresa antes de registrar a participação.';end if;
 select * into e from public.eg_equity_records where id=p_id;
 if found then if e.workspace_id<>p_workspace or e.created_by<>auth.uid() or e.user_id<>u or e.proposed_bps<>(p_data->>'bps')::integer or e.relationship<>p_data->>'relationship' or e.voting_bps<>coalesce((p_data->>'voting_bps')::integer,0) or e.responsibilities<>coalesce(p_data->>'responsibilities','') then raise exception 'Identificador já utilizado.';end if;return e.id;end if;
 insert into public.eg_equity_records(id,user_id,workspace_id,relationship,proposed_bps,voting_bps,responsibilities) values(p_id,u,p_workspace,p_data->>'relationship',(p_data->>'bps')::integer,coalesce((p_data->>'voting_bps')::integer,0),coalesce(p_data->>'responsibilities',''));
 elsif p_action='document' then
 select * into e from public.eg_equity_records where id=p_id and workspace_id=p_workspace for update;
 if e.id is not null and e.document_path=p_data->>'path' and e.document_sha256=p_data->>'sha256' then return e.id;end if;
 if e.id is null or e.state<>'proposed' or e.document_path is not null then raise exception 'Documento não pode ser substituído silenciosamente. Registre uma nova proposta.';end if;
 path:=p_data->>'path';
 if split_part(path,'/',1)<>p_workspace::text or split_part(path,'/',2)<>p_id::text or split_part(path,'/',3)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='eg-os-documents' and name=path) then raise exception 'Anexe um documento privado válido antes da confirmação.';end if;
 update public.eg_equity_records set document_path=path,document_sha256=p_data->>'sha256',version=version+1 where id=p_id;
 else raise exception 'Ação societária inválida.';end if;
 insert into public.eg_os_audit(workspace_id,action,details) values(p_workspace,'equity.'||p_action,jsonb_build_object('id',p_id));return p_id;
end $$;
create function public.eg_os_commitment(p_action text,p_workspace uuid,p_id uuid,p_data jsonb default '{}') returns uuid language plpgsql security definer set search_path='' as $$
declare item public.eg_os_commitments;a public.eg_fin_accounts;book public.eg_fin_companies;event uuid;next_due date;request uuid;payload jsonb;
begin
 perform evergreen_private.require_recent();if not evergreen_private.os_financial(p_workspace,true) then raise exception 'Acesso ao Cofre desta empresa necessário.' using errcode='42501';end if;
 if p_action='create' then
 select * into item from public.eg_os_commitments where id=p_id;
 if found then if item.workspace_id<>p_workspace or item.created_by<>auth.uid() or item.cents<>(p_data->>'cents')::bigint or item.account_id<>(p_data->>'account_id')::uuid or item.description<>p_data->>'description' or item.due_on<>(p_data->>'due_on')::date or item.kind<>p_data->>'kind' or item.category<>coalesce(p_data->>'category','') or item.cost_center<>coalesce(p_data->>'cost_center','') or item.recurrence<>coalesce(p_data->>'recurrence','none') then raise exception 'Identificador já usado com outros dados.';end if;return item.id;end if;
 select * into a from public.eg_fin_accounts where id=(p_data->>'account_id')::uuid;select * into book from public.eg_fin_companies where id=a.company_id;
 if book.workspace_id<>p_workspace or not evergreen_private.finance_role(book.id,array['admin','editor']) then raise exception 'Conta não autorizada.' using errcode='42501';end if;
 insert into public.eg_os_commitments(id,workspace_id,account_id,kind,description,category,cost_center,cents,due_on,currency,recurrence,anchor_on,series_id) values(p_id,p_workspace,a.id,p_data->>'kind',trim(p_data->>'description'),coalesce(p_data->>'category',''),coalesce(p_data->>'cost_center',''),(p_data->>'cents')::bigint,(p_data->>'due_on')::date,book.currency,coalesce(p_data->>'recurrence','none'),(p_data->>'due_on')::date,p_id);
 else
 select * into item from public.eg_os_commitments where id=p_id and workspace_id=p_workspace for update;
 if item.id is null then raise exception 'Compromisso indisponível.';end if;
 if p_action='settle' and item.state='settled' then return item.event_id;end if;
 if item.state<>'open' then raise exception 'Compromisso encerrado.';end if;
 if p_action='cancel' then update public.eg_os_commitments set state='cancelled',version=version+1 where id=item.id;
 elsif p_action='settle' then
 request:=(p_data->>'request_id')::uuid;if request is null then raise exception 'Identificador de liquidação necessário.';end if;
 payload:=jsonb_build_object('account_id',item.account_id,'cents',item.cents::text,'description',item.description,'request_id',request,'happened_on',current_date,'category',item.category,'cost_center',item.cost_center,'approval_id',p_data->>'approval_id');
 event:=public.eg_financial_action(p_workspace,case item.kind when 'payable' then 'expense' else 'income' end,payload);
 update public.eg_os_commitments set state='settled',event_id=event,version=version+1 where id=item.id;
 if item.recurrence<>'none' then
 next_due:=case item.recurrence when 'weekly' then item.anchor_on+(7*(item.sequence+1)) when 'monthly' then (item.anchor_on+make_interval(months=>item.sequence+1))::date else (item.anchor_on+make_interval(years=>item.sequence+1))::date end;
 insert into public.eg_os_commitments(id,workspace_id,account_id,kind,description,category,cost_center,cents,due_on,currency,recurrence,anchor_on,series_id,sequence) values(gen_random_uuid(),p_workspace,item.account_id,item.kind,item.description,item.category,item.cost_center,item.cents,next_due,item.currency,item.recurrence,item.anchor_on,item.series_id,item.sequence+1) on conflict(series_id,sequence) do nothing;
 end if;
 else raise exception 'Ação de compromisso inválida.';end if;
 end if;
 insert into public.eg_os_audit(workspace_id,action,details) values(p_workspace,'commitment.'||p_action,jsonb_build_object('id',p_id,'event_id',event));return coalesce(event,p_id);
end $$;

create function public.eg_os_intercompany(p_action text,p_id uuid,p_data jsonb default '{}') returns uuid language plpgsql security definer set search_path='' as $$
declare r public.eg_intercompany_requests;a public.eg_fin_accounts;b public.eg_fin_accounts;ca public.eg_fin_companies;cb public.eg_fin_companies;approval_side text;event uuid;approval record;balance numeric;
begin
 perform evergreen_private.require_recent();
 if p_action='request' then
 select * into r from public.eg_intercompany_requests where id=p_id;
 if found then if r.created_by<>auth.uid() or r.cents<>(p_data->>'cents')::bigint or r.from_account<>(p_data->>'from_account')::uuid or r.to_account<>(p_data->>'to_account')::uuid or r.description<>p_data->>'description' or r.kind<>p_data->>'kind' then raise exception 'Identificador já utilizado.';end if;return r.id;end if;
 select * into a from public.eg_fin_accounts where id=(p_data->>'from_account')::uuid;select * into b from public.eg_fin_accounts where id=(p_data->>'to_account')::uuid;
 select * into ca from public.eg_fin_companies where id=a.company_id;select * into cb from public.eg_fin_companies where id=b.company_id;
 if a.id is null or b.id is null or ca.workspace_id=cb.workspace_id or ca.currency<>cb.currency or not evergreen_private.os_financial(ca.workspace_id,true) or not evergreen_private.finance_role(cb.id) then raise exception 'Contas autorizadas de empresas distintas na mesma moeda são necessárias.' using errcode='42501';end if;
 if not evergreen_private.related_finance_workspaces(ca.workspace_id,cb.workspace_id) then raise exception 'As empresas precisam de vínculo financeiro autorizado.' using errcode='42501';end if;
 insert into public.eg_intercompany_requests(id,from_account,to_account,from_workspace,to_workspace,kind,cents,currency,description) values(p_id,a.id,b.id,ca.workspace_id,cb.workspace_id,p_data->>'kind',(p_data->>'cents')::bigint,ca.currency,p_data->>'description');
 else
 select * into r from public.eg_intercompany_requests where id=p_id for update;
 if r.id is null or not(evergreen_private.os_financial(r.from_workspace) or evergreen_private.os_financial(r.to_workspace)) then raise exception 'Operação intercompany indisponível.' using errcode='42501';end if;
 if p_action='execute' and r.state='executed' then return r.event_id;end if;
 if r.state not in ('pending','approved') then raise exception 'Operação encerrada.';end if;
 if p_action='approve' then
 approval_side:=p_data->>'side';if approval_side not in ('from','to') or not evergreen_private.os_financial(case approval_side when 'from' then r.from_workspace else r.to_workspace end,true) or not evergreen_private.os_can(case approval_side when 'from' then r.from_workspace else r.to_workspace end,'finance.approve') then raise exception 'Aprovação deste lado não autorizada.' using errcode='42501';end if;
 if exists(select 1 from public.eg_intercompany_approvals ap where ap.request_id=r.id and ap.approved_by=auth.uid() and ap.side<>p_data->>'side') then raise exception 'Segregação: a outra organização precisa de um aprovador diferente.' using errcode='42501';end if;
 insert into public.eg_intercompany_approvals values(r.id,approval_side,auth.uid(),now()) on conflict(request_id,side) do update set approved_by=excluded.approved_by,created_at=now();
 if (select count(*) from public.eg_intercompany_approvals where request_id=r.id)=2 then update public.eg_intercompany_requests set state='approved',version=version+1 where id=r.id;end if;
 elsif p_action='reject' then
 if not(evergreen_private.os_financial(r.from_workspace,true) or evergreen_private.os_financial(r.to_workspace,true)) then raise exception 'Aprovação financeira necessária.' using errcode='42501';end if;
 update public.eg_intercompany_requests set state='rejected',version=version+1 where id=r.id;
 elsif p_action='execute' then
 if r.state<>'approved' or not(evergreen_private.os_financial(r.from_workspace,true) or evergreen_private.os_financial(r.to_workspace,true)) then raise exception 'São necessárias as duas aprovações e acesso financeiro atual.' using errcode='42501';end if;
 select * into a from public.eg_fin_accounts where id=r.from_account;select * into b from public.eg_fin_accounts where id=r.to_account;
 for approval in select * from public.eg_intercompany_approvals where request_id=r.id loop
 if approval.created_at<now()-interval '24 hours' or not exists(select 1 from public.eg_fin_members fm join public.eg_fin_companies fc on fc.id=fm.company_id join public.eg_members m on m.workspace_id=fc.workspace_id and m.user_id=fm.user_id where fm.user_id=approval.approved_by and fm.role in ('admin','editor') and fc.id=case approval.side when 'from' then a.company_id else b.company_id end and not exists(select 1 from public.eg_organization_assignments ax join public.eg_organization_levels lx on lx.workspace_id=ax.workspace_id and lx.code=ax.level_code where ax.workspace_id=fc.workspace_id and ax.user_id=approval.approved_by and not('finance.write'=any(lx.permissions) and 'finance.approve'=any(lx.permissions)))) then raise exception 'Aprovação expirada ou acesso do aprovador revogado.' using errcode='42501';end if;
 end loop;
 perform id from public.eg_fin_accounts where id in(a.id,b.id) order by id for update;
 select coalesce(sum(cents),0) into balance from public.eg_fin_entries where account_id=a.id;
 if balance<r.cents then raise exception 'Saldo registrado insuficiente.';end if;
 insert into public.eg_fin_events(workspace_id,request_id,actor_id,kind,description,payload) values(r.from_workspace,r.id,auth.uid(),'transfer',r.description,jsonb_build_object('intercompany_id',r.id,'kind',r.kind)) returning id into event;
 insert into public.eg_fin_entries(event_id,account_id,cents) values(event,a.id,-r.cents),(event,b.id,r.cents);
 update public.eg_intercompany_requests set state='executed',event_id=event,version=version+1 where id=r.id;
 else raise exception 'Ação intercompany inválida.';end if;
 end if;
 insert into public.eg_os_audit(workspace_id,action,details) values(coalesce(r.from_workspace,ca.workspace_id),'intercompany.'||p_action,jsonb_build_object('id',p_id));
 insert into public.eg_os_audit(workspace_id,action,details) values(coalesce(r.to_workspace,cb.workspace_id),'intercompany.'||p_action,jsonb_build_object('id',p_id));return coalesce(event,p_id);
end $$;

create function public.eg_os_operations(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not evergreen_private.member_of(p_workspace) then raise exception 'Empresa não autorizada.' using errcode='42501';end if;
 return jsonb_build_object('equity',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'user_id',e.user_id,'name',p.display_name,'relationship',e.relationship,'bps',e.proposed_bps,'voting_bps',e.voting_bps,'state',e.state,'document_path',e.document_path,'document_sha256',e.document_sha256,'responsibilities',e.responsibilities,'version',e.version)) from public.eg_equity_records e join public.eg_profiles p on p.id=e.user_id where e.workspace_id=p_workspace and evergreen_private.os_equity_read(p_workspace,e.user_id)),'[]'::jsonb),
 'commitments',case when evergreen_private.os_financial(p_workspace) then coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('cents',c.cents::text) order by due_on,id) from public.eg_os_commitments c where c.workspace_id=p_workspace),'[]'::jsonb) else '[]'::jsonb end,
 'intercompany',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('cents',r.cents::text,'approvals',coalesce((select jsonb_agg(to_jsonb(a)) from public.eg_intercompany_approvals a where a.request_id=r.id),'[]'::jsonb))) from public.eg_intercompany_requests r where (r.from_workspace=p_workspace or r.to_workspace=p_workspace) and evergreen_private.os_financial(p_workspace)),'[]'::jsonb),
 'policy',case when evergreen_private.os_financial(p_workspace) then (select jsonb_build_object('enabled',enabled,'threshold_cents',threshold_cents::text) from public.eg_fin_approval_policies where workspace_id=p_workspace) else null end,
 'can_policy',evergreen_private.os_can(p_workspace,'company.admin') and evergreen_private.os_financial(p_workspace,true),
 'approvals',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'payload',p.payload,'status',p.status,'deadline',p.deadline,'consumed',exists(select 1 from public.eg_fin_events fe where fe.workspace_id=p_workspace and fe.request_id=nullif(p.payload->>'request_id','')::uuid))) from public.eg_os_proposals p where p.workspace_id=p_workspace and p.kind='finance' and evergreen_private.os_proposal_access(p) and p.status in ('open','approved','executed') and p.deadline>now()),'[]'::jsonb),
 'can_finance',evergreen_private.os_financial(p_workspace,true),'can_governance',evergreen_private.os_can(p_workspace,'governance'));
end $$;

create function public.eg_os_seat_consent(p_proposal uuid) returns void language plpgsql security definer set search_path='' as $$
declare p public.eg_os_proposals;begin
 perform evergreen_private.require_recent();select * into p from public.eg_os_proposals where id=p_proposal;
 if p.kind<>'seat' or p.status<>'open' or (p.payload->>'new_user_id')::uuid<>auth.uid() or not evergreen_private.os_group_member(p.group_id) then raise exception 'Aceite de assento não autorizado.' using errcode='42501';end if;
 insert into public.eg_os_seat_consents values(p.id,auth.uid(),now()) on conflict do nothing;
end $$;
create function public.eg_os_execute(p_proposal uuid) returns void language plpgsql security definer set search_path='' as $$
declare p public.eg_os_proposals;e public.eg_equity_records;l public.eg_organization_links;seat public.eg_founder_seats;u uuid;cap text;caps text[];v record;valid_votes integer:=0;
begin
 perform evergreen_private.require_recent();select * into p from public.eg_os_proposals where id=p_proposal for update;
 if p.id is null or not evergreen_private.os_proposal_access(p) then raise exception 'Deliberação não autorizada.' using errcode='42501';end if;
 if p.status='executed' then return;end if;
 if p.status<>'approved' or p.deadline<=now() then raise exception 'Proposta precisa estar aprovada e vigente.';end if;
 for v in select user_id from public.eg_os_votes where proposal_id=p.id and approve loop
 if (p.group_id is not null and exists(select 1 from public.eg_founder_seats s join public.eg_councils c on c.id=s.council_id where c.group_id=p.group_id and c.activated_at is not null and s.user_id=v.user_id and s.accepted_at is not null)) or (p.workspace_id is not null and exists(select 1 from public.eg_members where workspace_id=p.workspace_id and user_id=v.user_id and role in ('owner','admin'))) then valid_votes:=valid_votes+1;end if;
 end loop;
 if valid_votes<p.required_votes then raise exception 'O acesso de um aprovador mudou. São necessárias novas deliberações.' using errcode='42501';end if;
 if p.kind='permission' then
 if p.group_id is null then raise exception 'Use a gestão de níveis da empresa para permissões operacionais.';end if;
 u:=nullif(p.payload->>'user_id','')::uuid;
 if exists(select 1 from public.eg_founder_seats s join public.eg_councils c on c.id=s.council_id where c.group_id=p.group_id and s.user_id=u) then raise exception 'Permissões-base dos três assentos não podem ser rebaixadas por este fluxo.';end if;
 caps:=array(select jsonb_array_elements_text(p.payload->'capabilities'));
 if p.payload->>'action'='technical_level' then
 perform evergreen_private.os_group_level_apply(p.group_id,u,p.payload->>'code');
 elsif p.payload->>'action'='level_name' then
 update public.eg_group_levels set name=trim(p.payload->>'name') where group_id=p.group_id and code=p.payload->>'code';if not found then raise exception 'Nível inválido.';end if;
 elsif p.payload->>'action'='scope' then
 insert into public.eg_group_scopes values(p.group_id,u,(p.payload->>'workspace_id')::uuid,caps) on conflict(group_id,user_id,workspace_id) do update set capabilities=excluded.capabilities;
 elsif p.payload->>'action'='grant' then
 if not exists(select 1 from public.eg_members m join public.eg_group_companies gc on gc.workspace_id=m.workspace_id where gc.group_id=p.group_id and m.user_id=u) then raise exception 'Convide a pessoa para uma empresa vinculada primeiro.';end if;
 insert into public.eg_group_members values(p.group_id,u,coalesce(p.payload->>'role','group_executive'),caps) on conflict(group_id,user_id) do update set role=excluded.role,capabilities=excluded.capabilities;
 elsif p.payload->>'action'='revoke' then delete from public.eg_group_members where group_id=p.group_id and user_id=u;
 else raise exception 'Alteração de permissão inválida.';end if;
 perform evergreen_private.sync_founder_chat(p.group_id,u);
 elsif p.kind='fundamental' then
 if p.group_id is null or p.payload->>'action'<>'ordinary_quorum' then raise exception 'Política fundamental não suportada.';end if;
 update public.eg_councils set ordinary_quorum=(p.payload->>'quorum')::integer where group_id=p.group_id;
 elsif p.kind='seat' then
 select s.* into seat from public.eg_founder_seats s join public.eg_councils c on c.id=s.council_id where s.id=(p.payload->>'seat_id')::uuid and c.group_id=p.group_id for update of s;
 u:=(p.payload->>'new_user_id')::uuid;
 if seat.id is null or not exists(select 1 from public.eg_os_seat_consents where proposal_id=p.id and user_id=u) or not exists(select 1 from public.eg_group_members where group_id=p.group_id and user_id=u and role='founder') then raise exception 'O novo titular precisa ser fundador confirmado e aceitar esta proposta pessoalmente.';end if;
 delete from public.eg_original_founders where group_id=p.group_id and user_id=seat.user_id;
 update public.eg_founder_seats set user_id=u,accepted_at=now(),assigned_by=auth.uid() where id=seat.id;
 insert into public.eg_original_founders values(p.group_id,u,auth.uid(),now());
 update public.eg_group_members set capabilities=array['overview','companies','finance','people','projects','intelligence','decisions','communication','governance','documents'] where group_id=p.group_id and user_id=u;
 perform evergreen_private.sync_founder_chat(p.group_id,u);
 insert into public.eg_organization_assignments(workspace_id,user_id,level_code,assigned_by) select gs.workspace_id,person,case when person=u then 'A0' else 'A5' end,auth.uid() from public.eg_group_spaces gs cross join unnest(array[u,seat.user_id])person where gs.group_id=p.group_id on conflict(workspace_id,user_id) do update set level_code=excluded.level_code,assigned_by=auth.uid(),updated_at=now();
 update public.eg_members m set role=case when m.user_id=u then 'admin' else 'member' end from public.eg_group_spaces gs where gs.group_id=p.group_id and m.workspace_id=gs.workspace_id and m.user_id in(u,seat.user_id);
 elsif p.kind='equity' then
 select * into e from public.eg_equity_records where id=(p.payload->>'equity_id')::uuid and workspace_id=p.workspace_id for update;
 if e.id is null then raise exception 'Participação não pertence a esta empresa.';end if;
 perform pg_advisory_xact_lock(hashtextextended('equity:'||e.workspace_id::text,0));
 if e.document_path is null or not exists(select 1 from storage.objects where bucket_id='eg-os-documents' and name=e.document_path) then raise exception 'Documento comprobatório privado necessário.';end if;
 if p.payload->>'action'='exit' then update public.eg_equity_records set state='exited',proposal_id=p.id,version=version+1 where id=e.id and state='documented';
 else
 if e.state<>'proposed' or (select coalesce(sum(proposed_bps),0) from public.eg_equity_records where workspace_id=e.workspace_id and state='documented')+e.proposed_bps>10000 or (select coalesce(sum(voting_bps),0) from public.eg_equity_records where workspace_id=e.workspace_id and state='documented')+e.voting_bps>10000 then raise exception 'Participações documentadas não podem exceder 100 por cento.';end if;
 update public.eg_equity_records set state='documented',proposal_id=p.id,version=version+1 where id=e.id;
 end if;
 elsif p.kind='link' then
 select * into l from public.eg_organization_links where id=(p.payload->>'link_id')::uuid and group_id=p.group_id for update;
 if l.id is null or l.state<>'PENDING' or l.company_approved_by is null then raise exception 'Pedido precisa da aprovação da empresa.';end if;
 update public.eg_organization_links set state='APPROVED',group_approved_by=auth.uid(),version=version+1 where id=l.id;
 if l.kind='GROUP_COMPANY' then insert into public.eg_group_companies values(l.group_id,l.workspace_id);end if;
 elsif p.kind='finance' then
 -- An approval records authorization; execution stays an explicit scoped ledger action.
 if p.workspace_id is null or p.payload->>'action' not in ('authorization','policy') then raise exception 'Autorização financeira inválida.';end if;
 if p.payload->>'action'='policy' then
 insert into public.eg_fin_approval_policies values(p.workspace_id,(p.payload->>'enabled')::boolean,(p.payload->>'threshold_cents')::bigint,auth.uid(),now()) on conflict(workspace_id) do update set enabled=excluded.enabled,threshold_cents=excluded.threshold_cents,updated_by=auth.uid(),updated_at=now();
 end if;
 elsif p.kind<>'ordinary' then raise exception 'Tipo de execução inválido.';end if;
 update public.eg_os_proposals set status='executed',executed_at=now(),version=version+1 where id=p.id;
 insert into public.eg_os_audit(group_id,workspace_id,action,details) values(p.group_id,p.workspace_id,'proposal.executed',jsonb_build_object('id',p.id,'kind',p.kind,'votes',valid_votes));
end $$;

-- All active Chairmen share the base governance authority. Company scopes remain explicit.
create or replace function evergreen_private.group_owner(g uuid) returns boolean language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.eg_councils where group_id=g and activated_at is not null) then evergreen_private.os_chairman(g) else evergreen_private.founder_can(g,'governance') and exists(select 1 from public.eg_groups where id=g and owner_id=auth.uid()) end;
$$;

do $$ declare t text;begin foreach t in array array['eg_equity_records','eg_os_commitments','eg_intercompany_requests','eg_intercompany_approvals','eg_os_seat_consents'] loop
execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);execute format('create policy eg_live_session on public.%I as restrictive for all to authenticated using(evergreen_private.live_session()) with check(evergreen_private.live_session())',t);end loop;end $$;
create policy os_equity_read on public.eg_equity_records for select to authenticated using(evergreen_private.os_equity_read(workspace_id,user_id));
create policy os_commitment_read on public.eg_os_commitments for select to authenticated using(evergreen_private.os_financial(workspace_id));
create policy os_ic_read on public.eg_intercompany_requests for select to authenticated using(evergreen_private.os_financial(from_workspace) or evergreen_private.os_financial(to_workspace));
create policy os_ic_approval_read on public.eg_intercompany_approvals for select to authenticated using(exists(select 1 from public.eg_intercompany_requests r where r.id=request_id and (evergreen_private.os_financial(r.from_workspace) or evergreen_private.os_financial(r.to_workspace))));
create policy os_seat_consent_read on public.eg_os_seat_consents for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.eg_os_proposals p where p.id=proposal_id and evergreen_private.os_group_admin(p.group_id)));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('eg-os-documents','eg-os-documents',false,4194304,array['application/pdf','image/png','image/jpeg','text/plain']);
create function evergreen_private.os_document(path text,write_access boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare w uuid;e uuid;begin
 w:=split_part(path,'/',1)::uuid;e:=split_part(path,'/',2)::uuid;
 return exists(select 1 from public.eg_equity_records q where q.id=e and q.workspace_id=w and evergreen_private.os_equity_read(w,q.user_id) and (not write_access or (q.state='proposed' and q.document_path is null and split_part(path,'/',3)=auth.uid()::text and evergreen_private.os_can(w,'governance'))));
exception when invalid_text_representation then return false;end $$;
create policy os_document_read on storage.objects for select to authenticated using(bucket_id='eg-os-documents' and evergreen_private.os_document(name,false));
create policy os_document_insert on storage.objects for insert to authenticated with check(bucket_id='eg-os-documents' and evergreen_private.os_document(name,true));

do $$ declare f record;begin for f in select p.oid::regprocedure signature,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in ('eg_os_equity','eg_os_commitment','eg_os_intercompany','eg_os_operations','eg_os_seat_consent','eg_os_execute')) or(n.nspname='evergreen_private' and p.proname in ('os_financial','os_equity_read','os_document')) loop
execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to authenticated',f.signature);end loop;end $$;

-- Additional technical levels restrict legacy security-definer paths too.
create or replace function evergreen_private.admin_of(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.live_session() and exists(select 1 from public.eg_members m where m.workspace_id=w and m.user_id=auth.uid() and m.role in ('owner','admin')) and not exists(select 1 from public.eg_organization_assignments a join public.eg_organization_levels l on l.workspace_id=a.workspace_id and l.code=a.level_code where a.workspace_id=w and a.user_id=auth.uid() and not('company.admin'=any(l.permissions)));
$$;
create or replace function evergreen_private.finance_role(c uuid,roles text[] default array['admin','editor','viewer']) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.live_session() and exists(select 1 from public.eg_fin_members m join public.eg_fin_companies co on co.id=m.company_id where m.company_id=c and m.user_id=auth.uid() and m.role=any(roles) and evergreen_private.member_of(co.workspace_id)) and not exists(select 1 from public.eg_fin_companies fc join public.eg_organization_assignments a on a.workspace_id=fc.workspace_id and a.user_id=auth.uid() join public.eg_organization_levels l on l.workspace_id=a.workspace_id and l.code=a.level_code where fc.id=c and not(case when roles<@array['admin','editor'] then 'finance.write' else 'finance.read' end=any(l.permissions)));
$$;
create or replace function evergreen_private.record_access(r uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.eg_records where id=r and evergreen_private.os_can(workspace_id,'work.read'));
$$;
create policy os_record_read_level on public.eg_records as restrictive for select to authenticated using(evergreen_private.os_can(workspace_id,'work.read'));
do $$declare t text;begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in('eg_areas','eg_goals','eg_record_links','eg_activity','eg_focus_sessions') and exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='workspace_id' and not a.attisdropped) loop
 execute format('create policy os_work_read_level on public.%I as restrictive for select to authenticated using(evergreen_private.os_can(workspace_id,''work.read''))',t);
 end loop;
end $$;
create policy os_delegated_invites_read on public.eg_invites for select to authenticated using(evergreen_private.os_can(workspace_id,'members.manage'));
create policy os_delegated_invites_insert on public.eg_invites for insert to authenticated with check(evergreen_private.os_can(workspace_id,'members.manage') and created_by=auth.uid() and accepted_by is null);
create policy os_delegated_invites_delete on public.eg_invites for delete to authenticated using(evergreen_private.os_can(workspace_id,'members.manage'));
create function public.eg_os_level_permissions(p_workspace uuid,p_code text,p_permissions text[]) returns void language plpgsql security definer set search_path='' as $$
begin
 perform evergreen_private.require_recent();
 if p_code='A0' or not exists(select 1 from public.eg_workspaces where id=p_workspace and owner_id=auth.uid()) or not evergreen_private.os_can(p_workspace,'members.manage') then raise exception 'Apenas o responsável pode configurar permissões abaixo de APEX.' using errcode='42501';end if;
 perform evergreen_private.os_seed_levels(p_workspace);update public.eg_organization_levels set permissions=p_permissions where workspace_id=p_workspace and code=p_code;
 if not found then raise exception 'Nível não encontrado.';end if;
 insert into public.eg_os_audit(workspace_id,action,details) values(p_workspace,'level.permissions',jsonb_build_object('code',p_code,'permissions',p_permissions));
end $$;
create or replace function evergreen_private.file_access(path text,writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare parts text[];resource uuid;w uuid;d public.eg_founder_documents;
begin
 if not evergreen_private.live_session() then return false;end if;
 parts:=string_to_array(path,'/');
 if parts[1]='founders' then
 if array_length(parts,1)<>5 then return false;end if;
 select * into d from public.eg_founder_documents where id=parts[3]::uuid and group_id=parts[2]::uuid and eg_founder_documents.path=file_access.path;
 return d.id is not null and evergreen_private.founder_can(d.group_id,'documents',d.workspace_id) and (not writing or d.author_id=auth.uid() and parts[4]=auth.uid()::text);
 end if;
 if array_length(parts,1)<>5 or parts[1] not in ('record','channel') then return false;end if;
 w:=parts[2]::uuid;resource:=parts[3]::uuid;
 if not evergreen_private.member_of(w) or (writing and (parts[4]<>auth.uid()::text or not evergreen_private.os_can(w,'files.write'))) then return false;end if;
 if parts[1]='record' then return exists(select 1 from public.eg_records where id=resource and workspace_id=w);
 else return exists(select 1 from public.eg_channels where id=resource and workspace_id=w) and evergreen_private.can_read_channel(resource);end if;
exception when invalid_text_representation then return false;end $$;
create function evergreen_private.os_protect_seat_membership() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (TG_OP='DELETE' or (new.role='member' and old.role in ('owner','admin'))) and exists(select 1 from public.eg_councils c join public.eg_founder_seats s on s.council_id=c.id join public.eg_groups g on g.id=c.group_id left join public.eg_group_spaces gs on gs.group_id=g.id where c.activated_at is not null and s.user_id=old.user_id and old.workspace_id in (g.communication_workspace,gs.workspace_id)) then raise exception 'Um Chairman ativo não pode ser removido unilateralmente.' using errcode='42501';end if;
 if TG_OP='DELETE' then return old;end if;return new;
end $$;
create trigger eg_os_protect_chairman before update or delete on public.eg_members for each row execute function evergreen_private.os_protect_seat_membership();

create table public.eg_fin_approval_policies(workspace_id uuid primary key references public.eg_workspaces,enabled boolean not null default false,threshold_cents bigint not null default 1 check(threshold_cents between 1 and 9000000000000000),updated_by uuid not null references auth.users,updated_at timestamptz not null default now());
create table public.eg_fin_approval_consumptions(proposal_id uuid primary key references public.eg_os_proposals,actor_id uuid not null references auth.users,request_id uuid not null,created_at timestamptz not null default now());
alter table public.eg_fin_approval_policies enable row level security;alter table public.eg_fin_approval_consumptions enable row level security;
revoke all on public.eg_fin_approval_policies,public.eg_fin_approval_consumptions from public,anon,authenticated;
grant select on public.eg_fin_approval_policies to authenticated;
create policy os_fin_policy_read on public.eg_fin_approval_policies for select to authenticated using(evergreen_private.os_financial(workspace_id));
create function public.eg_os_finance_policy(p_workspace uuid,p_enabled boolean,p_threshold text) returns void language plpgsql security definer set search_path='' as $$begin
 perform evergreen_private.require_recent();if exists(select 1 from public.eg_fin_approval_policies where workspace_id=p_workspace and enabled) then raise exception 'COUNCIL_REQUIRED: altere uma política ativa por deliberação financeira.' using errcode='42501';end if;if not evergreen_private.os_can(p_workspace,'company.admin') or not evergreen_private.os_financial(p_workspace,true) then raise exception 'Administração financeira necessária.' using errcode='42501';end if;
 insert into public.eg_fin_approval_policies values(p_workspace,p_enabled,p_threshold::bigint,auth.uid(),now()) on conflict(workspace_id) do update set enabled=excluded.enabled,threshold_cents=excluded.threshold_cents,updated_by=auth.uid(),updated_at=now();
 insert into public.eg_os_audit(workspace_id,action,details) values(p_workspace,'finance.policy',jsonb_build_object('enabled',p_enabled,'threshold_cents',p_threshold));
end $$;
create function evergreen_private.os_finance_gate(w uuid,action text,data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare p public.eg_os_proposals;consumption public.eg_fin_approval_consumptions;votes integer;
begin
 if not evergreen_private.member_of(w) then raise exception 'Empresa financeira não autorizada.' using errcode='42501';end if;

 if exists(select 1 from public.eg_shared_channels where workspace_id=w) then raise exception 'Salas compartilhadas não possuem Cofre próprio.' using errcode='42501';end if;
 if action='transfer' and exists(select 1 from public.eg_fin_accounts a join public.eg_fin_companies c on c.id=a.company_id where a.id=(data->>'to_account_id')::uuid and c.workspace_id<>w) then raise exception 'INTERCOMPANY_APPROVAL_REQUIRED: operações entre empresas exigem aprovação bilateral. Abra Administração e Intercompany.' using errcode='42501';end if;

 if action not in ('expense','transfer') or not exists(select 1 from public.eg_fin_approval_policies where workspace_id=w and enabled and threshold_cents<=(data->>'cents')::bigint) then return;end if;
 select * into p from public.eg_os_proposals where id=nullif(data->>'approval_id','')::uuid for update;
 if p.id is null or p.workspace_id<>w or p.kind<>'finance' or p.status not in ('approved','executed') or p.deadline<=now() or p.payload->>'account_id' is distinct from data->>'account_id' or p.payload->>'cents' is distinct from data->>'cents' or p.payload->>'transaction_kind' is distinct from action or p.payload->>'request_id' is distinct from data->>'request_id' or p.payload->>'description' is distinct from data->>'description' or (action='transfer' and p.payload->>'to_account_id' is distinct from data->>'to_account_id') then raise exception 'FINANCIAL_APPROVAL_REQUIRED: apresente a autorização colegiada deste lançamento.' using errcode='42501';end if;
 select count(*) into votes from public.eg_os_votes v join public.eg_members m on m.user_id=v.user_id and m.workspace_id=w and m.role in ('owner','admin') where v.proposal_id=p.id and v.approve and not exists(select 1 from public.eg_organization_assignments ax join public.eg_organization_levels lx on lx.workspace_id=ax.workspace_id and lx.code=ax.level_code where ax.workspace_id=w and ax.user_id=v.user_id and not('governance'=any(lx.permissions))) and v.user_id<>auth.uid() and not(v.user_id=any(p.conflicts));
 if votes<2 then raise exception 'Dois aprovadores atuais e sem conflito são necessários.' using errcode='42501';end if;
 select * into consumption from public.eg_fin_approval_consumptions where proposal_id=p.id;
 if found then if consumption.actor_id<>auth.uid() or consumption.request_id<>(data->>'request_id')::uuid then raise exception 'Autorização já utilizada.';end if;
 else insert into public.eg_fin_approval_consumptions values(p.id,auth.uid(),(data->>'request_id')::uuid,now());end if;
 update public.eg_os_proposals set status='executed',executed_at=coalesce(executed_at,now()) where id=p.id;
end $$;
alter function public.eg_economy_action(uuid,text,jsonb) rename to eg_economy_action_before_os;
revoke all on function public.eg_economy_action_before_os(uuid,text,jsonb) from public,anon,authenticated;
create function public.eg_economy_action(p_workspace uuid,p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from public.eg_shared_channels where workspace_id=p_workspace) then raise exception 'Salas compartilhadas não possuem Cofre próprio.' using errcode='42501';end if;perform evergreen_private.os_finance_gate(p_workspace,p_action,p_data);return public.eg_economy_action_before_os(p_workspace,p_action,p_data);end $$;
alter function public.eg_financial_action(uuid,text,jsonb) rename to eg_financial_action_before_os;
revoke all on function public.eg_financial_action_before_os(uuid,text,jsonb) from public,anon,authenticated;
create function public.eg_financial_action(p_workspace uuid,p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$begin
 perform evergreen_private.os_finance_gate(p_workspace,p_action,p_data);return public.eg_financial_action_before_os(p_workspace,p_action,p_data);end $$;
do $$ declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('eg_os_level_permissions','eg_os_finance_policy','eg_economy_action','eg_financial_action') loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to authenticated',f.signature);end loop;end $$;
revoke all on function evergreen_private.os_protect_seat_membership(),evergreen_private.os_finance_gate(uuid,text,jsonb) from public,anon,authenticated;

create function evergreen_private.os_sync_general_member() returns trigger language plpgsql security definer set search_path='' as $$
declare scope uuid;nm text;owner_id uuid;begin
 select s.workspace_id,g.owner_id into scope,owner_id from public.eg_group_spaces s join public.eg_groups g on g.id=s.group_id where s.group_id=coalesce(new.group_id,old.group_id);
 if scope is null then return coalesce(new,old);end if;
 if TG_OP='DELETE' then delete from public.eg_members where workspace_id=scope and user_id=old.user_id;return old;end if;
 select display_name into nm from public.eg_profiles where id=new.user_id;
 insert into public.eg_members(workspace_id,user_id,role,display_name) values(scope,new.user_id,case when new.user_id=owner_id then 'owner' else 'member' end,nm) on conflict do nothing;
 return new;
end $$;
create trigger eg_os_general_membership after insert or delete on public.eg_group_members for each row execute function evergreen_private.os_sync_general_member();
revoke all on function evergreen_private.os_sync_general_member() from public,anon,authenticated;
do $$declare w record;begin for w in select id from public.eg_workspaces loop perform evergreen_private.os_seed_levels(w.id);end loop;end $$;

-- Security-definer routines bypass RLS; resource-level triggers enforce technical write levels too.
create function evergreen_private.os_resource_write_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare row jsonb;w uuid;r uuid;c uuid;
begin
 if auth.uid() is null then if TG_OP='DELETE' then return old;else return new;end if;end if;
 row:=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 if TG_TABLE_NAME='eg_records' then w:=(row->>'workspace_id')::uuid;
 elsif TG_TABLE_NAME in ('eg_messages','eg_reactions') then
 if TG_TABLE_NAME='eg_messages' then c:=(row->>'channel_id')::uuid;else select channel_id into c from public.eg_messages where id=(row->>'message_id')::uuid;end if;
 select workspace_id into w from public.eg_channels where id=c;
 if not evergreen_private.os_can(w,'chat.write') then raise exception 'Seu nível não permite escrever nesta conversa.' using errcode='42501';end if;
 if TG_OP='DELETE' then return old;else return new;end if;
 elsif TG_TABLE_NAME='eg_areas' then r:=(row->>'objective_id')::uuid;
 elsif TG_TABLE_NAME='eg_goals' then select objective_id into r from public.eg_areas where id=(row->>'area_id')::uuid;
 else r:=(row->>'record_id')::uuid;end if;
 if w is null then select workspace_id into w from public.eg_records where id=r;end if;
 if not evergreen_private.os_can(w,'work.write') then raise exception 'Seu nível não permite alterar o trabalho desta organização.' using errcode='42501';end if;
 if TG_OP='DELETE' then return old;else return new;end if;
end $$;
do $$declare t text;begin foreach t in array array['eg_records','eg_messages','eg_comments','eg_checklist','eg_reactions','eg_areas','eg_goals'] loop execute format('create trigger eg_os_write_level before insert or update or delete on public.%I for each row execute function evergreen_private.os_resource_write_guard()',t);end loop;end $$;
revoke all on function evergreen_private.os_resource_write_guard() from public,anon,authenticated;

-- OS operations composition begins
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

-- OS operations composition begins
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

commit;
