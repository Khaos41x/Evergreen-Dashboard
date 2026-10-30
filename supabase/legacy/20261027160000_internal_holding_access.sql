-- Internal holding: no open registration or outsider workspace bootstrap.
-- Apply after establishing the holding's designated owner and initial workspace.
-- Existing users/data remain intact. This does not identify staff by email domain.
begin;

do $$ begin
 if not exists(select 1 from public.eg_members m join auth.users u on u.id=m.user_id where m.role='owner' and u.email_confirmed_at is not null) then
  raise exception 'Defina o responsável inicial da holding e seu workspace antes de restringir o acesso.';
 end if;
end $$;

create function evergreen_private.require_staff_invite() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 -- Metadata is only a submitted token; authorization comes from the trusted row.
 -- A forged role/company flag or an email domain alone never grants access.
 if not exists(
  select 1 from public.eg_invites i
  where i.token::text=new.raw_user_meta_data->>'evergreen_invite'
    and lower(trim(i.email))=lower(trim(new.email))
    and i.accepted_by is null and i.expires_at>now()
 ) then
  raise exception 'O Evergreen é interno. É necessário um convite válido para este e-mail.' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function evergreen_private.require_staff_invite() from public,anon,authenticated;
create trigger eg_staff_invitation_before_signup before insert on auth.users
 for each row execute function evergreen_private.require_staff_invite();

create or replace function evergreen_private.create_workspace(p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare w uuid; c uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.eg_members where user_id=auth.uid() and role='owner') then
  raise exception 'Apenas responsáveis autorizados da holding podem criar novos espaços.' using errcode='42501';
 end if;
 insert into public.eg_workspaces(name,owner_id) values(trim(p_name),auth.uid()) returning id into w;
 insert into public.eg_members values(w,auth.uid(),'owner',coalesce((select display_name from public.eg_profiles where id=auth.uid()),'Membro'));
 insert into public.eg_channels(workspace_id,name) values(w,'geral') returning id into c;
 insert into public.eg_channel_members values(c,auth.uid());
 return w;
end $$;

comment on function evergreen_private.require_staff_invite() is 'Holding registration guard. Requires an unexpired invitation bound to email; acceptance still requires confirmed email.';
commit;
