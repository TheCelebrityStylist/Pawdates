-- ════════════════════════════════════════════════════════════════════════════
-- 0016 — Consolidated, idempotent catch-up: 0005 → 0015 in one safe script.
--
-- Why this exists: the live database was never brought up through the tracked
-- migration files (there is no migration-tracking table in this repo, and
-- applying 0014 failed with "function household_read_scope(uuid) does not exist"
-- — proof that 0011, which defines those functions, was never applied). The core
-- schema from 0001/0004 (profiles, pets, treatments, treatment_log, vet_visits,
-- app_events, …) IS present, because the production app uses it every day. This
-- script replays everything from 0005 onward, with every statement guarded
-- (create ... if not exists / add column if not exists / create or replace /
-- drop policy if exists then create / exception-trapped enum creation) so it
-- succeeds whether a given piece already exists or not. Run THIS ONE script in
-- the Supabase SQL editor — do not also run 0011–0015 separately.
-- ════════════════════════════════════════════════════════════════════════════
begin;

create extension if not exists pgcrypto;

-- ── Prerequisite feature tables & columns (0002, 0005–0009) ─────────────────
-- Core tables (pets, treatments, treatment_log, vet_visits, app_events) are
-- assumed to exist. Everything the household RLS + life-admin layers depend on
-- is (re)created here idempotently.

-- vet_visits (0001) — recreated defensively; it is referenced by 0012 policies.
create table if not exists vet_visits(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  reason text not null,
  notes text,
  cost_cents int check(cost_cents>=0)
);

-- weight_log (0002)
create table if not exists weight_log(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  recorded_at date not null default current_date,
  weight_kg numeric not null check(weight_kg>0),
  unique(pet_id,recorded_at)
);
create index if not exists weight_log_pet_date on weight_log(pet_id,recorded_at desc);
create index if not exists visits_pet_date on vet_visits(pet_id,date desc);

-- pets: sharing tokens (0005/0009) + full-record identity/insurance columns (0008)
alter table pets add column if not exists share_token uuid not null default gen_random_uuid();
alter table pets add column if not exists share_enabled boolean not null default false;
alter table pets add column if not exists vet_share_token uuid not null default gen_random_uuid();
alter table pets add column if not exists vet_share_enabled boolean not null default false;
create unique index if not exists pets_share_token on pets(share_token);
create unique index if not exists pets_vet_share_token on pets(vet_share_token);
alter table pets add column if not exists sex text check(sex in ('male','female','unknown')) not null default 'unknown';
alter table pets add column if not exists neutered boolean;
alter table pets add column if not exists microchip_number text check(length(microchip_number)<=40);
alter table pets add column if not exists microchip_registry text check(length(microchip_registry)<=120);
alter table pets add column if not exists passport_number text check(length(passport_number)<=60);
alter table pets add column if not exists colour_markings text check(length(colour_markings)<=200);
alter table pets add column if not exists insurance_provider text check(length(insurance_provider)<=120);
alter table pets add column if not exists insurance_policy text check(length(insurance_policy)<=120);
alter table pets add column if not exists origin text check(length(origin)<=200);
alter table pets add column if not exists height_cm numeric check(height_cm>0);
alter table pets add column if not exists body_condition text check(length(body_condition)<=200);
alter table pets add column if not exists coat_type text check(length(coat_type)<=120);
alter table pets add column if not exists grooming_interval_days int check(grooming_interval_days>0);
alter table pets add column if not exists rabies_vaccinated_at date;

-- treatments cost (0008); treatment_log capture columns (0007/0012)
alter table treatments add column if not exists cost_cents int check(cost_cents>=0);
alter table treatment_log add column if not exists was_overdue boolean;
alter table treatment_log add column if not exists actor_user_id uuid references auth.users;

