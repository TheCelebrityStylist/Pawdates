-- ════════════════════════════════════════════════════════════════════════════
-- 0018 — Daily-use mechanics: per-meal feeding log + daily-mood observation tags.
-- Depends on 0016/0017. Fully idempotent. Household-scoped RLS, same convention.
-- ════════════════════════════════════════════════════════════════════════════
begin;

-- Per-meal feeding log. One row per (pet, meal slot, day) — the unique index is
-- the anti-double-feeding guard a multi-person household needs. fed_by records
-- WHO fed (like routine_checks.checked_by); user_id stays the owner (scope key).
create table if not exists feeding_log(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  fed_at timestamptz not null default now(),
  fed_by text not null check(length(fed_by) between 1 and 120),
  meal_time_slot text not null check(length(meal_time_slot) between 1 and 20),
  fed_for_date date not null default current_date,
  notes text check(length(notes)<=300),
  created_at timestamptz not null default now(),
  unique(pet_id,meal_time_slot,fed_for_date)
);
create index if not exists feeding_log_pet on feeding_log(pet_id,fed_for_date desc);
create index if not exists feeding_log_user on feeding_log(user_id);

alter table feeding_log enable row level security;
drop policy if exists feeding_log_select on feeding_log;
create policy feeding_log_select on feeding_log for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists feeding_log_insert on feeding_log;
create policy feeding_log_insert on feeding_log for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists feeding_log_delete on feeding_log;
create policy feeding_log_delete on feeding_log for delete using(user_id=any(select household_write_scope(auth.uid())));

-- Daily-mood observation tags, extending the existing observation_log so a month
-- of quick daily taps becomes real material for the vet views (which already
-- render observation_log). Find and drop the existing tag CHECK by definition
-- (its name may be auto-generated), then re-add the widened one.
do $$ declare c text;
begin
  select conname into c from pg_constraint
   where conrelid='public.observation_log'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%tag%'
   limit 1;
  if c is not null then execute 'alter table observation_log drop constraint '||quote_ident(c); end if;
end $$;
alter table observation_log add constraint observation_log_tag_check
  check(tag in ('scratching','limping','off_food','great_energy','other','bright_day','quiet_day','off_day'));

commit;
notify pgrst, 'reload schema';
