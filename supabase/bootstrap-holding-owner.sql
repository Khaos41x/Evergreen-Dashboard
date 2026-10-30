-- Administrative, explicit owner bootstrap requested by the confirmed account holder.
-- Run only in dedicated Evergreen dlxsakabwtpdimolsmgd; never creates an Auth account or alters a password.
begin;
do $$
declare person uuid;v_group uuid;private_space uuid;private_channel uuid;company record;profile_name text;
caps text[]:=array['overview','companies','finance','people','projects','intelligence','decisions','communication','governance','documents'];
scope_caps text[]:=array['overview','companies','finance','people','projects','intelligence','decisions','documents'];
begin
 select id into person from auth.users where lower(email)='peixotodavy831@gmail.com'and email_confirmed_at is not null;
 if person is null then raise exception 'Conta confirmada do responsável não encontrada; nada alterado.';end if;
 select display_name into profile_name from public.eg_profiles where id=person;
 if profile_name is null then insert into public.eg_profiles(id,display_name)values(person,'Davy')returning display_name into profile_name;end if;
 select id into v_group from public.eg_groups where owner_id=person and name='Evergreen Holdings'order by created_at limit 1;
 if v_group is null then
  insert into public.eg_workspaces(name,owner_id)values('Evergreen · Fundadores',person)returning id into private_space;
  insert into public.eg_members values(private_space,person,'owner',profile_name);
  insert into public.eg_channels(workspace_id,name,is_private)values(private_space,'fundadores',true)returning id into private_channel;
  insert into public.eg_channel_members values(private_channel,person);
  insert into public.eg_groups(name,owner_id,communication_workspace,channel_id)values('Evergreen Holdings',person,private_space,private_channel)returning id into v_group;
 end if;
 insert into public.eg_group_members values(v_group,person,'group_owner',caps)on conflict(group_id,user_id)do update set role='group_owner',capabilities=excluded.capabilities;
 for company in select w.id from public.eg_workspaces w join public.eg_members m on m.workspace_id=w.id and m.user_id=person and m.role='owner'
  where w.owner_id=person and not exists(select 1 from public.eg_groups g where g.communication_workspace=w.id)
  and not exists(select 1 from public.eg_group_spaces gs where gs.workspace_id=w.id)
  and not exists(select 1 from public.eg_group_companies c where c.workspace_id=w.id and c.group_id<>v_group)
 loop
  insert into public.eg_group_companies values(v_group,company.id)on conflict do nothing;
  insert into public.eg_group_scopes values(v_group,person,company.id,scope_caps)on conflict(group_id,user_id,workspace_id)do update set capabilities=excluded.capabilities;
  insert into public.eg_fin_members(company_id,user_id,role)select c.id,person,'admin'from public.eg_fin_companies c where c.workspace_id=company.id on conflict(company_id,user_id)do update set role='admin';
 end loop;
 perform evergreen_private.sync_founder_chat(v_group,person);
 insert into public.eg_group_audit(group_id,actor_id,action,details)values(v_group,person,'owner.explicit_bootstrap',jsonb_build_object('email','peixotodavy831@gmail.com','source','explicit_account_holder_request'));
end $$;
commit;
