begin;

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

alter table pet_profile add column if not exists medical jsonb not null default '{}';

alter table treatments add column if not exists cost_cents int check(cost_cents>=0);

create table if not exists observation_log(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  tag text not null check(tag in ('scratching','limping','off_food','great_energy','other')),
  note text check(length(note)<=500),
  photo_path text,
  created_at timestamptz not null default now()
);
create index if not exists observation_log_pet on observation_log(pet_id,created_at desc);
alter table observation_log enable row level security;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='observation_log' and policyname='own_observation_log') then create policy own_observation_log on observation_log for all using(auth.uid()=user_id) with check(auth.uid()=user_id); end if;
end $$;

commit;
