begin;
create table public.eg_mobile_devices (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 token_hash text not null unique,token_cipher text not null,platform text not null check(platform in ('android','ios')),
 session_id uuid not null,enabled boolean not null default true,updated_at timestamptz not null default now()
);
create index eg_mobile_devices_user on public.eg_mobile_devices(user_id) where enabled;
create table public.eg_push_deliveries (
 id uuid primary key default gen_random_uuid(),notification_id uuid not null references public.eg_notifications on delete cascade,
 device_id uuid not null references public.eg_mobile_devices on delete cascade,attempts int not null default 0,
 available_at timestamptz not null default now(),claimed_at timestamptz,sent_at timestamptz,last_error text,
 unique(notification_id,device_id)
);
create index eg_push_due on public.eg_push_deliveries(available_at) where sent_at is null;
alter table public.eg_mobile_devices enable row level security;
alter table public.eg_push_deliveries enable row level security;
revoke all on public.eg_mobile_devices,public.eg_push_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.eg_mobile_devices,public.eg_push_deliveries to service_role;
create policy service_devices on public.eg_mobile_devices to service_role using(true) with check(true);
create policy service_deliveries on public.eg_push_deliveries to service_role using(true) with check(true);
create function evergreen_private.enqueue_mobile_push() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.eg_push_deliveries(notification_id,device_id) select new.id,d.id from public.eg_mobile_devices d where d.user_id=new.recipient_id and d.enabled on conflict do nothing;return new;
end $$;
revoke all on function evergreen_private.enqueue_mobile_push() from public,anon,authenticated;
create trigger enqueue_mobile_push after insert on public.eg_notifications for each row execute function evergreen_private.enqueue_mobile_push();
create function public.eg_claim_mobile_push(p_limit integer default 10) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if current_user<>'postgres' and session_user<>'postgres' and coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Servidor requerido.' using errcode='42501';end if;
 with due as (select q.id from public.eg_push_deliveries q where q.sent_at is null and q.attempts<5 and q.available_at<=now() and (q.claimed_at is null or q.claimed_at<now()-interval '5 minutes') order by q.available_at for update skip locked limit greatest(1,least(p_limit,20))), claimed as (update public.eg_push_deliveries q set claimed_at=now(),attempts=q.attempts+1 from due where q.id=due.id returning q.*)
 select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) into result from claimed c;return result;
end $$;
revoke all on function public.eg_claim_mobile_push(integer) from public,anon,authenticated;
grant execute on function public.eg_claim_mobile_push(integer) to service_role;
create function public.eg_push_session_active(p_session uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from auth.sessions where id=p_session and user_id=p_user and (not_after is null or not_after>now()))$$;
revoke all on function public.eg_push_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.eg_push_session_active(uuid,uuid) to service_role;
commit;
