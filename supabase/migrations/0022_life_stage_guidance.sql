-- ════════════════════════════════════════════════════════════════════════════
-- 0022 — Generalize the puppy tracker into a life-stage system for ANY species,
-- add a computed pet-traits summary (the personalization input), and a cached +
-- audited AI guidance table. Reuses the per-pet tables from 0020; broadens the
-- activation/template layer beyond dog-puppy. Household RLS throughout. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
begin;

-- ── Reference: species × life-stage routine templates (global read-only) ─────
create table if not exists life_stage_routine_templates(
  id text primary key,
  species text not null,
  stage text not null check(stage in ('young','adolescent','adult','senior')),
  sort_order int not null,
  time_slot text not null,
  activity_type text not null,
  label text not null,
  detail text
);
create index if not exists life_stage_routine_templates_key on life_stage_routine_templates(species,stage,sort_order);

-- ── Generalize the activation record (puppy_mode → any species/stage) ────────
alter table puppy_mode add column if not exists species text;
alter table puppy_mode add column if not exists stage text;
alter table puppy_mode add column if not exists new_to_household boolean not null default false;
-- The old dog-puppy band CHECK is too narrow now; drop it (band stays nullable
-- for the existing dog-puppy path, stage carries the generalized value).
alter table puppy_mode drop constraint if exists puppy_mode_band_check;
alter table puppy_mode alter column band drop not null;

-- Per-pet routine items may now source from EITHER template table; the hard FK
-- to puppy_routine_templates is too narrow. Keep source_template_id as a soft
-- provenance reference (plain text, no FK).
alter table puppy_routine_items drop constraint if exists puppy_routine_items_source_template_id_fkey;

-- ── Computed pet-traits summary (derived from logged data, not a manual form) ─
create table if not exists pet_traits(
  pet_id uuid primary key references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  energy_level text,          -- high | steady | low | unknown
  sociability text,           -- well_socialised | in_progress | early | unknown
  routine_consistency text,   -- consistent | building | sparse | unknown
  notable jsonb not null default '{}'::jsonb,  -- recent flag counts (scratching/limping/off_food)
  summary text,               -- one-line human/AI-input phrasing
  computed_at timestamptz not null default now()
);
create index if not exists pet_traits_user on pet_traits(user_id);

-- Derive traits from the pet's own observation_log, feeding_log and routine log.
-- SECURITY DEFINER so a daily/weekly job (or the app) can refresh it; it only
-- ever touches the one pet passed in and writes under that pet's owner.
create or replace function compute_pet_traits(p_pet uuid) returns void
language plpgsql security definer set search_path=public as $$
declare
  v_owner uuid;
  v_good int; v_low int; v_active_days int;
  v_scratch int; v_limp int; v_offfood int;
  v_soc_total int; v_soc_done int;
  v_energy text; v_consistency text; v_social text; v_summary text;
begin
  select user_id into v_owner from pets where id=p_pet;
  if v_owner is null then return; end if;

  select count(*) filter (where tag='great_energy' or tag='bright_day'),
         count(*) filter (where tag in ('off_day','quiet_day','off_food'))
    into v_good, v_low
    from observation_log where pet_id=p_pet and created_at >= now()-interval '30 days';

  select count(*) filter (where tag='scratching'),
         count(*) filter (where tag='limping'),
         count(*) filter (where tag='off_food')
    into v_scratch, v_limp, v_offfood
    from observation_log where pet_id=p_pet and created_at >= now()-interval '30 days';

  select count(distinct d) into v_active_days from (
    select fed_for_date d from feeding_log where pet_id=p_pet and fed_for_date >= current_date-13
    union
    select done_for_date d from puppy_routine_log where pet_id=p_pet and done_for_date >= current_date-13
  ) x;

  select count(*) into v_soc_total from socialization_experiences;
  select count(*) into v_soc_done from socialization_progress where pet_id=p_pet;

  v_energy := case when v_good=0 and v_low=0 then 'unknown'
                   when v_good >= v_low*2 then 'high'
                   when v_low >= v_good*2 then 'low'
                   else 'steady' end;
  v_consistency := case when v_active_days=0 then 'unknown'
                        when v_active_days >= 10 then 'consistent'
                        when v_active_days >= 4 then 'building'
                        else 'sparse' end;
  v_social := case when v_soc_done=0 then 'unknown'
                   when v_soc_total>0 and v_soc_done >= v_soc_total*0.6 then 'well_socialised'
                   when v_soc_done >= 10 then 'in_progress'
                   else 'early' end;
  v_summary := 'Energy '||v_energy||', routine '||v_consistency
    || case when v_soc_done>0 then ', socialisation '||v_social else '' end;

  insert into pet_traits(pet_id,user_id,energy_level,sociability,routine_consistency,notable,summary,computed_at)
  values(p_pet, v_owner, v_energy, v_social, v_consistency,
    (select coalesce(jsonb_object_agg(k,v) filter (where v>0),'{}'::jsonb)
       from (values('scratching',v_scratch),('limping',v_limp),('off_food',v_offfood)) as t(k,v)),
    v_summary, now())
  on conflict (pet_id) do update set
    energy_level=excluded.energy_level, sociability=excluded.sociability,
    routine_consistency=excluded.routine_consistency, notable=excluded.notable,
    summary=excluded.summary, computed_at=excluded.computed_at;
