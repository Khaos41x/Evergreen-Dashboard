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
