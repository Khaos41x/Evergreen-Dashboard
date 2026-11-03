begin;
-- Evolve existing identity/workspaces/notifications; no replacement user or company tables.
alter table public.eg_members add column suspended_at timestamptz;
alter table public.eg_professional_roles add column executive_position text not null default '' check(length(executive_position)<=80);
create table public.eg_departments(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.eg_workspaces on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80),description text not null default '' check(length(description)<=500),
 lead_id uuid,created_at timestamptz not null default now(),unique(workspace_id,id),unique(workspace_id,name),
 foreign key(workspace_id,lead_id) references public.eg_members(workspace_id,user_id)
);
create table public.eg_department_members(
 workspace_id uuid not null,department_id uuid not null,user_id uuid not null,
 primary key(department_id,user_id),foreign key(workspace_id,department_id) references public.eg_departments(workspace_id,id) on delete cascade,
 foreign key(workspace_id,user_id) references public.eg_members(workspace_id,user_id) on delete cascade
);
create table public.eg_department_resources(
 workspace_id uuid not null,department_id uuid not null,record_id uuid not null references public.eg_records on delete cascade,
 primary key(department_id,record_id),foreign key(workspace_id,department_id) references public.eg_departments(workspace_id,id) on delete cascade
);
alter table public.eg_departments enable row level security;
alter table public.eg_department_members enable row level security;
alter table public.eg_department_resources enable row level security;
create policy departments_read on public.eg_departments for select to authenticated using(evergreen_private.member_of(workspace_id));
create policy department_members_read on public.eg_department_members for select to authenticated using(evergreen_private.member_of(workspace_id));
create policy department_resources_read on public.eg_department_resources for select to authenticated using(evergreen_private.member_of(workspace_id));
revoke all on public.eg_departments,public.eg_department_members,public.eg_department_resources from public,anon,authenticated;
grant select on public.eg_departments,public.eg_department_members,public.eg_department_resources to authenticated;

