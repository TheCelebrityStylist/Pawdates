begin;

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
  house_access_shared boolean not null default false,
  live_checkoff_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

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

alter table pet_profile enable row level security;
alter table routine_items enable row level security;
alter table routine_checks enable row level security;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='pet_profile' and policyname='own_pet_profile') then create policy own_pet_profile on pet_profile for all using(auth.uid()=user_id) with check(auth.uid()=user_id); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='routine_items' and policyname='own_routine_items') then create policy own_routine_items on routine_items for all using(auth.uid()=user_id) with check(auth.uid()=user_id); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='routine_checks' and policyname='own_routine_checks') then create policy own_routine_checks on routine_checks for select using(exists(select 1 from routine_items i where i.id=routine_item_id and i.user_id=auth.uid())); end if;
end $$;

commit;
