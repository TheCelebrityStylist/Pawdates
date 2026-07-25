begin;

create table if not exists household_members(
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users on delete cascade,
  member_user_id uuid references auth.users on delete cascade,
  invited_email text check(length(invited_email)<=200),
  role text not null check(role in ('carer','view')),
  invite_token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check(status in ('pending','active','revoked')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);
create unique index if not exists household_members_invite_token on household_members(invite_token);
create index if not exists household_members_owner on household_members(owner_user_id);
create index if not exists household_members_member on household_members(member_user_id);

alter table household_members enable row level security;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='household_members' and policyname='household_owner_manage') then
    create policy household_owner_manage on household_members for all using(auth.uid()=owner_user_id) with check(auth.uid()=owner_user_id);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='household_members' and policyname='household_member_read') then
    create policy household_member_read on household_members for select using(auth.uid()=member_user_id);
  end if;
end $$;

-- Every table an owner's pet-care data lives in is scoped by user_id. These
-- two functions expand "my own id" into "my id, plus any owner whose
-- household I've actively joined" (read scope), and the write-capable
-- subset of that (carer role only). RLS policies use these instead of a
-- flat auth.uid()=user_id check.
create or replace function household_read_scope(p_uid uuid) returns setof uuid
language sql stable security definer set search_path=public as $$
  select p_uid
  union
  select owner_user_id from household_members where member_user_id=p_uid and status='active'
$$;

create or replace function household_write_scope(p_uid uuid) returns setof uuid
language sql stable security definer set search_path=public as $$
  select p_uid
  union
  select owner_user_id from household_members where member_user_id=p_uid and status='active' and role='carer'
$$;

create or replace function redeem_household_invite(p_token uuid) returns void
language plpgsql security definer set search_path=public as $$
declare inv household_members;
begin
  select * into inv from household_members where invite_token=p_token and status='pending';
  if not found then raise exception 'invite not found or already used'; end if;
  if inv.owner_user_id=auth.uid() then raise exception 'cannot join your own household'; end if;
  update household_members set member_user_id=auth.uid(),status='active',redeemed_at=now() where id=inv.id;
end$$;

commit;