create or replace function evergreen_private.member_of(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.live_session() and auth.uid() is not null and exists(select 1 from public.eg_members where workspace_id=w and user_id=auth.uid() and suspended_at is null);
$$;
create or replace function evergreen_private.admin_of(w uuid) returns boolean language sql stable security definer set search_path='' as $$
 select evergreen_private.live_session() and auth.uid() is not null and exists(select 1 from public.eg_members where workspace_id=w and user_id=auth.uid() and suspended_at is null and role in ('owner','admin'));
$$;
create function evergreen_private.verified_email(u uuid) returns text language sql stable security definer set search_path='' as $$
 select lower(email) from auth.users where id=u and email_confirmed_at is not null;
$$;
revoke all on function evergreen_private.verified_email(uuid) from public,anon,authenticated;

alter table public.eg_invites add column created_at timestamptz;
alter table public.eg_invites alter column created_at set default now();
alter table public.eg_invites add column status text not null default 'pending' check(status in ('pending','sent','accepted','declined','expired','cancelled','delivery_failed'));
alter table public.eg_invites add column delivery_status text not null default 'pending' check(delivery_status in ('pending','sent','failed'));
alter table public.eg_invites add column proposed_level text not null default 'A5' check(proposed_level in ('A0','A1','A2','A3','A4','A5','A6'));
alter table public.eg_invites add column proposed_position text not null default '' check(length(proposed_position)<=80);
alter table public.eg_invites add column department_id uuid;
alter table public.eg_invites add foreign key(workspace_id,department_id) references public.eg_departments(workspace_id,id);
alter table public.eg_invites add column resolved_at timestamptz;
alter table public.eg_invites add column revision integer not null default 1 check(revision>0);
alter table public.eg_invites add column request_id uuid;
create unique index eg_invite_request on public.eg_invites(created_by,request_id) where request_id is not null;
create index eg_invite_recipient on public.eg_invites(lower(email),status,expires_at);
update public.eg_invites set status=case when accepted_by is not null then 'accepted' when expires_at<=now() then 'expired' else 'pending' end;
-- Historical creation/acceptance times remain unknown (NULL), rather than being fabricated.
create table public.eg_invitation_events(
 id uuid primary key default gen_random_uuid(),invitation_id uuid references public.eg_invites on delete set null,
 invitation_ref uuid not null,workspace_id uuid not null references public.eg_workspaces on delete cascade,
 actor_id uuid references auth.users,event text not null check(event in ('created','delivery_requested','sent','delivery_failed','accepted','declined','expired','cancelled')),
 event_key text not null unique,details jsonb not null,created_at timestamptz not null default now()
);
create index eg_invitation_event_history on public.eg_invitation_events(invitation_ref,created_at);
create table public.eg_invitation_deliveries(
 id uuid primary key default gen_random_uuid(),invitation_id uuid not null references public.eg_invites on delete cascade,
 revision integer not null,attempts integer not null default 0,available_at timestamptz not null default now(),
 claimed_at timestamptz,lease_id uuid,first_attempt_at timestamptz,payload jsonb not null,sent_at timestamptz,provider_id text,last_error text,
 unique(invitation_id,revision)
);
create index eg_invitation_due on public.eg_invitation_deliveries(available_at) where sent_at is null;
alter table public.eg_invitation_events enable row level security;
alter table public.eg_invitation_deliveries enable row level security;
create policy invitation_history_read on public.eg_invitation_events for select to authenticated using(evergreen_private.live_session() and (evergreen_private.os_can(workspace_id,'members.manage') or details->>'sender_id'=auth.uid()::text or details->>'email'=evergreen_private.verified_email(auth.uid())));
revoke all on public.eg_invitation_events,public.eg_invitation_deliveries from public,anon,authenticated;
grant select on public.eg_invitation_events to authenticated;
grant all on public.eg_invitation_deliveries to service_role;
create policy invitation_delivery_service on public.eg_invitation_deliveries to service_role using(true) with check(true);

alter table public.eg_notifications add column body text not null default '' check(length(body)<=1500);
alter table public.eg_notifications add column category text not null default 'system';
alter table public.eg_notifications add column data jsonb not null default '{}' check(length(data::text)<=4000);
drop policy notification_read on public.eg_notifications;
drop policy notification_update on public.eg_notifications;
create policy notification_read on public.eg_notifications for select to authenticated using(evergreen_private.live_session() and recipient_id=auth.uid() and (evergreen_private.member_of(workspace_id) or type like 'invitation.%'));
create policy notification_update on public.eg_notifications for update to authenticated using(evergreen_private.live_session() and recipient_id=auth.uid() and (evergreen_private.member_of(workspace_id) or type like 'invitation.%')) with check(evergreen_private.live_session() and recipient_id=auth.uid() and (evergreen_private.member_of(workspace_id) or type like 'invitation.%'));

create function evergreen_private.invitation_event(inv public.eg_invites,kind text) returns void language plpgsql security definer set search_path='' as $$
declare company text;who uuid;event_id uuid;k text;title text;message text;begin
 select name into company from public.eg_workspaces where id=inv.workspace_id;
 k:='invitation:'||inv.id||':'||inv.revision||':'||kind;
 insert into public.eg_invitation_events(invitation_id,invitation_ref,workspace_id,actor_id,event,event_key,details)
 values(inv.id,inv.id,inv.workspace_id,auth.uid(),kind,k,jsonb_build_object('sender_id',inv.created_by,'email',inv.email,'company',company,'level',inv.proposed_level))
 on conflict(event_key) do nothing returning id into event_id;
 if event_id is null then return;end if;
 title:=case kind when 'created' then 'Convite criado — entrega pendente' when 'sent' then 'Convite enviado' when 'delivery_failed' then 'Falha no envio do convite' when 'accepted' then 'Novo integrante da equipe' when 'declined' then 'Convite recusado' when 'expired' then 'Convite expirado' when 'cancelled' then 'Convite cancelado' end;
 message:=case kind when 'accepted' then coalesce((select display_name from public.eg_profiles where id=inv.accepted_by),inv.email)||' aceitou seu convite e entrou em '||company||'.'
 when 'sent' then 'O serviço de e-mail confirmou o recebimento do convite para '||inv.email||' entrar em '||company||'. Aguardando aceite.'
 when 'created' then 'Você convidou '||inv.email||' para '||company||'. A entrega ainda não foi confirmada.'
 else 'Convite para '||inv.email||' em '||company||': '||coalesce(title,'entrega solicitada')||'.' end;
 if title is not null then
 insert into public.eg_notifications(workspace_id,recipient_id,type,title,body,category,resource_id,data,dedupe_key)
 values(inv.workspace_id,inv.created_by,'invitation.'||kind,title,message,'invitations',inv.id,jsonb_build_object('invitation_id',inv.id,'workspace_id',inv.workspace_id),k||':'||inv.created_by) on conflict(dedupe_key) do nothing;
 end if;
 if kind='created' then
 select id into who from auth.users where lower(email)=lower(inv.email) and email_confirmed_at is not null;
 if who is not null then
 insert into public.eg_notifications(workspace_id,recipient_id,type,title,body,category,resource_id,data,dedupe_key)
 values(inv.workspace_id,who,'invitation.received','Você recebeu um convite',coalesce((select display_name from public.eg_profiles where id=inv.created_by),'Uma pessoa da equipe')||' convidou você para '||company||'.','invitations',inv.id,jsonb_build_object('invitation_id',inv.id,'workspace_id',inv.workspace_id),k||':'||who) on conflict(dedupe_key) do nothing;
 end if;
 end if;
end $$;
revoke all on function evergreen_private.invitation_event(public.eg_invites,text) from public,anon,authenticated;

create function evergreen_private.company_invite_insert() returns trigger language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or new.created_by<>auth.uid() or not evergreen_private.os_can(new.workspace_id,'members.manage') then raise exception 'Sem permissão para convidar nesta empresa.' using errcode='42501';end if;
 perform 1 from public.eg_workspaces where id=new.workspace_id for update;
 new.email:=lower(trim(new.email));
 if exists(select 1 from public.eg_invites i where i.workspace_id=new.workspace_id and lower(i.email)=new.email and i.status in ('pending','sent','delivery_failed') and i.expires_at>now()) then raise exception 'Já existe um convite pendente para este e-mail.';end if;
 return new;
end $$;
create trigger eg_company_invite_insert before insert on public.eg_invites for each row execute function evergreen_private.company_invite_insert();
create function evergreen_private.company_invite_created() returns trigger language plpgsql security definer set search_path='' as $$begin
 perform evergreen_private.invitation_event(new,'created');
 insert into public.eg_invitation_deliveries(invitation_id,revision,payload) values(new.id,new.revision,jsonb_build_object('email',new.email,'token',new.token,'company',(select name from public.eg_workspaces where id=new.workspace_id),'inviter',(select display_name from public.eg_profiles where id=new.created_by))) on conflict do nothing;
 perform evergreen_private.invitation_event(new,'delivery_requested');return new;
end $$;
create trigger eg_company_invite_created after insert on public.eg_invites for each row execute function evergreen_private.company_invite_created();
-- Legacy revocation by DELETE keeps an immutable event; new clients cancel without deleting the invitation.
create function evergreen_private.company_invite_deleted() returns trigger language plpgsql security definer set search_path='' as $$begin
 if old.status not in ('accepted','declined','expired','cancelled') then perform evergreen_private.invitation_event(old,'cancelled');end if;return old;
end $$;
create trigger eg_company_invite_deleted before delete on public.eg_invites for each row execute function evergreen_private.company_invite_deleted();
revoke all on function evergreen_private.company_invite_insert(),evergreen_private.company_invite_created(),evergreen_private.company_invite_deleted() from public,anon,authenticated;

create function public.eg_create_company_invite(p_workspace uuid,p_email text,p_level text default 'A5',p_position text default '',p_department uuid default null,p_request uuid default gen_random_uuid()) returns jsonb language plpgsql security definer set search_path='' as $$
declare inv public.eg_invites;own_level text;begin
 if auth.uid() is null or evergreen_private.verified_email(auth.uid()) is null or not evergreen_private.os_can(p_workspace,'members.manage') then raise exception 'Convite não autorizado.' using errcode='42501';end if;
 if length(trim(p_email)) not between 3 and 254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_level not in ('A0','A1','A2','A3','A4','A5','A6') or length(p_position)>80 then raise exception 'Dados do convite inválidos.';end if;
 select coalesce((select level_code from public.eg_organization_assignments where workspace_id=p_workspace and user_id=auth.uid()),case when evergreen_private.admin_of(p_workspace) then 'A0' else 'A5' end) into own_level;
 if p_level<own_level then raise exception 'Não é permitido delegar um nível superior ao seu.' using errcode='42501';end if;
 if p_department is not null and not exists(select 1 from public.eg_departments where id=p_department and workspace_id=p_workspace) then raise exception 'Departamento de outra empresa.';end if;
 perform 1 from public.eg_workspaces where id=p_workspace for update;
 select * into inv from public.eg_invites where created_by=auth.uid() and request_id=p_request;
 if inv.id is not null then
 if inv.workspace_id<>p_workspace or lower(inv.email)<>lower(trim(p_email)) or inv.proposed_level<>p_level or inv.proposed_position<>p_position or inv.department_id is distinct from p_department then raise exception 'Identificador de solicitação reutilizado com outros dados.';end if;
 return to_jsonb(inv);end if;
 if exists(select 1 from public.eg_members m join auth.users u on u.id=m.user_id where m.workspace_id=p_workspace and lower(u.email)=lower(trim(p_email))) then raise exception 'Esta pessoa já participa da empresa.';end if;
 select * into inv from public.eg_invites where workspace_id=p_workspace and lower(email)=lower(trim(p_email)) and status in ('pending','sent','delivery_failed') and expires_at>now() limit 1;
 if inv.id is not null then
 if inv.proposed_level<>p_level or inv.proposed_position<>p_position or inv.department_id is distinct from p_department then raise exception 'Há outro convite com permissões diferentes. Cancele-o antes de criar outro.';end if;
 return to_jsonb(inv);end if;
 insert into public.eg_invites(workspace_id,email,proposed_level,proposed_position,department_id,request_id) values(p_workspace,lower(trim(p_email)),p_level,trim(p_position),p_department,p_request) returning * into inv;
 return to_jsonb(inv);
end $$;
revoke all on function public.eg_create_company_invite(uuid,text,text,text,uuid,uuid) from public,anon;
grant execute on function public.eg_create_company_invite(uuid,text,text,text,uuid,uuid) to authenticated;

create function public.eg_company_invite_action(p_invite uuid,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare inv public.eg_invites;old_status text;new_member uuid;begin
 if not evergreen_private.live_session() or auth.uid() is null or evergreen_private.verified_email(auth.uid()) is null then raise exception 'Confirme seu e-mail para continuar.' using errcode='42501';end if;
 select * into inv from public.eg_invites where id=p_invite for update;
 if inv.id is null then raise exception 'Convite indisponível.' using errcode='42501';end if;
 if p_action in ('accept','decline') then
 if lower(inv.email) is distinct from evergreen_private.verified_email(auth.uid()) then raise exception 'Convite destinado a outra pessoa.' using errcode='42501';end if;
 else
 if not evergreen_private.os_can(inv.workspace_id,'members.manage') then raise exception 'Sem permissão para gerenciar este convite.' using errcode='42501';end if;
 end if;
 if inv.status='accepted' then
 if p_action='accept' and inv.accepted_by=auth.uid() then return jsonb_build_object('status','accepted','workspace_id',inv.workspace_id);end if;
 raise exception 'Convite já aceito.';end if;
 if p_action in ('accept','decline') and inv.status in ('declined','cancelled','expired') then return jsonb_build_object('status',inv.status);end if;
 if inv.expires_at<=now() and p_action in ('accept','decline') then
 update public.eg_invites set status='expired',resolved_at=now() where id=inv.id returning * into inv;perform evergreen_private.invitation_event(inv,'expired');return jsonb_build_object('status','expired');end if;
 if p_action='accept' then
 insert into public.eg_members(workspace_id,user_id,role,display_name) values(inv.workspace_id,auth.uid(),'member',coalesce((select display_name from public.eg_profiles where id=auth.uid()),'Membro')) on conflict do nothing returning user_id into new_member;
 if new_member is null then raise exception 'A associação já existe; peça ao administrador para revisar o acesso.';end if;
 perform evergreen_private.os_seed_levels(inv.workspace_id);
 if inv.proposed_level<>'A5' then insert into public.eg_organization_assignments(workspace_id,user_id,level_code,assigned_by) values(inv.workspace_id,auth.uid(),inv.proposed_level,inv.created_by) on conflict(workspace_id,user_id) do update set level_code=excluded.level_code,assigned_by=excluded.assigned_by;end if;
 if inv.proposed_position<>'' then insert into public.eg_professional_roles(workspace_id,user_id,relationship,executive_position,updated_by) values(inv.workspace_id,auth.uid(),'member',inv.proposed_position,inv.created_by) on conflict(workspace_id,user_id) do update set executive_position=excluded.executive_position;end if;
 if inv.department_id is not null then insert into public.eg_department_members values(inv.workspace_id,inv.department_id,auth.uid()) on conflict do nothing;end if;
 insert into public.eg_channel_members select id,auth.uid() from public.eg_channels where workspace_id=inv.workspace_id and not is_private on conflict do nothing;
 update public.eg_invites set status='accepted',accepted_by=auth.uid(),resolved_at=now() where id=inv.id returning * into inv;
 perform evergreen_private.invitation_event(inv,'accepted');
 elsif p_action='decline' then
 update public.eg_invites set status='declined',resolved_at=now() where id=inv.id returning * into inv;perform evergreen_private.invitation_event(inv,'declined');
 elsif p_action='cancel' then
 if inv.status='cancelled' then return jsonb_build_object('status','cancelled');end if;
 update public.eg_invites set status='cancelled',resolved_at=now() where id=inv.id returning * into inv;perform evergreen_private.invitation_event(inv,'cancelled');
 elsif p_action='resend' then
 if inv.created_at>now()-interval '1 minute' then raise exception 'Aguarde um minuto para reenviar.';end if;
 update public.eg_invites set status='pending',delivery_status='pending',token=gen_random_uuid(),expires_at=now()+interval '7 days',created_at=now(),resolved_at=null,revision=revision+1 where id=inv.id returning * into inv;
 perform evergreen_private.invitation_event(inv,'created');insert into public.eg_invitation_deliveries(invitation_id,revision,payload) values(inv.id,inv.revision,jsonb_build_object('email',inv.email,'token',inv.token,'company',(select name from public.eg_workspaces where id=inv.workspace_id),'inviter',(select display_name from public.eg_profiles where id=inv.created_by)));perform evergreen_private.invitation_event(inv,'delivery_requested');
 else raise exception 'Operação de convite inválida.';end if;
 return jsonb_build_object('status',inv.status,'workspace_id',inv.workspace_id);
end $$;
revoke all on function public.eg_company_invite_action(uuid,text) from public,anon;
grant execute on function public.eg_company_invite_action(uuid,text) to authenticated;
create or replace function evergreen_private.accept_invite(p_token uuid) returns uuid language plpgsql security definer set search_path='' as $$declare i uuid;result jsonb;begin
 select id into i from public.eg_invites where token=p_token;
 result:=public.eg_company_invite_action(i,'accept');
 if result->>'status'<>'accepted' then raise exception 'Convite inválido, expirado ou encerrado.';end if;
 return (result->>'workspace_id')::uuid;
end $$;

create function public.eg_company_invites_snapshot(p_workspace uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare inv public.eg_invites;recipient_email text:=evergreen_private.verified_email(auth.uid());begin
 if not evergreen_private.live_session() or auth.uid() is null then raise exception 'Entre para consultar convites.' using errcode='42501';end if;
 for inv in select * from public.eg_invites i where i.expires_at<=now() and i.status in ('pending','sent','delivery_failed') and (i.created_by=auth.uid() or lower(i.email)=recipient_email or (p_workspace=i.workspace_id and evergreen_private.os_can(i.workspace_id,'members.manage'))) for update loop
 update public.eg_invites set status='expired',resolved_at=now() where id=inv.id returning * into inv;perform evergreen_private.invitation_event(inv,'expired');end loop;
 -- A newly verified account claims notifications for invitations created before signup.
 insert into public.eg_notifications(workspace_id,recipient_id,type,title,body,category,resource_id,data,dedupe_key)
 select i.workspace_id,auth.uid(),'invitation.received','Você recebeu um convite','Você foi convidado para '||w.name||'.','invitations',i.id,jsonb_build_object('invitation_id',i.id,'workspace_id',i.workspace_id),'invitation:'||i.id||':'||i.revision||':created:'||auth.uid()
 from public.eg_invites i join public.eg_workspaces w on w.id=i.workspace_id where lower(i.email)=recipient_email and i.status in ('pending','sent','delivery_failed') and i.expires_at>now() on conflict(dedupe_key) do nothing;
 return jsonb_build_object('received',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'workspace_id',i.workspace_id,'company',w.name,'inviter',p.display_name,'status',i.status,'level',i.proposed_level,'position',i.proposed_position,'expires_at',i.expires_at)) from public.eg_invites i join public.eg_workspaces w on w.id=i.workspace_id left join public.eg_profiles p on p.id=i.created_by where lower(i.email)=recipient_email and i.status in ('pending','sent','delivery_failed') and i.expires_at>now()),'[]'::jsonb),
 'sent',case when p_workspace is not null and evergreen_private.os_can(p_workspace,'members.manage') then coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc nulls last) from (select * from public.eg_invites where workspace_id=p_workspace order by created_at desc nulls last limit 200)i),'[]'::jsonb) else '[]'::jsonb end);
