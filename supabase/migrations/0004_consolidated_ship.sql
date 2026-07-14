begin;
create extension if not exists pgcrypto;
do $$ begin create type pet_species as enum ('dog','cat','rabbit','bird','reptile','other'); exception when duplicate_object then null; end $$;
alter type pet_species add value if not exists 'reptile';
do $$ begin create type treatment_type as enum ('flea_tick','worming','heartworm','vaccination','medication','grooming','vet_checkup','other'); exception when duplicate_object then null; end $$;

create table if not exists profiles(user_id uuid primary key references auth.users on delete cascade,email text not null,is_premium boolean not null default false,stripe_customer_id text,stripe_subscription_id text,premium_until timestamptz,reminder_leads int[] not null default '{3,0}',email_reminders_enabled boolean not null default true,ical_token uuid not null default gen_random_uuid(),created_at timestamptz not null default now());
create table if not exists pets(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,name text not null check(length(name) between 1 and 60),species pet_species not null,photo_path text,birth_date date,weight_kg numeric check(weight_kg>0),created_at timestamptz not null default now());
create table if not exists treatments(id uuid primary key default gen_random_uuid(),pet_id uuid not null references pets on delete cascade,user_id uuid not null references auth.users on delete cascade,name text not null,type treatment_type not null,last_given date not null,interval_days int not null check(interval_days between 1 and 1095),dose_note text,product_name text,product_photo_path text,notes text,next_due date generated always as (last_given+interval_days) stored,created_at timestamptz not null default now());
create table if not exists treatment_log(id uuid primary key default gen_random_uuid(),treatment_id uuid not null references treatments on delete cascade,user_id uuid not null references auth.users on delete cascade,done_at timestamptz not null default now(),given_product text);
create table if not exists vet_visits(id uuid primary key default gen_random_uuid(),pet_id uuid not null references pets on delete cascade,user_id uuid not null references auth.users on delete cascade,date date not null,reason text not null,notes text,cost_cents int check(cost_cents>=0));
create table if not exists email_events(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,sent_at timestamptz not null default now(),type text not null,payload jsonb not null default '{}',dedupe_key text);
create table if not exists stripe_events(id text primary key,processed_at timestamptz not null default now());
create table if not exists app_events(id bigint generated always as identity primary key,user_id uuid references auth.users on delete set null,name text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now());
create table if not exists weight_log(id uuid primary key default gen_random_uuid(),pet_id uuid not null references pets on delete cascade,user_id uuid not null references auth.users on delete cascade,recorded_at date not null default current_date,weight_kg numeric not null check(weight_kg>0),unique(pet_id,recorded_at));

alter table profiles add column if not exists ical_token uuid not null default gen_random_uuid();
alter table treatments add column if not exists dose_note text;
alter table email_events add column if not exists dedupe_key text;
alter table app_events add column if not exists metadata jsonb not null default '{}';
update email_events set dedupe_key=user_id::text||':'||type where dedupe_key is null;
create unique index if not exists email_events_dedupe on email_events(dedupe_key) where dedupe_key is not null;
create index if not exists treatment_due on treatments(next_due);create index if not exists pets_user on pets(user_id);create index if not exists weight_log_pet_date on weight_log(pet_id,recorded_at desc);create index if not exists visits_pet_date on vet_visits(pet_id,date desc);create index if not exists app_events_name_created on app_events(name,created_at);

alter table profiles enable row level security;alter table pets enable row level security;alter table treatments enable row level security;alter table treatment_log enable row level security;alter table vet_visits enable row level security;alter table email_events enable row level security;alter table app_events enable row level security;alter table weight_log enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='own_profiles') then create policy own_profiles on profiles for all using(auth.uid()=user_id) with check(auth.uid()=user_id); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='pets' and policyname='own_pets') then create policy own_pets on pets for all using(auth.uid()=user_id) with check(auth.uid()=user_id); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='treatments' and policyname='own_treatments') then create policy own_treatments on treatments for all using(auth.uid()=user_id) with check(auth.uid()=user_id); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='treatment_log' and policyname='own_logs') then create policy own_logs on treatment_log for all using(auth.uid()=user_id) with check(auth.uid()=user_id); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='vet_visits' and policyname='own_visits') then create policy own_visits on vet_visits for all using(auth.uid()=user_id) with check(auth.uid()=user_id); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='email_events' and policyname='own_emails') then create policy own_emails on email_events for select using(auth.uid()=user_id); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='app_events' and policyname='own_events') then create policy own_events on app_events for select using(auth.uid()=user_id); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='app_events' and policyname='insert_own_events') then create policy insert_own_events on app_events for insert with check(auth.uid()=user_id); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='weight_log' and policyname='own_weight_log') then create policy own_weight_log on weight_log for all using(auth.uid()=user_id) with check(auth.uid()=user_id); end if;
end $$;

create or replace function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$begin insert into profiles(user_id,email) values(new.id,coalesce(new.email,'')) on conflict(user_id) do nothing;return new;end$$;
drop trigger if exists auth_profile on auth.users;create trigger auth_profile after insert on auth.users for each row execute function public.new_profile();
create or replace function mark_treatment_done(p_treatment_id uuid,p_done_at timestamptz) returns void language plpgsql security invoker as $$declare p treatments;begin select * into p from treatments where id=p_treatment_id and user_id=auth.uid();if not found then raise exception 'not found';end if;insert into treatment_log(treatment_id,user_id,done_at,given_product) values(p.id,p.user_id,p_done_at,p.product_name);update treatments set last_given=p_done_at::date where id=p.id;insert into app_events(user_id,name) values(auth.uid(),'marked_done');end$$;
create or replace function due_reminder_digest(p_today date) returns table(user_id uuid,email text,items jsonb) language sql security definer set search_path=public as $$select p.user_id,p.email,jsonb_agg(jsonb_build_object('pet_name',pet.name,'name',t.name,'product_name',t.product_name,'days',t.next_due-p_today)) from profiles p join treatments t on t.user_id=p.user_id join pets pet on pet.id=t.pet_id where p.email_reminders_enabled and ((t.next_due-p_today)=any(p.reminder_leads) or t.next_due-p_today=-2) group by p.user_id,p.email$$;
commit;
notify pgrst, 'reload schema';
