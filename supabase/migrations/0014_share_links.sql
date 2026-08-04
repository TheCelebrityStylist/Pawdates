begin;

-- Scoped, expiring share links — supersedes the single boolean share_token /
-- vet_share_token toggles on pets. One pet can now have any number of links,
-- each with its own scope, optional expiry, and its own view/access history,
-- and each can be revoked independently without touching the others.
--
--   scope 'sitter'  — day-to-day handover: essentials, feeding, today's routine,
--                     next medication, vet/emergency contact, forbidden foods.
--                     No financials, no full medical history, no house-access secrets.
--   scope 'medical' — clinical view: identity, owner-recorded medical history,
--                     treatment record, weight history, observations. No expenses,
--                     no insurance policy numbers, no house access.
--   scope 'full'    — the whole record a sitter/medical link shows, combined.
--                     Still never exposes house-access secrets (those stay behind
--                     the owner's separate house_access_shared toggle on pet_profile).
create table if not exists share_links(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,   -- owner of the record; RLS scope key, matches every other table
  created_by uuid references auth.users on delete set null,        -- which household member minted this link
  token uuid not null default gen_random_uuid(),
  scope text not null check(scope in ('full','medical','sitter')),
  label text check(length(label)<=80),
  expires_at timestamptz,
  revoked_at timestamptz,
  view_count int not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists share_links_token on share_links(token);
create index if not exists share_links_pet on share_links(pet_id,created_at desc);
create index if not exists share_links_user on share_links(user_id);

create table if not exists share_link_access_log(
  id bigint generated always as identity primary key,
  share_link_id uuid not null references share_links on delete cascade,
  accessed_at timestamptz not null default now(),
  ip text,
  user_agent text
);
create index if not exists share_link_access_log_link on share_link_access_log(share_link_id,accessed_at desc);

alter table share_links enable row level security;
alter table share_link_access_log enable row level security;

-- Same household-scope convention as pets/treatments/etc. (see 0011/0012):
-- owner and active carers can read and manage; a viewer can read.
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='share_links' and policyname='share_links_select') then
    create policy share_links_select on share_links for select using(user_id=any(select household_read_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='share_links' and policyname='share_links_insert') then
    create policy share_links_insert on share_links for insert with check(user_id=any(select household_write_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='share_links' and policyname='share_links_update') then
    create policy share_links_update on share_links for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='share_links' and policyname='share_links_delete') then
    create policy share_links_delete on share_links for delete using(user_id=any(select household_write_scope(auth.uid())));
  end if;
  -- Access log is readable by the owning household (drives the "N views" dashboard).
  -- Writes only ever happen through record_share_access() below (service-role / definer),
  -- never directly from a session, so there is deliberately no insert policy.
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='share_link_access_log' and policyname='share_link_access_log_select') then
    create policy share_link_access_log_select on share_link_access_log for select using(exists(select 1 from share_links l where l.id=share_link_id and l.user_id=any(select household_read_scope(auth.uid()))));
  end if;
end $$;

-- Called from the public (logged-out) recipient view via the service-role client.
-- Records one access and bumps the view counter atomically. Silently no-ops for an
-- unknown token so a bad/expired link can't be used to probe which tokens exist.
-- It intentionally does NOT check expiry/revocation — the page decides what to
-- render; this only logs that the link was opened.
create or replace function record_share_access(p_token uuid,p_ip text,p_ua text) returns void
language plpgsql security definer set search_path=public as $$
declare l share_links;
begin
  select * into l from share_links where token=p_token;
  if not found then return; end if;
  update share_links set view_count=view_count+1,last_viewed_at=now() where id=l.id;
  insert into share_link_access_log(share_link_id,ip,user_agent) values(l.id,left(p_ip,80),left(p_ua,300));
end$$;

commit;
notify pgrst, 'reload schema';