end $$;
revoke all on function public.eg_company_invites_snapshot(uuid) from public,anon;
grant execute on function public.eg_company_invites_snapshot(uuid) to authenticated;

create function public.eg_company_people(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not evergreen_private.member_of(p_workspace) then raise exception 'Equipe não autorizada.' using errcode='42501';end if;
 return jsonb_build_object('can_manage',evergreen_private.os_can(p_workspace,'members.manage'),
 'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.display_name,'position',coalesce(nullif(r.executive_position,''),p.job_title),'relationship',r.relationship,'role',m.role,'suspended',m.suspended_at is not null,'level',coalesce(a.level_code,case when m.role='owner' then 'A0' when m.role='admin' then 'A1' else 'A5' end),'departments',(select coalesce(jsonb_agg(dm.department_id),'[]'::jsonb) from public.eg_department_members dm where dm.workspace_id=p_workspace and dm.user_id=m.user_id))) from public.eg_members m join public.eg_profiles p on p.id=m.user_id left join public.eg_professional_roles r on r.workspace_id=m.workspace_id and r.user_id=m.user_id left join public.eg_organization_assignments a on a.workspace_id=m.workspace_id and a.user_id=m.user_id where m.workspace_id=p_workspace),'[]'::jsonb),
 'departments',coalesce((select jsonb_agg(to_jsonb(d)) from public.eg_departments d where d.workspace_id=p_workspace),'[]'::jsonb),
 'resources',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'kind',r.kind,'departments',(select coalesce(jsonb_agg(dr.department_id),'[]'::jsonb) from public.eg_department_resources dr where dr.record_id=r.id))) from public.eg_records r where r.workspace_id=p_workspace and r.kind in ('project','objective') and r.archived_at is null),'[]'::jsonb));