end $$;

-- ── AI guidance: one cached card per pet per period + an audit trail ─────────
create table if not exists pet_guidance(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  period text not null default 'week',
  period_start date not null,
  kind text not null check(kind in ('coaching','vet_redirect')),
  headline text not null,
  body text not null,
  focus jsonb not null default '[]'::jsonb,
  model text,
  prompt_sha256 text,        -- audit: what we asked (hashed)
  response_sha256 text,      -- audit: what came back (hashed)
  blocked_reason text,       -- set when a health pre-check forced the vet redirect
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(pet_id, period_start)
);
create index if not exists pet_guidance_pet on pet_guidance(pet_id, period_start desc);
create index if not exists pet_guidance_user on pet_guidance(user_id);

-- ── RLS: reference table world-readable; per-pet tables household-scoped ─────
alter table life_stage_routine_templates enable row level security;
drop policy if exists life_stage_routine_templates_read on life_stage_routine_templates;
create policy life_stage_routine_templates_read on life_stage_routine_templates for select using(true);

alter table pet_traits enable row level security;
drop policy if exists pet_traits_select on pet_traits;
create policy pet_traits_select on pet_traits for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists pet_traits_insert on pet_traits;
create policy pet_traits_insert on pet_traits for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists pet_traits_update on pet_traits;
create policy pet_traits_update on pet_traits for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));

alter table pet_guidance enable row level security;
drop policy if exists pet_guidance_select on pet_guidance;
create policy pet_guidance_select on pet_guidance for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists pet_guidance_insert on pet_guidance;
create policy pet_guidance_insert on pet_guidance for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists pet_guidance_update on pet_guidance;
create policy pet_guidance_update on pet_guidance for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists pet_guidance_delete on pet_guidance;
create policy pet_guidance_delete on pet_guidance for delete using(user_id=any(select household_write_scope(auth.uid())));

-- Grants for the PostgREST roles (RLS above is the real gate).
grant select on life_stage_routine_templates to authenticated,anon;
grant select,insert,update,delete on pet_traits,pet_guidance to authenticated,anon;

