-- Proposed production data change, separate from the schema migration.
-- Explicit user facts: Davy founded Orkto, is a ThinkerChess partner and original Evergreen founder.
-- Administrative workspace ownership is an access responsibility, not a claim of founding the business.
-- Miguel's account is deliberately NOT guessed or created.
begin;
do $$
declare person uuid;holding uuid;orkto uuid;thinker uuid;channel uuid;person_name text;
begin
 select u.id,p.display_name into person,person_name from auth.users u join public.eg_profiles p on p.id=u.id
 where lower(u.email)='peixotodavy831@gmail.com' and u.email_confirmed_at is not null;
 if person is null then raise exception 'Conta confirmada de Davy não encontrada.';end if;
 select id into strict holding from public.eg_groups where owner_id=person and name='Evergreen Holdings';
 perform pg_advisory_xact_lock(hashtextextended(holding::text||':company-identities',0));
 select w.id into strict orkto from public.eg_workspaces w join public.eg_group_companies c on c.workspace_id=w.id
 where c.group_id=holding and lower(w.name)='orkto';
 select w.id into thinker from public.eg_workspaces w join public.eg_group_companies c on c.workspace_id=w.id
 where c.group_id=holding and lower(replace(w.name,' ',''))='thinkerchess';
 if thinker is null then
  if exists(select 1 from public.eg_workspaces where lower(replace(name,' ',''))='thinkerchess') then raise exception 'ThinkerChess já existe fora desta holding; revisão manual necessária.';end if;
  insert into public.eg_workspaces(name,owner_id) values('ThinkerChess',person) returning id into thinker;
  insert into public.eg_members(workspace_id,user_id,role,display_name) values(thinker,person,'owner',person_name);
  insert into public.eg_channels(workspace_id,name,is_private) values(thinker,'geral',false) returning id into channel;
  insert into public.eg_channel_members(channel_id,user_id) values(channel,person);
  insert into public.eg_group_companies(group_id,workspace_id) values(holding,thinker);
  insert into public.eg_group_scopes(group_id,user_id,workspace_id,capabilities) values(holding,person,thinker,array['overview','companies','finance','people','projects','intelligence','decisions','documents']);
 end if;
 if not exists(select 1 from public.eg_members where workspace_id=thinker and user_id=person) then raise exception 'Vínculo operacional de Davy precisa ser revisado.';end if;
 insert into public.eg_professional_roles(workspace_id,user_id,relationship,updated_by) values(orkto,person,'founder',person),(thinker,person,'partner',person)
 on conflict(workspace_id,user_id) do update set relationship=excluded.relationship,updated_by=excluded.updated_by,updated_at=now();
 insert into public.eg_original_founders(group_id,user_id,declared_by) values(holding,person,person) on conflict do nothing;
 insert into public.eg_founder_nominees(group_id,display_name,declared_by) values(holding,'Miguel Mármore',person),(holding,'Gabriel',person) on conflict(group_id,display_name) do nothing;
 insert into public.eg_group_audit(group_id,actor_id,action,details) values(holding,person,'profile.explicit_identity_setup',jsonb_build_object('companies',jsonb_build_array(orkto,thinker),'miguel','pending confirmed account'));
end $$;
commit;