end $$;
revoke all on function public.eg_company_people(uuid) from public,anon;
grant execute on function public.eg_company_people(uuid) to authenticated;
create function public.eg_company_people_action(p_workspace uuid,p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=(p_data->>'user_id')::uuid;d uuid:=(p_data->>'department_id')::uuid;r uuid:=(p_data->>'record_id')::uuid;result uuid;begin
 if not evergreen_private.os_can(p_workspace,'members.manage') then raise exception 'Administração de equipe não autorizada.' using errcode='42501';end if;
 if p_action='department' then
 if p_data->>'name' is null then raise exception 'Informe o nome do departamento.';end if;
 insert into public.eg_departments(workspace_id,name,description,lead_id) values(p_workspace,trim(p_data->>'name'),coalesce(p_data->>'description',''),u) returning id into result;
 elsif p_action in ('department_member','department_remove','department_lead','resource','resource_remove') then
 if not exists(select 1 from public.eg_departments where id=d and workspace_id=p_workspace) then raise exception 'Departamento não autorizado.' using errcode='42501';end if;
 if p_action in ('department_member','department_remove','department_lead') and not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=u and suspended_at is null) then raise exception 'Pessoa não associada à empresa.';end if;
 if p_action='department_member' then insert into public.eg_department_members values(p_workspace,d,u) on conflict do nothing;
 elsif p_action='department_remove' then delete from public.eg_department_members where department_id=d and user_id=u;
 elsif p_action='department_lead' then update public.eg_departments set lead_id=u where id=d;
 else
 if not exists(select 1 from public.eg_records where id=r and workspace_id=p_workspace and kind in ('project','objective')) then raise exception 'Projeto ou objetivo não autorizado.';end if;
 if p_action='resource' then insert into public.eg_department_resources values(p_workspace,d,r) on conflict do nothing;else delete from public.eg_department_resources where department_id=d and record_id=r;end if;
 end if;result:=d;
 elsif p_action='position' then
 if not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=u) then raise exception 'Pessoa não associada à empresa.';end if;
 insert into public.eg_professional_roles(workspace_id,user_id,relationship,executive_position,updated_by) values(p_workspace,u,'member',trim(p_data->>'position'),auth.uid()) on conflict(workspace_id,user_id) do update set executive_position=excluded.executive_position,updated_by=excluded.updated_by,updated_at=now();result:=u;
 elsif p_action in ('suspend','restore','revoke') then
 perform 1 from public.eg_members where workspace_id=p_workspace and user_id=u for update;
 if u=auth.uid() or exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=u and role='owner') or exists(select 1 from public.eg_professional_roles where workspace_id=p_workspace and user_id=u and relationship in ('founder','partner')) then raise exception 'Não é permitido remover a si próprio ou um vínculo protegido por governança.' using errcode='42501';end if;
 if not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=u) then raise exception 'Pessoa não associada.';end if;
 if p_action='revoke' then perform public.eg_manage_member(p_workspace,u,'remove');
 else update public.eg_members set suspended_at=case when p_action='suspend' then now() else null end where workspace_id=p_workspace and user_id=u;end if;result:=u;
 else raise exception 'Operação de equipe inválida.';end if;
 insert into public.eg_os_audit(workspace_id,action,details) values(p_workspace,'people.'||p_action,p_data);
 return result;