-- LIFE_STAGE ROWS: 81
insert into life_stage_routine_templates(id,species,stage,sort_order,time_slot,activity_type,label,detail) values
('dog-young-00-feeding','dog','young',0,'07:00','feeding','Breakfast (meal 1 of 3–4)','Young puppies eat 3–4 meals a day (AKC).'),
('dog-young-01-potty','dog','young',1,'07:20','potty','Potty after breakfast','Out within 10–15 min of every meal.'),
('dog-young-02-nap','dog','young',2,'08:00','nap','Nap','Puppies sleep 18–20 hrs/day (AKC).'),
('dog-young-03-socialization','dog','young',3,'10:30','socialization','Gentle socialization','One new sight/sound/surface, calm and positive (AVSAB 3–14 wk window).'),
('dog-young-04-feeding','dog','young',4,'12:30','feeding','Lunch',null),
('dog-young-05-training','dog','young',5,'15:30','training','Short training + play','5-minute sessions beat one long one.'),
('dog-young-06-feeding','dog','young',6,'18:30','feeding','Dinner',null),
('dog-young-07-settle','dog','young',7,'21:30','settle','Last potty + bedtime',null),
('dog-adolescent-00-feeding','dog','adolescent',0,'07:30','feeding','Breakfast (2 meals/day)','Most dogs move to 2 meals a day by ~6 months (AKC).'),
('dog-adolescent-01-walk','dog','adolescent',1,'08:00','walk','Morning walk','Build duration gradually to protect growing joints.'),
('dog-adolescent-02-training','dog','adolescent',2,'08:45','training','Impulse-control training','Adolescence tests recall and manners — keep reinforcing.'),
('dog-adolescent-03-chew','dog','adolescent',3,'12:30','chew','Independent settle','Practice calm alone-time to prevent separation issues.'),
('dog-adolescent-04-walk','dog','adolescent',4,'17:00','walk','Afternoon walk / sniff',null),
('dog-adolescent-05-feeding','dog','adolescent',5,'18:30','feeding','Dinner',null),
('dog-adolescent-06-play','dog','adolescent',6,'20:00','play','Enrichment','Snuffle mat, flirt pole, scent games.'),
('dog-adolescent-07-settle','dog','adolescent',7,'22:00','settle','Bedtime',null),
('dog-adult-00-feeding','dog','adult',0,'07:30','feeding','Breakfast','Adults typically eat twice a day; keep portions to body condition.'),
('dog-adult-01-walk','dog','adult',1,'08:00','walk','Morning walk',null),
('dog-adult-02-chew','dog','adult',2,'12:00','chew','Midday rest',null),
('dog-adult-03-walk','dog','adult',3,'17:30','walk','Evening walk',null),
('dog-adult-04-feeding','dog','adult',4,'18:30','feeding','Dinner',null),
('dog-adult-05-grooming','dog','adult',5,'19:30','grooming','Coat + teeth check','Daily tooth-brushing is the gold standard for dental health.'),
('dog-adult-06-play','dog','adult',6,'20:30','play','Training / enrichment',null),
('dog-senior-00-feeding','dog','senior',0,'07:30','feeding','Breakfast','Watch weight and appetite closely as metabolism changes.'),
('dog-senior-01-walk','dog','senior',1,'08:00','walk','Gentle walk','Shorter, more frequent walks suit stiff joints.'),
('dog-senior-02-meds','dog','senior',2,'12:00','meds','Midday check','A calm point to give any prescribed medication with food if directed.'),
('dog-senior-03-walk','dog','senior',3,'16:00','walk','Gentle walk',null),
('dog-senior-04-feeding','dog','senior',4,'18:30','feeding','Dinner',null),
('dog-senior-05-grooming','dog','senior',5,'19:30','grooming','Grooming + body check','Feel for new lumps, sore spots or weight change; note anything for the vet.'),
('dog-senior-06-settle','dog','senior',6,'20:30','settle','Warm, easy bedtime','Senior dogs benefit from a 6-monthly vet check (AAHA senior care).'),
('cat-young-00-feeding','cat','young',0,'07:00','feeding','Breakfast (3–4 meals/day)','Kittens need 3–4 small meals a day.'),
('cat-young-01-play','cat','young',1,'07:30','play','Wand-toy play','Play channels the hunt drive and builds bonding.'),
('cat-young-02-socialization','cat','young',2,'10:00','socialization','Gentle handling + new sounds','The kitten socialization window is early (~2–7 weeks) — keep exposures calm.'),
('cat-young-03-feeding','cat','young',3,'12:30','feeding','Lunch',null),
('cat-young-04-nap','cat','young',4,'14:00','nap','Nap','Kittens sleep a lot between play bursts.'),
('cat-young-05-play','cat','young',5,'17:30','play','Play before dinner','Play-then-feed mimics hunt-then-eat and settles them.'),
('cat-young-06-feeding','cat','young',6,'18:00','feeding','Dinner',null),
('cat-young-07-litter','cat','young',7,'21:00','litter','Litter + settle','Keep the tray spotless — young cats are fussy and it prevents accidents.'),
('cat-adolescent-00-feeding','cat','adolescent',0,'07:00','feeding','Breakfast (2–3 meals/day)','Ease from kitten meals toward an adult 2–3 meal rhythm.'),
('cat-adolescent-01-play','cat','adolescent',1,'07:30','play','Energy-burn play','Adolescent cats have big energy — two good play sessions a day.'),
('cat-adolescent-02-feeding','cat','adolescent',2,'12:30','feeding','Lunch',null),
('cat-adolescent-03-enrichment','cat','adolescent',3,'15:00','enrichment','Climbing / scratching','Vertical space and a scratching post protect furniture and claws.'),
('cat-adolescent-04-feeding','cat','adolescent',4,'18:00','feeding','Dinner',null),
('cat-adolescent-05-play','cat','adolescent',5,'19:00','play','Evening hunt-play',null),
('cat-adolescent-06-litter','cat','adolescent',6,'21:30','litter','Litter check + settle',null),
('cat-adult-00-feeding','cat','adult',0,'07:00','feeding','Breakfast','Portion to body condition; obesity is common in indoor cats.'),
('cat-adult-01-play','cat','adult',1,'07:30','play','Morning play','Even 10 minutes keeps an indoor cat active.'),
('cat-adult-02-enrichment','cat','adult',2,'13:00','enrichment','Window / puzzle feeder','Puzzle feeders slow eating and add mental work.'),
('cat-adult-03-feeding','cat','adult',3,'18:00','feeding','Dinner',null),
('cat-adult-04-play','cat','adult',4,'19:00','play','Evening play',null),
('cat-adult-05-grooming','cat','adult',5,'20:00','grooming','Brush + teeth check','Regular brushing cuts hairballs; check gums and teeth.'),
('cat-adult-06-litter','cat','adult',6,'21:30','litter','Litter check',null),
('cat-senior-00-feeding','cat','senior',0,'07:00','feeding','Breakfast','Weigh regularly — weight loss can be the first sign of illness in older cats.'),
('cat-senior-01-play','cat','senior',1,'07:30','play','Gentle play','Shorter, softer play sessions suit stiffer joints.'),
('cat-senior-02-enrichment','cat','senior',2,'13:00','enrichment','Easy access rest spot','Ramps and low-sided trays help arthritic cats.'),
('cat-senior-03-feeding','cat','senior',3,'18:00','feeding','Dinner',null),
('cat-senior-04-grooming','cat','senior',4,'19:30','grooming','Brush + body check','Senior cats groom less — help them, and feel for changes.'),
('cat-senior-05-litter','cat','senior',5,'21:00','litter','Litter check + settle','Senior cats benefit from twice-yearly vet checks (AAHA senior care).'),
('rabbit-young-00-feeding','rabbit','young',0,'07:30','feeding','Unlimited hay + fresh water','Hay should be ~80% of a rabbit’s diet at every age.'),
('rabbit-young-01-feeding','rabbit','young',1,'08:00','feeding','Small pellet portion','Young rabbits get more pellets than adults; introduce greens slowly.'),
('rabbit-young-02-socialization','rabbit','young',2,'10:00','socialization','Gentle handling','Handle little and often, low to the ground — rabbits startle easily.'),
('rabbit-young-03-enrichment','rabbit','young',3,'14:00','enrichment','Safe exploration time','Supervised floor time builds confidence; rabbit-proof cables.'),
('rabbit-young-04-feeding','rabbit','young',4,'18:00','feeding','Evening greens','A variety of safe leafy greens supports gut health.'),
('rabbit-young-05-health','rabbit','young',5,'20:00','health','Check eating + droppings','A rabbit that stops eating is an emergency — never let them fast.'),
('rabbit-adolescent-00-feeding','rabbit','adolescent',0,'07:30','feeding','Unlimited hay refresh','Constant hay keeps the gut moving and wears teeth down.'),
('rabbit-adolescent-01-feeding','rabbit','adolescent',1,'08:00','feeding','Measured pellets','Taper pellets as they mature to avoid selective feeding.'),
('rabbit-adolescent-02-enrichment','rabbit','adolescent',2,'12:00','enrichment','Exercise + foraging','At least a few hours of space to run and forage daily.'),
('rabbit-adolescent-03-feeding','rabbit','adolescent',3,'18:00','feeding','Fresh greens',null),
('rabbit-adolescent-04-health','rabbit','adolescent',4,'20:00','health','Check eating + droppings','Watch for smaller or fewer droppings — a warning sign.'),
('rabbit-adult-00-feeding','rabbit','adult',0,'07:30','feeding','Unlimited hay + water','Hay first, always — the single most important thing for a rabbit.'),
('rabbit-adult-01-feeding','rabbit','adult',1,'08:00','feeding','Small measured pellets','A limited daily pellet portion by body weight.'),
('rabbit-adult-02-enrichment','rabbit','adult',2,'12:00','enrichment','Run + forage time','Daily exercise prevents obesity and boredom.'),
('rabbit-adult-03-feeding','rabbit','adult',3,'18:00','feeding','Leafy greens',null),
('rabbit-adult-04-grooming','rabbit','adult',4,'19:00','grooming','Brush (more when moulting)','Rabbits can’t vomit hairballs — grooming during a moult matters.'),
('rabbit-adult-05-health','rabbit','adult',5,'20:00','health','Eating + droppings check',null),
('rabbit-senior-00-feeding','rabbit','senior',0,'07:30','feeding','Unlimited hay + water','Keep hay central even if appetite dips.'),
('rabbit-senior-01-feeding','rabbit','senior',1,'08:00','feeding','Measured pellets','Vets sometimes adjust an older rabbit’s diet — follow their advice.'),
('rabbit-senior-02-enrichment','rabbit','senior',2,'12:00','enrichment','Gentle low-effort space','Softer flooring and easy ramps help arthritic joints.'),
('rabbit-senior-03-feeding','rabbit','senior',3,'18:00','feeding','Greens',null),
('rabbit-senior-04-grooming','rabbit','senior',4,'19:00','grooming','Brush + hygiene check','Older rabbits may struggle to clean themselves — check their rear daily.'),
('rabbit-senior-05-health','rabbit','senior',5,'20:00','health','Eating + droppings check','Any change in eating or droppings warrants a prompt vet call.')
on conflict (id) do update set species=excluded.species,stage=excluded.stage,sort_order=excluded.sort_order,time_slot=excluded.time_slot,activity_type=excluded.activity_type,label=excluded.label,detail=excluded.detail;

commit;
notify pgrst, 'reload schema';
