begin;
create table evergreen_private.server_proofs(name text primary key,sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'));
create table evergreen_private.rate_buckets(key text primary key,started_at timestamptz not null,hits bigint not null check(hits>0));
create index eg_rate_buckets_started on evergreen_private.rate_buckets(started_at);
alter table evergreen_private.server_proofs enable row level security;
alter table evergreen_private.rate_buckets enable row level security;
revoke all on evergreen_private.server_proofs,evergreen_private.rate_buckets from public,anon,authenticated;
-- Deliberate pre-login API. A random server-only proof is required before accessing counters.
create function public.eg_server_rate_limit(p_key text,p_limit integer,p_window integer,p_proof text)returns bigint
language plpgsql security definer set search_path=''as $$
declare bucket timestamptz;counted bigint;begin
 if length(p_proof)<>43 or not exists(select 1 from evergreen_private.server_proofs where name='rate_limit'and sha256=encode(pg_catalog.sha256(convert_to(p_proof,'UTF8')),'hex'))then raise exception 'Servidor não autorizado.'using errcode='42501';end if;
 if p_key !~ '^eg:identity:[a-z0-9_/-]+:[a-f0-9]{64}$'or length(p_key)>256 or p_limit not between 1 and 1000 or p_window<>300 then raise exception 'Limite inválido.';end if;
 bucket:=to_timestamp(floor(extract(epoch from statement_timestamp())/p_window)*p_window);
 insert into evergreen_private.rate_buckets(key,started_at,hits)values(p_key,bucket,1)
 on conflict(key)do update set hits=case when rate_buckets.started_at=excluded.started_at then rate_buckets.hits+1 else 1 end,started_at=excluded.started_at
 returning hits into counted;
 -- Bounded cleanup of expired technical counters; no business records are touched.
 delete from evergreen_private.rate_buckets where key in(select key from evergreen_private.rate_buckets where started_at<statement_timestamp()-interval '1 day'order by started_at limit 500);
 return counted;
end $$;
revoke all on function public.eg_server_rate_limit(text,integer,integer,text)from public,anon,authenticated;
grant execute on function public.eg_server_rate_limit(text,integer,integer,text)to anon,authenticated;
commit;