end $$;
revoke all on function public.eg_company_people_action(uuid,text,jsonb) from public,anon;
grant execute on function public.eg_company_people_action(uuid,text,jsonb) to authenticated;

create function public.eg_claim_invitation_deliveries(p_limit integer default 2) returns jsonb language plpgsql security definer set search_path='' as $$
declare inv public.eg_invites;result jsonb;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Servidor requerido.' using errcode='42501';end if;
 for inv in select * from public.eg_invites where expires_at<=now() and status in ('pending','sent','delivery_failed') for update skip locked loop
 update public.eg_invites set status='expired',resolved_at=now() where id=inv.id returning * into inv;perform evergreen_private.invitation_event(inv,'expired');end loop;
 with due as (select q.id from public.eg_invitation_deliveries q join public.eg_invites i on i.id=q.invitation_id where q.sent_at is null and q.attempts<5 and (q.attempts=0 or q.first_attempt_at>now()-interval '23 hours') and q.available_at<=now() and (q.claimed_at is null or q.claimed_at<now()-interval '5 minutes') and i.revision=q.revision and i.status in ('pending','delivery_failed') and i.expires_at>now() and not exists(select 1 from auth.users u join public.eg_profiles p on p.id=u.id where lower(u.email)=lower(i.email) and p.preferences->'notify_invitation_email'='false'::jsonb) order by q.available_at for update of q skip locked limit greatest(1,least(p_limit,5))),
 claimed as(update public.eg_invitation_deliveries q set claimed_at=now(),first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1,lease_id=gen_random_uuid() from due where q.id=due.id returning q.*)
 select coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('email',q.payload->>'email','token',q.payload->>'token','company',q.payload->>'company','inviter',q.payload->>'inviter')),'[]'::jsonb) into result from claimed q join public.eg_invites i on i.id=q.invitation_id join public.eg_workspaces w on w.id=i.workspace_id left join public.eg_profiles p on p.id=i.created_by;
 return result;
