-- Run manually in the dedicated Evergreen project's SQL Editor, after review.
-- NOT a migration. Do not add this file to migrations or run against another project.
-- First provision the confirmed Auth account through Supabase's administrative UI.
-- No password is stored here. This script does not create Auth users or send email.
begin;
do $$
declare owner_user uuid; workspace uuid; general_channel uuid;
begin
 select id into owner_user from auth.users
 where lower(email)='peixotodavy831@gmail.com' and email_confirmed_at is not null;
 if owner_user is null then
  raise exception 'Primeiro crie e confirme a conta peixotodavy831@gmail.com no Auth do projeto Evergreen. Nenhum dado foi alterado.';
 end if;
 insert into public.eg_profiles(id,display_name) values(owner_user,'Responsável da holding') on conflict(id) do nothing;
 select id into workspace from public.eg_workspaces where owner_id=owner_user and name='Holding' order by created_at limit 1;
 if workspace is null then
  insert into public.eg_workspaces(name,owner_id) values('Holding',owner_user) returning id into workspace;
 end if;
 insert into public.eg_members(workspace_id,user_id,role,display_name)
 select workspace,owner_user,'owner',display_name from public.eg_profiles where id=owner_user
 on conflict(workspace_id,user_id) do update set role='owner';
 select id into general_channel from public.eg_channels where workspace_id=workspace and name='geral';
 if general_channel is null then
  insert into public.eg_channels(workspace_id,name,is_private) values(workspace,'geral',false) returning id into general_channel;
 end if;
 insert into public.eg_channel_members(channel_id,user_id) values(general_channel,owner_user) on conflict do nothing;
end $$;
commit;
