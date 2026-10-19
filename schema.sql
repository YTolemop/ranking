-- Run once in the Supabase SQL Editor. This script does not grant an admin.
begin;
create schema if not exists bracket_private;
revoke all on schema bracket_private from public, anon, authenticated;
create table if not exists bracket_private.administrators (
  user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on bracket_private.administrators from public, anon, authenticated;
alter table bracket_private.administrators enable row level security;

create table if not exists public.bracket_tournament (
  id integer primary key check (id=1),
  payload jsonb not null,
  revision bigint not null check (revision>0),
  updated_at timestamptz not null default now(),
  constraint bracket_payload_size check (octet_length(payload::text)<=200000)
);
alter table public.bracket_tournament enable row level security;
revoke all on public.bracket_tournament from public, anon, authenticated;
grant select on public.bracket_tournament to anon, authenticated;
drop policy if exists bracket_public_read on public.bracket_tournament;
create policy bracket_public_read on public.bracket_tournament for select to anon, authenticated using (true);

create or replace function public.bracket_is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from bracket_private.administrators where user_id=(select auth.uid())); $$;
revoke all on function public.bracket_is_admin() from public, anon, authenticated;
grant execute on function public.bracket_is_admin() to anon, authenticated;

create or replace function public.bracket_save(new_payload jsonb, expected_revision bigint)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare current_revision bigint; next_revision bigint;
begin
  if not public.bracket_is_admin() then
    raise exception 'Administrator required' using errcode='42501';
  end if;
  if expected_revision is null or expected_revision<0 then raise exception 'Invalid revision'; end if;
  if new_payload is null or jsonb_typeof(new_payload)<>'object'
    or new_payload->>'version' is distinct from '1'
    or jsonb_typeof(new_payload->'slots') is distinct from 'array'
    or jsonb_typeof(new_payload->'picks') is distinct from 'object'
    or jsonb_typeof(new_payload->'title') is distinct from 'string'
    or length(new_payload->>'title')>80
    or jsonb_typeof(new_payload->'n') is distinct from 'number'
    or (new_payload->>'n')::integer not between 2 and 128
    or octet_length(new_payload::text)>200000 then raise exception 'Invalid tournament'; end if;
  -- Serialize writes, including the first insert, then reject stale tabs.
  perform pg_advisory_xact_lock(78264019);
  select revision into current_revision from public.bracket_tournament where id=1;
  if coalesce(current_revision,0)<>expected_revision then
    raise exception 'The tournament changed on another device' using errcode='40001';
  end if;
  next_revision:=coalesce(current_revision,0)+1;
  insert into public.bracket_tournament(id,payload,revision,updated_at)
  values(1,new_payload,next_revision,now())
  on conflict(id) do update set payload=excluded.payload,revision=excluded.revision,updated_at=excluded.updated_at;
  return next_revision;
end; $$;
revoke all on function public.bracket_save(jsonb,bigint) from public, anon, authenticated;
grant execute on function public.bracket_save(jsonb,bigint) to authenticated;
commit;

-- After creating your own user in Authentication > Users, grant that user only:
-- insert into bracket_private.administrators(user_id)
-- select id from auth.users where lower(email)=lower('YOUR_ADMIN_EMAIL');