end $$;
create function public.eg_complete_invitation_delivery(p_job uuid,p_lease uuid,p_provider text default null) returns void language plpgsql security definer set search_path='' as $$
declare job public.eg_invitation_deliveries;inv public.eg_invites;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Servidor requerido.' using errcode='42501';end if;
 select * into job from public.eg_invitation_deliveries where id=p_job for update;
 if job.id is null or job.lease_id is distinct from p_lease then raise exception 'Reserva de envio inválida.';end if;
 if job.sent_at is not null then return;end if;
 select * into inv from public.eg_invites where id=job.invitation_id for update;
 if inv.revision<>job.revision or inv.status not in ('pending','delivery_failed') or inv.expires_at<=now() then update public.eg_invitation_deliveries set sent_at=now(),last_error='INVITATION_CLOSED' where id=job.id;return;end if;
 if nullif(trim(p_provider),'') is not null then
 update public.eg_invitation_deliveries set sent_at=now(),provider_id=p_provider,last_error=null where id=job.id;
 update public.eg_invites set status='sent',delivery_status='sent' where id=inv.id returning * into inv;perform evergreen_private.invitation_event(inv,'sent');
 else
 update public.eg_invitation_deliveries set claimed_at=null,last_error='PROVIDER_NOT_CONFIRMED',available_at=now()+interval '10 minutes' where id=job.id;
 update public.eg_invites set status='delivery_failed',delivery_status='failed' where id=inv.id returning * into inv;perform evergreen_private.invitation_event(inv,'delivery_failed');end if;