-- care profile (0006) + medical JSONB (0008)
create table if not exists pet_profile(
  pet_id uuid primary key references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  essentials_flag text check(length(essentials_flag)<=280),
  forbidden_foods text[] not null default '{}',
  feeding jsonb not null default '{}',
  routine_notes jsonb not null default '{}',
  toilet_hygiene jsonb not null default '{}',
  behaviour jsonb not null default '{}',
  house_logistics jsonb not null default '{}',
  house_access jsonb not null default '{}',
  play_enrichment jsonb not null default '{}',
  medical jsonb not null default '{}',
  house_access_shared boolean not null default false,
  live_checkoff_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table pet_profile add column if not exists medical jsonb not null default '{}';

create table if not exists routine_items(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  time text not null check(time~'^([01]\d|2[0-3]):[0-5]\d$'),
  label text not null check(length(label) between 1 and 120),
  category text not null check(category in ('wake','meal','walk','play','nap','medication','bedtime','other')),
  sitter_can_check boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists routine_checks(
  id uuid primary key default gen_random_uuid(),
  routine_item_id uuid not null references routine_items on delete cascade,
  pet_id uuid not null references pets on delete cascade,
  checked_for_date date not null default current_date,
  checked_at timestamptz not null default now(),
  checked_by text not null check(length(checked_by) between 1 and 60),
  unique(routine_item_id,checked_for_date)
);
create index if not exists routine_items_pet on routine_items(pet_id,sort_order);
create index if not exists routine_checks_item on routine_checks(routine_item_id,checked_for_date);

-- observation log (0008)
create table if not exists observation_log(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  tag text not null check(tag in ('scratching','limping','off_food','great_energy','other')),
  note text check(length(note)<=500),
  photo_path text,
  actor_user_id uuid references auth.users,
  created_at timestamptz not null default now()
);
create index if not exists observation_log_pet on observation_log(pet_id,created_at desc);

-- ── Household layer (0011): table FIRST, then the scope functions ───────────
-- The scope functions are `language sql` and reference household_members, so the
-- table must exist before they are (re)created or creation would fail to parse.
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

-- ── Milestones (0013) ───────────────────────────────────────────────────────
create table if not exists milestones(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  actor_user_id uuid references auth.users,
  title text not null check(length(title) between 1 and 120),
  note text check(length(note)<=500),
  photo_path text,
  occurred_on date not null,
  created_at timestamptz not null default now()
);
create index if not exists milestones_pet on milestones(pet_id,occurred_on desc);

-- ── Scoped share links (0014) ───────────────────────────────────────────────
create table if not exists share_links(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_by uuid references auth.users on delete set null,
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

create or replace function record_share_access(p_token uuid,p_ip text,p_ua text) returns void
language plpgsql security definer set search_path=public as $$
declare l share_links;
begin
  select * into l from share_links where token=p_token;
  if not found then return; end if;
  update share_links set view_count=view_count+1,last_viewed_at=now() where id=l.id;
  insert into share_link_access_log(share_link_id,ip,user_agent) values(l.id,left(p_ip,80),left(p_ua,300));
end$$;

-- ── Life-admin layer (0015) ─────────────────────────────────────────────────
do $$ begin create type provider_type as enum ('vet','groomer','sitter','walker','boarding','other'); exception when duplicate_object then null; end $$;

create table if not exists insurance_policies(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  provider text not null check(length(provider) between 1 and 160),
  policy_number text check(length(policy_number)<=120),
  coverage_summary text check(length(coverage_summary)<=1000),
  renewal_date date,
  file_path text check(length(file_path)<=400),
  notes text check(length(notes)<=1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists insurance_policies_pet on insurance_policies(pet_id,created_at desc);
create index if not exists insurance_policies_user on insurance_policies(user_id);
create index if not exists insurance_policies_renewal on insurance_policies(renewal_date);

create table if not exists providers(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  type provider_type not null,
  name text not null check(length(name) between 1 and 160),
  phone text check(length(phone)<=60),
  email text check(length(email)<=200),
  notes text check(length(notes)<=1000),
  created_at timestamptz not null default now()
);
create index if not exists providers_pet on providers(pet_id,type);
create index if not exists providers_user on providers(user_id);

create table if not exists emergency_info(
  pet_id uuid primary key references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  emergency_contact_name text check(length(emergency_contact_name)<=160),
  emergency_contact_phone text check(length(emergency_contact_phone)<=60),
  vet_name text check(length(vet_name)<=160),
  vet_phone text check(length(vet_phone)<=60),
  care_instructions text check(length(care_instructions)<=2000),
  updated_at timestamptz not null default now()
);
create index if not exists emergency_info_user on emergency_info(user_id);

-- ── Enable RLS everywhere (idempotent; closes the hole if it was ever off) ───
alter table vet_visits enable row level security;
alter table weight_log enable row level security;
alter table pet_profile enable row level security;
alter table routine_items enable row level security;
alter table routine_checks enable row level security;
alter table observation_log enable row level security;
alter table household_members enable row level security;
alter table milestones enable row level security;
alter table share_links enable row level security;
alter table share_link_access_log enable row level security;
alter table insurance_policies enable row level security;
alter table providers enable row level security;
alter table emergency_info enable row level security;
do $$ begin
  execute 'alter table pets enable row level security';
  execute 'alter table treatments enable row level security';
  execute 'alter table treatment_log enable row level security';
exception when undefined_table then null; end $$;

-- ── Policies: drop-then-create so this is fully idempotent AND replaces the ──
-- legacy own_* single-owner policies with the household-scoped ones.
-- Retire legacy names first.
drop policy if exists own_pets on pets;
drop policy if exists own_treatments on treatments;
drop policy if exists own_logs on treatment_log;
drop policy if exists own_visits on vet_visits;
drop policy if exists own_weight_log on weight_log;
drop policy if exists own_pet_profile on pet_profile;
drop policy if exists own_routine_items on routine_items;
drop policy if exists own_routine_checks on routine_checks;
drop policy if exists own_observation_log on observation_log;

-- household_members
drop policy if exists household_owner_manage on household_members;
create policy household_owner_manage on household_members for all using(auth.uid()=owner_user_id) with check(auth.uid()=owner_user_id);
drop policy if exists household_member_read on household_members;
create policy household_member_read on household_members for select using(auth.uid()=member_user_id);

-- pets
drop policy if exists pets_select on pets;
create policy pets_select on pets for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists pets_insert on pets;
create policy pets_insert on pets for insert with check(auth.uid()=user_id);
drop policy if exists pets_update on pets;
create policy pets_update on pets for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists pets_delete on pets;
create policy pets_delete on pets for delete using(auth.uid()=user_id);

-- treatments
drop policy if exists treatments_select on treatments;
create policy treatments_select on treatments for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists treatments_insert on treatments;
create policy treatments_insert on treatments for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists treatments_update on treatments;
create policy treatments_update on treatments for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists treatments_delete on treatments;
create policy treatments_delete on treatments for delete using(user_id=any(select household_write_scope(auth.uid())));

-- treatment_log
drop policy if exists treatment_log_select on treatment_log;
create policy treatment_log_select on treatment_log for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists treatment_log_insert on treatment_log;
create policy treatment_log_insert on treatment_log for insert with check(user_id=any(select household_write_scope(auth.uid())));

-- vet_visits
drop policy if exists vet_visits_select on vet_visits;
create policy vet_visits_select on vet_visits for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists vet_visits_insert on vet_visits;
create policy vet_visits_insert on vet_visits for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists vet_visits_update on vet_visits;
create policy vet_visits_update on vet_visits for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists vet_visits_delete on vet_visits;
create policy vet_visits_delete on vet_visits for delete using(user_id=any(select household_write_scope(auth.uid())));

-- weight_log
drop policy if exists weight_log_select on weight_log;
create policy weight_log_select on weight_log for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists weight_log_insert on weight_log;
create policy weight_log_insert on weight_log for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists weight_log_update on weight_log;
create policy weight_log_update on weight_log for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists weight_log_delete on weight_log;
create policy weight_log_delete on weight_log for delete using(user_id=any(select household_write_scope(auth.uid())));

-- pet_profile
drop policy if exists pet_profile_select on pet_profile;
create policy pet_profile_select on pet_profile for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists pet_profile_insert on pet_profile;
create policy pet_profile_insert on pet_profile for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists pet_profile_update on pet_profile;
create policy pet_profile_update on pet_profile for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists pet_profile_delete on pet_profile;
create policy pet_profile_delete on pet_profile for delete using(user_id=any(select household_write_scope(auth.uid())));

-- routine_items
drop policy if exists routine_items_select on routine_items;
create policy routine_items_select on routine_items for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists routine_items_insert on routine_items;
create policy routine_items_insert on routine_items for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists routine_items_update on routine_items;
create policy routine_items_update on routine_items for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists routine_items_delete on routine_items;
create policy routine_items_delete on routine_items for delete using(user_id=any(select household_write_scope(auth.uid())));

-- routine_checks (select only; owner/household read via the parent item)
drop policy if exists routine_checks_select on routine_checks;
create policy routine_checks_select on routine_checks for select using(exists(select 1 from routine_items i where i.id=routine_item_id and i.user_id=any(select household_read_scope(auth.uid()))));

-- observation_log
drop policy if exists observation_log_select on observation_log;
create policy observation_log_select on observation_log for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists observation_log_insert on observation_log;
create policy observation_log_insert on observation_log for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists observation_log_delete on observation_log;
create policy observation_log_delete on observation_log for delete using(user_id=any(select household_write_scope(auth.uid())));

-- milestones
drop policy if exists milestones_select on milestones;
create policy milestones_select on milestones for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists milestones_insert on milestones;
create policy milestones_insert on milestones for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists milestones_update on milestones;
create policy milestones_update on milestones for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists milestones_delete on milestones;
create policy milestones_delete on milestones for delete using(user_id=any(select household_write_scope(auth.uid())));

-- share_links
drop policy if exists share_links_select on share_links;
create policy share_links_select on share_links for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists share_links_insert on share_links;
create policy share_links_insert on share_links for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists share_links_update on share_links;
create policy share_links_update on share_links for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists share_links_delete on share_links;
create policy share_links_delete on share_links for delete using(user_id=any(select household_write_scope(auth.uid())));

-- share_link_access_log (read for the owning household; writes only via record_share_access)
drop policy if exists share_link_access_log_select on share_link_access_log;
create policy share_link_access_log_select on share_link_access_log for select using(exists(select 1 from share_links l where l.id=share_link_id and l.user_id=any(select household_read_scope(auth.uid()))));

-- insurance_policies
drop policy if exists insurance_policies_select on insurance_policies;
create policy insurance_policies_select on insurance_policies for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists insurance_policies_insert on insurance_policies;
create policy insurance_policies_insert on insurance_policies for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists insurance_policies_update on insurance_policies;
create policy insurance_policies_update on insurance_policies for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists insurance_policies_delete on insurance_policies;
create policy insurance_policies_delete on insurance_policies for delete using(user_id=any(select household_write_scope(auth.uid())));

-- providers
drop policy if exists providers_select on providers;
create policy providers_select on providers for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists providers_insert on providers;
create policy providers_insert on providers for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists providers_update on providers;
create policy providers_update on providers for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists providers_delete on providers;
create policy providers_delete on providers for delete using(user_id=any(select household_write_scope(auth.uid())));

-- emergency_info
drop policy if exists emergency_info_select on emergency_info;
create policy emergency_info_select on emergency_info for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists emergency_info_insert on emergency_info;
create policy emergency_info_insert on emergency_info for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists emergency_info_update on emergency_info;
create policy emergency_info_update on emergency_info for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists emergency_info_delete on emergency_info;
create policy emergency_info_delete on emergency_info for delete using(user_id=any(select household_write_scope(auth.uid())));

-- ── mark_treatment_done (0012 household-aware version) ──────────────────────
create or replace function mark_treatment_done(p_treatment_id uuid,p_done_at timestamptz) returns void language plpgsql security invoker set search_path=public as $$
declare p treatments;
begin
  select * into p from treatments where id=p_treatment_id and user_id=any(select household_write_scope(auth.uid()));
  if not found then raise exception 'not found'; end if;
  insert into treatment_log(treatment_id,user_id,done_at,given_product,was_overdue,actor_user_id) values(p.id,p.user_id,p_done_at,p.product_name,p_done_at::date>p.next_due,auth.uid());
  update treatments set last_given=p_done_at::date where id=p.id;
  insert into app_events(user_id,name) values(auth.uid(),'marked_done');
end$$;

-- ── Storage buckets + owner-scoped policies (0007 public photos, 0015 private docs) ──
insert into storage.buckets (id,name,public) values ('pet-photos','pet-photos',true) on conflict (id) do nothing;
insert into storage.buckets (id,name,public) values ('pet-documents','pet-documents',false) on conflict (id) do nothing;

drop policy if exists pet_photos_owner_write on storage.objects;
create policy pet_photos_owner_write on storage.objects for insert with check(bucket_id='pet-photos' and auth.uid()::text=(storage.foldername(name))[1]);
drop policy if exists pet_photos_owner_update on storage.objects;
create policy pet_photos_owner_update on storage.objects for update using(bucket_id='pet-photos' and auth.uid()::text=(storage.foldername(name))[1]);
drop policy if exists pet_photos_owner_delete on storage.objects;
create policy pet_photos_owner_delete on storage.objects for delete using(bucket_id='pet-photos' and auth.uid()::text=(storage.foldername(name))[1]);

drop policy if exists pet_documents_owner_read on storage.objects;
create policy pet_documents_owner_read on storage.objects for select using(bucket_id='pet-documents' and auth.uid()::text=(storage.foldername(name))[1]);
drop policy if exists pet_documents_owner_write on storage.objects;
create policy pet_documents_owner_write on storage.objects for insert with check(bucket_id='pet-documents' and auth.uid()::text=(storage.foldername(name))[1]);
drop policy if exists pet_documents_owner_update on storage.objects;
create policy pet_documents_owner_update on storage.objects for update using(bucket_id='pet-documents' and auth.uid()::text=(storage.foldername(name))[1]);
drop policy if exists pet_documents_owner_delete on storage.objects;
create policy pet_documents_owner_delete on storage.objects for delete using(bucket_id='pet-documents' and auth.uid()::text=(storage.foldername(name))[1]);

-- ── Backfills (idempotent) ──────────────────────────────────────────────────
-- Insurance out of the deprecated pets.insurance_* columns.
insert into insurance_policies(pet_id,user_id,provider,policy_number)
select p.id,p.user_id,coalesce(nullif(p.insurance_provider,''),'Insurance'),nullif(p.insurance_policy,'')
from pets p
where (coalesce(p.insurance_provider,'')<>'' or coalesce(p.insurance_policy,'')<>'')
  and not exists(select 1 from insurance_policies ip where ip.pet_id=p.id);

-- Emergency vet + backup contact out of pet_profile JSONB.
insert into emergency_info(pet_id,user_id,emergency_contact_name,emergency_contact_phone,vet_name,vet_phone)
select pp.pet_id,pp.user_id,
  nullif(pp.house_access->>'backupContactName',''),
  nullif(pp.house_access->>'backupContactPhone',''),
  coalesce(nullif(pp.medical->>'emergencyVetName',''),nullif(pp.house_logistics->>'vetName','')),
  coalesce(nullif(pp.medical->>'emergencyVetPhone',''),nullif(pp.house_logistics->>'vetPhone',''))
from pet_profile pp
where (
  coalesce(pp.house_access->>'backupContactName','')<>'' or
  coalesce(pp.house_access->>'backupContactPhone','')<>'' or
  coalesce(pp.medical->>'emergencyVetName','')<>'' or
  coalesce(pp.house_logistics->>'vetName','')<>'' or
  coalesce(pp.medical->>'emergencyVetPhone','')<>'' or
  coalesce(pp.house_logistics->>'vetPhone','')<>''
)
and not exists(select 1 from emergency_info ei where ei.pet_id=pp.pet_id);

commit;
notify pgrst, 'reload schema';
