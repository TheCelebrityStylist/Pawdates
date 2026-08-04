-- ════════════════════════════════════════════════════════════════════════════
-- 0017 — Daily-care layer: expenses + nutrition_plans + grooming_schedule.
-- Depends on 0016 (household scope functions, pet-documents bucket). Fully
-- idempotent. Grooming reuses the treatments reminder engine — same generated
-- next_due column pattern — and rides the same due_reminder_digest pipeline
-- (extended below via UNION) rather than being a second reminder system.
-- ════════════════════════════════════════════════════════════════════════════
begin;

-- 1. Expenses ledger --------------------------------------------------------
create table if not exists expenses(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  category text not null check(category in ('vet','food','grooming','insurance','supplies','other')),
  amount_cents int not null check(amount_cents>=0),
  currency text not null default 'EUR' check(currency ~ '^[A-Z]{3}$'),
  spent_on date not null,
  notes text check(length(notes)<=500),
  receipt_path text check(length(receipt_path)<=400),   -- object key in the private pet-documents bucket
  created_at timestamptz not null default now()
);
create index if not exists expenses_pet on expenses(pet_id,spent_on desc);
create index if not exists expenses_user on expenses(user_id);

-- 2. Nutrition plan (one current plan per pet) ------------------------------
create table if not exists nutrition_plans(
  pet_id uuid primary key references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  food_brand text check(length(food_brand)<=160),
  food_type text check(length(food_type)<=120),
  portion text check(length(portion)<=120),
  meals_per_day int check(meals_per_day between 0 and 12),
  feeding_times text[] not null default '{}',
  dietary_restrictions text check(length(dietary_restrictions)<=1000),
  notes text check(length(notes)<=1000),
  updated_at timestamptz not null default now()
);
create index if not exists nutrition_plans_user on nutrition_plans(user_id);

-- 3. Grooming schedule (mirrors the treatments due-date engine) --------------
do $$ begin create type grooming_task as enum ('bath','nail_trim','teeth_cleaning','haircut','ear_cleaning','other'); exception when duplicate_object then null; end $$;
create table if not exists grooming_schedule(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  task grooming_task not null,
  label text check(length(label)<=120),
  frequency_days int not null check(frequency_days between 1 and 1095),
  last_done date,
  next_due date generated always as (last_done + frequency_days) stored,   -- same pattern as treatments.next_due
  notes text check(length(notes)<=500),
  created_at timestamptz not null default now()
);
create index if not exists grooming_schedule_pet on grooming_schedule(pet_id);
create index if not exists grooming_schedule_due on grooming_schedule(next_due);
create index if not exists grooming_schedule_user on grooming_schedule(user_id);

alter table expenses enable row level security;
alter table nutrition_plans enable row level security;
alter table grooming_schedule enable row level security;

-- Household-scoped RLS (identical convention to every other table).
drop policy if exists expenses_select on expenses;
create policy expenses_select on expenses for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists expenses_insert on expenses;
create policy expenses_insert on expenses for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists expenses_update on expenses;
create policy expenses_update on expenses for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists expenses_delete on expenses;
create policy expenses_delete on expenses for delete using(user_id=any(select household_write_scope(auth.uid())));

drop policy if exists nutrition_plans_select on nutrition_plans;
create policy nutrition_plans_select on nutrition_plans for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists nutrition_plans_insert on nutrition_plans;
create policy nutrition_plans_insert on nutrition_plans for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists nutrition_plans_update on nutrition_plans;
create policy nutrition_plans_update on nutrition_plans for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists nutrition_plans_delete on nutrition_plans;
create policy nutrition_plans_delete on nutrition_plans for delete using(user_id=any(select household_write_scope(auth.uid())));

drop policy if exists grooming_schedule_select on grooming_schedule;
create policy grooming_schedule_select on grooming_schedule for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists grooming_schedule_insert on grooming_schedule;
create policy grooming_schedule_insert on grooming_schedule for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists grooming_schedule_update on grooming_schedule;
create policy grooming_schedule_update on grooming_schedule for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists grooming_schedule_delete on grooming_schedule;
create policy grooming_schedule_delete on grooming_schedule for delete using(user_id=any(select household_write_scope(auth.uid())));

-- ── Reminder engine reuse: extend the existing digest with grooming ─────────
-- Preserves the treatments behaviour exactly (same item shape, same lead-day
-- filter) and UNIONs in grooming tasks whose next_due lands on a lead day, so
-- grooming reminders flow through the very same daily email with no cron change.
create or replace function due_reminder_digest(p_today date) returns table(user_id uuid,email text,items jsonb)
language sql security definer set search_path=public as $$
  select p.user_id,p.email,jsonb_agg(x.item)
  from profiles p
  join (
    select t.user_id as uid,
           jsonb_build_object('pet_name',pet.name,'name',t.name,'product_name',t.product_name,'days',t.next_due-p_today) as item,
           t.next_due as nd
    from treatments t join pets pet on pet.id=t.pet_id
    union all
    select g.user_id,
           jsonb_build_object('pet_name',pet.name,'name',coalesce(nullif(g.label,''),initcap(replace(g.task::text,'_',' '))),'product_name',null,'days',g.next_due-p_today) as item,
           g.next_due as nd
    from grooming_schedule g join pets pet on pet.id=g.pet_id
  ) x on x.uid=p.user_id
  where p.email_reminders_enabled and ((x.nd-p_today)=any(p.reminder_leads) or x.nd-p_today=-2)
  group by p.user_id,p.email
$$;

-- ── Backfills (idempotent) ──────────────────────────────────────────────────
-- Nutrition out of pet_profile.feeding JSONB (the existing feeding data). The
-- care-profile editor still writes feeding for the sitter timeline; nutrition_plans
-- becomes the canonical nutrition record and the recipient view prefers it.
insert into nutrition_plans(pet_id,user_id,food_brand,food_type,portion,meals_per_day,feeding_times)
select pp.pet_id,pp.user_id,
  nullif(pp.feeding->>'brand',''),
  nullif(pp.feeding->>'product',''),
  nullif(pp.feeding->>'amountPerMeal',''),
  case when (pp.feeding->>'mealsPerDay') ~ '^\d+$' then (pp.feeding->>'mealsPerDay')::int else null end,
  case when jsonb_typeof(pp.feeding->'feedingTimes')='array'
       then array(select jsonb_array_elements_text(pp.feeding->'feedingTimes')) else '{}' end
from pet_profile pp
where (
  coalesce(pp.feeding->>'brand','')<>'' or coalesce(pp.feeding->>'product','')<>'' or
  coalesce(pp.feeding->>'amountPerMeal','')<>'' or jsonb_typeof(pp.feeding->'feedingTimes')='array'
)
and not exists(select 1 from nutrition_plans np where np.pet_id=pp.pet_id);

-- Grooming out of pets.grooming_interval_days + the free-text pet_profile.toilet_hygiene.grooming note.
insert into grooming_schedule(pet_id,user_id,task,label,frequency_days,notes)
select p.id,p.user_id,'other'::grooming_task,'Grooming',p.grooming_interval_days,
  nullif((select pp.toilet_hygiene->>'grooming' from pet_profile pp where pp.pet_id=p.id),'')
from pets p
where p.grooming_interval_days is not null and p.grooming_interval_days>0
and not exists(select 1 from grooming_schedule g where g.pet_id=p.id);

commit;
notify pgrst, 'reload schema';