end $$;
revoke all on function public.eg_claim_invitation_deliveries(integer),public.eg_complete_invitation_delivery(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.eg_claim_invitation_deliveries(integer),public.eg_complete_invitation_delivery(uuid,uuid,text) to service_role;
create or replace function public.eg_identity_context() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('active',evergreen_private.live_session(),'recent_auth',evergreen_private.recent_auth(),'session_id',auth.jwt()->>'session_id',
 'password_recovery',evergreen_private.live_session() and exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a where a->>'method'='recovery' and (a->>'timestamp')~'^[0-9]+$' and to_timestamp((a->>'timestamp')::numeric) between now()-interval '5 minutes' and now()+interval '30 seconds'),
 'profile',(select jsonb_build_object('display_name',display_name,'job_title',job_title)from public.eg_profiles where id=auth.uid() and evergreen_private.live_session()),
 'workspaces',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'role',m.role)order by w.created_at)from public.eg_members m join public.eg_workspaces w on w.id=m.workspace_id where m.user_id=auth.uid() and m.suspended_at is null and evergreen_private.live_session()),'[]'::jsonb));
$$;

create function public.eg_expire_company_invites() returns integer language plpgsql security definer set search_path='' as $$declare inv public.eg_invites;n integer:=0;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Servidor requerido.' using errcode='42501';end if;
 for inv in select * from public.eg_invites where expires_at<=now() and status in ('pending','sent','delivery_failed') for update skip locked loop
 update public.eg_invites set status='expired',resolved_at=now() where id=inv.id returning * into inv;perform evergreen_private.invitation_event(inv,'expired');n:=n+1;end loop;return n;
end $$;
revoke all on function public.eg_expire_company_invites() from public,anon,authenticated;
grant execute on function public.eg_expire_company_invites() to service_role;
-- Restrictive session gates for newly added exposed tables, matching the existing schema.
do $$declare t text;begin
 foreach t in array array['eg_departments','eg_department_members','eg_department_resources','eg_invitation_events'] loop
 execute format('create policy eg_live_session on public.%I as restrictive for all to authenticated using(evergreen_private.live_session()) with check(evergreen_private.live_session())',t);
 end loop;
end $$;

create index eg_department_members_workspace on public.eg_department_members(workspace_id,user_id);
create index eg_department_resources_record on public.eg_department_resources(record_id);
create index eg_invitation_events_workspace on public.eg_invitation_events(workspace_id,created_at desc);
create index eg_invitation_events_invite on public.eg_invitation_events(invitation_id);
create function evergreen_private.protected_company_member() returns trigger language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is not null and (TG_OP='DELETE' or (TG_OP='UPDATE' and old.suspended_at is null and new.suspended_at is not null)) and (old.user_id=auth.uid() or old.role='owner' or exists(select 1 from public.eg_professional_roles where workspace_id=old.workspace_id and user_id=old.user_id and relationship in ('founder','partner'))) then raise exception 'Vínculo protegido: utilize a governança autorizada.' using errcode='42501';end if;
 if TG_OP='DELETE' then update public.eg_departments set lead_id=null where workspace_id=old.workspace_id and lead_id=old.user_id;return old;end if;return new;
end $$;
revoke all on function evergreen_private.protected_company_member() from public,anon,authenticated;
create trigger eg_protected_company_member before delete or update on public.eg_members for each row execute function evergreen_private.protected_company_member();
create function public.eg_founder_council_memberships(p_workspace uuid,p_user uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not evergreen_private.member_of(p_workspace) or not exists(select 1 from public.eg_members where workspace_id=p_workspace and user_id=p_user) then raise exception 'Perfil não autorizado.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('group_id',g.id,'name',g.name,'position',s.position)) from public.eg_founder_seats s join public.eg_councils c on c.id=s.council_id join public.eg_groups g on g.id=c.group_id where s.user_id=p_user and s.accepted_at is not null and evergreen_private.os_group_member(g.id)),'[]'::jsonb);
end $$;
revoke all on function public.eg_founder_council_memberships(uuid,uuid) from public,anon;
grant execute on function public.eg_founder_council_memberships(uuid,uuid) to authenticated;
commit;
