-- ════════════════════════════════════════════════════════════════════════════
-- 0020 — Puppy stage tracker. Extends the existing record: a per-pet daily
-- routine (derived from age-banded reference templates, marked done like
-- feeding), a 100-experience socialization checklist, and per-pet completion.
-- Reference tables (templates, experiences) are global read-only seed data;
-- all per-pet tables use the same household_read_scope/household_write_scope
-- RLS convention as every other table. Fully idempotent.
-- ════════════════════════════════════════════════════════════════════════════
begin;

-- ── Per-pet activation + chosen age band ─────────────────────────────────────
create table if not exists puppy_mode(
  pet_id uuid primary key references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  enabled boolean not null default true,
  band text not null check(band in ('8_10w','10_12w','12_16w','16_24w')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists puppy_mode_user on puppy_mode(user_id);

-- ── Reference: age-banded routine templates (global read-only seed) ──────────
create table if not exists puppy_routine_templates(
  id text primary key,
  age_band text not null check(age_band in ('8_10w','10_12w','12_16w','16_24w')),
  sort_order int not null,
  time_slot text not null,
  activity_type text not null,
  label text not null,
  detail text
);
create index if not exists puppy_routine_templates_band on puppy_routine_templates(age_band,sort_order);

-- ── Per-pet routine items (derived from / customised off a template) ─────────
create table if not exists puppy_routine_items(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  source_template_id text references puppy_routine_templates on delete set null,
  sort_order int not null default 0,
  time_slot text not null check(length(time_slot) between 1 and 20),
  activity_type text not null check(length(activity_type) between 1 and 30),
  label text not null check(length(label) between 1 and 120),
  detail text check(length(detail)<=300),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists puppy_routine_items_pet on puppy_routine_items(pet_id,sort_order);
create index if not exists puppy_routine_items_user on puppy_routine_items(user_id);

-- ── Daily mark-done log (mirrors feeding_log's per-day uniqueness guard) ──────
create table if not exists puppy_routine_log(
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references puppy_routine_items on delete cascade,
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  done_for_date date not null default current_date,
  done_by text not null check(length(done_by) between 1 and 120),
  done_at timestamptz not null default now(),
  unique(item_id,done_for_date)
);
create index if not exists puppy_routine_log_pet on puppy_routine_log(pet_id,done_for_date desc);
create index if not exists puppy_routine_log_user on puppy_routine_log(user_id);

-- ── Reference: socialization checklist (global read-only seed) ───────────────
create table if not exists socialization_experiences(
  id text primary key,
  category text not null,
  sort_order int not null,
  label text not null
);
create index if not exists socialization_experiences_cat on socialization_experiences(category,sort_order);

-- ── Per-pet socialization completion ─────────────────────────────────────────
create table if not exists socialization_progress(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  experience_id text not null references socialization_experiences on delete cascade,
  completed_at timestamptz not null default now(),
  completed_by text check(length(completed_by)<=120),
  note text check(length(note)<=300),
  photo_path text,
  unique(pet_id,experience_id)
);
create index if not exists socialization_progress_pet on socialization_progress(pet_id);
create index if not exists socialization_progress_user on socialization_progress(user_id);

-- ── RLS: per-pet tables scope by household, exactly like every other table ───
alter table puppy_mode enable row level security;
drop policy if exists puppy_mode_select on puppy_mode;
create policy puppy_mode_select on puppy_mode for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists puppy_mode_insert on puppy_mode;
create policy puppy_mode_insert on puppy_mode for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists puppy_mode_update on puppy_mode;
create policy puppy_mode_update on puppy_mode for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists puppy_mode_delete on puppy_mode;
create policy puppy_mode_delete on puppy_mode for delete using(user_id=any(select household_write_scope(auth.uid())));

alter table puppy_routine_items enable row level security;
drop policy if exists puppy_routine_items_select on puppy_routine_items;
create policy puppy_routine_items_select on puppy_routine_items for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists puppy_routine_items_insert on puppy_routine_items;
create policy puppy_routine_items_insert on puppy_routine_items for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists puppy_routine_items_update on puppy_routine_items;
create policy puppy_routine_items_update on puppy_routine_items for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists puppy_routine_items_delete on puppy_routine_items;
create policy puppy_routine_items_delete on puppy_routine_items for delete using(user_id=any(select household_write_scope(auth.uid())));

alter table puppy_routine_log enable row level security;
drop policy if exists puppy_routine_log_select on puppy_routine_log;
create policy puppy_routine_log_select on puppy_routine_log for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists puppy_routine_log_insert on puppy_routine_log;
create policy puppy_routine_log_insert on puppy_routine_log for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists puppy_routine_log_delete on puppy_routine_log;
create policy puppy_routine_log_delete on puppy_routine_log for delete using(user_id=any(select household_write_scope(auth.uid())));

alter table socialization_progress enable row level security;
drop policy if exists socialization_progress_select on socialization_progress;
create policy socialization_progress_select on socialization_progress for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists socialization_progress_insert on socialization_progress;
create policy socialization_progress_insert on socialization_progress for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists socialization_progress_update on socialization_progress;
create policy socialization_progress_update on socialization_progress for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists socialization_progress_delete on socialization_progress;
create policy socialization_progress_delete on socialization_progress for delete using(user_id=any(select household_write_scope(auth.uid())));

-- ── RLS: reference tables are readable by everyone, writable by no one ───────
alter table puppy_routine_templates enable row level security;
drop policy if exists puppy_routine_templates_read on puppy_routine_templates;
create policy puppy_routine_templates_read on puppy_routine_templates for select using(true);
alter table socialization_experiences enable row level security;
drop policy if exists socialization_experiences_read on socialization_experiences;
create policy socialization_experiences_read on socialization_experiences for select using(true);

-- Table grants for the PostgREST roles (RLS above is the real gate). Mirrors the
-- grants Supabase applies to every other table in this schema.
grant select,insert,update,delete on puppy_mode,puppy_routine_items,puppy_routine_log,socialization_progress to authenticated,anon;
grant select on puppy_routine_templates,socialization_experiences to authenticated,anon;

-- TEMPLATE ROWS: 61
insert into puppy_routine_templates(id,age_band,sort_order,time_slot,activity_type,label,detail) values
('8_10w-00-potty','8_10w',0,'06:30','potty','Wake + potty','First thing out — puppies need to go immediately on waking.'),
('8_10w-01-feeding','8_10w',1,'07:00','feeding','Breakfast (meal 1 of 4)','8–10 wk puppies eat ~4 meals a day (AKC).'),
('8_10w-02-potty','8_10w',2,'07:15','potty','Potty after breakfast','Out within 10–15 min of every meal.'),
('8_10w-03-play','8_10w',3,'07:30','play','Short play + name game','Keep it to 5–10 min — attention spans are tiny.'),
('8_10w-04-nap','8_10w',4,'08:00','nap','Nap','Puppies this age sleep 18–20 hrs/day (AKC).'),
('8_10w-05-socialization','8_10w',5,'10:00','socialization','Gentle socialization','One new sight/sound/surface, calm and carried if not yet vaccinated.'),
('8_10w-06-feeding','8_10w',6,'11:00','feeding','Lunch (meal 2 of 4)',null),
('8_10w-07-potty','8_10w',7,'11:15','potty','Potty after lunch',null),
('8_10w-08-nap','8_10w',8,'12:00','nap','Nap',null),
('8_10w-09-feeding','8_10w',9,'15:00','feeding','Afternoon meal (meal 3 of 4)',null),
('8_10w-10-chew','8_10w',10,'15:20','chew','Settle with a chew','Builds calm alone-time and soothes teething gums.'),
('8_10w-11-handling','8_10w',11,'17:30','handling','Handling practice','Touch paws, ears, mouth — pairs with treats.'),
('8_10w-12-feeding','8_10w',12,'18:30','feeding','Dinner (meal 4 of 4)',null),
('8_10w-13-potty','8_10w',13,'18:50','potty','Potty after dinner',null),
('8_10w-14-potty','8_10w',14,'21:30','potty','Last potty before bed',null),
('8_10w-15-settle','8_10w',15,'22:00','settle','Bedtime settle','Expect one or two overnight potty trips at this age.'),
('10_12w-00-potty','10_12w',0,'06:45','potty','Wake + potty',null),
('10_12w-01-feeding','10_12w',1,'07:15','feeding','Breakfast (meal 1 of 4)','Still ~4 meals a day at 10–12 wk (AKC).'),
('10_12w-02-potty','10_12w',2,'07:35','potty','Potty after breakfast',null),
('10_12w-03-training','10_12w',3,'07:45','training','Training: sit + recall','2 short 5-min sessions beat one long one.'),
('10_12w-04-nap','10_12w',4,'08:30','nap','Nap','Sleep easing toward 16–18 hrs/day.'),
('10_12w-05-socialization','10_12w',5,'10:30','socialization','Socialization outing','Post-first-vaccine: new people, surfaces, calm dogs.'),
('10_12w-06-feeding','10_12w',6,'11:30','feeding','Lunch (meal 2 of 4)',null),
('10_12w-07-nap','10_12w',7,'12:00','nap','Nap',null),
('10_12w-08-play','10_12w',8,'14:30','play','Play + gentle bite-inhibition','Redirect mouthing onto a toy, every time.'),
('10_12w-09-feeding','10_12w',9,'15:30','feeding','Afternoon meal (meal 3 of 4)',null),
('10_12w-10-chew','10_12w',10,'16:00','chew','Settle with a chew',null),
('10_12w-11-grooming','10_12w',11,'17:30','grooming','Brush + touch handling','Short daily brush, even short coats — it is about tolerance.'),
('10_12w-12-feeding','10_12w',12,'18:30','feeding','Dinner (meal 4 of 4)',null),
('10_12w-13-potty','10_12w',13,'18:50','potty','Potty after dinner',null),
('10_12w-14-potty','10_12w',14,'21:45','potty','Last potty before bed',null),
('10_12w-15-settle','10_12w',15,'22:00','settle','Bedtime settle',null),
('12_16w-00-potty','12_16w',0,'07:00','potty','Wake + potty','Bladder hold ~ (age in months + 1) hours (AKC).'),
('12_16w-01-feeding','12_16w',1,'07:30','feeding','Breakfast (meal 1 of 3)','Drop to ~3 meals a day from 12 wk (AKC).'),
('12_16w-02-walk','12_16w',2,'07:50','walk','Short lead walk','Once fully vaccinated — start with a few calm minutes.'),
('12_16w-03-training','12_16w',3,'08:30','training','Training: loose-lead + settle',null),
('12_16w-04-nap','12_16w',4,'09:00','nap','Nap',null),
('12_16w-05-socialization','12_16w',5,'11:00','socialization','New environment','Cafe, town, car park — different sights and footing.'),
('12_16w-06-feeding','12_16w',6,'12:30','feeding','Lunch (meal 2 of 3)',null),
('12_16w-07-nap','12_16w',7,'13:00','nap','Nap',null),
('12_16w-08-play','12_16w',8,'15:30','play','Play + fetch',null),
('12_16w-09-chew','12_16w',9,'16:30','chew','Settle with a chew',null),
('12_16w-10-grooming','12_16w',10,'17:30','grooming','Grooming + handling','Introduce nail file/clippers with treats.'),
('12_16w-11-feeding','12_16w',11,'18:30','feeding','Dinner (meal 3 of 3)',null),
('12_16w-12-potty','12_16w',12,'18:50','potty','Potty after dinner',null),
('12_16w-13-training','12_16w',13,'20:00','training','Evening mini-session',null),
('12_16w-14-settle','12_16w',14,'22:00','settle','Last potty + bedtime',null),
('16_24w-00-potty','16_24w',0,'07:00','potty','Wake + potty',null),
('16_24w-01-feeding','16_24w',1,'07:30','feeding','Breakfast (meal 1 of 3)','~3 meals a day through ~6 months, then 2 (AKC).'),
('16_24w-02-walk','16_24w',2,'08:00','walk','Morning walk','Longer now — build gradually to avoid over-exercising growing joints.'),
('16_24w-03-training','16_24w',3,'08:45','training','Training: impulse control','Wait, leave-it, settle on a mat.'),
('16_24w-04-nap','16_24w',4,'09:30','nap','Rest','Adolescents still need 14–16 hrs of rest.'),
('16_24w-05-socialization','16_24w',5,'11:30','socialization','Ongoing socialization','Keep exposing to novelty — the window narrows but habits set now.'),
('16_24w-06-feeding','16_24w',6,'12:30','feeding','Lunch (meal 2 of 3)',null),
('16_24w-07-chew','16_24w',7,'13:30','chew','Independent settle','Practice calm time alone to prevent separation issues.'),
('16_24w-08-play','16_24w',8,'15:30','play','Play + enrichment','Snuffle mat, flirt pole, scent games.'),
('16_24w-09-walk','16_24w',9,'17:00','walk','Afternoon walk / sniff',null),
('16_24w-10-grooming','16_24w',10,'18:00','grooming','Grooming routine',null),
('16_24w-11-feeding','16_24w',11,'18:30','feeding','Dinner (meal 3 of 3)',null),
('16_24w-12-training','16_24w',12,'20:00','training','Evening training',null),
('16_24w-13-settle','16_24w',13,'22:00','settle','Last potty + bedtime',null)
on conflict (id) do update set age_band=excluded.age_band,sort_order=excluded.sort_order,time_slot=excluded.time_slot,activity_type=excluded.activity_type,label=excluded.label,detail=excluded.detail;

-- SOC ROWS: 100
insert into socialization_experiences(id,category,sort_order,label) values
('people-men','people',0,'Men'),
('people-women','people',1,'Women'),
('people-children-5-12','people',2,'Children (5–12)'),
('people-toddlers','people',3,'Toddlers'),
('people-babies-crying','people',4,'Babies (crying)'),
('people-teenagers','people',5,'Teenagers'),
('people-elderly-people','people',6,'Elderly people'),
('people-a-person-with-a-beard','people',7,'A person with a beard'),
('people-a-person-wearing-a-hat','people',8,'A person wearing a hat'),
('people-a-person-in-hi-vis-or-a-uniform','people',9,'A person in hi-vis or a uniform'),
('people-a-person-wearing-sunglasses','people',10,'A person wearing sunglasses'),
('people-a-person-with-an-umbrella','people',11,'A person with an umbrella'),
('people-a-person-using-a-wheelchair','people',12,'A person using a wheelchair'),
('people-a-person-on-crutches-or-a-walking-frame','people',13,'A person on crutches or a walking frame'),
('people-a-delivery-or-postal-worker','people',14,'A delivery or postal worker'),
('people-a-jogger-running-past','people',15,'A jogger running past'),
('people-a-person-carrying-bags-or-boxes','people',16,'A person carrying bags or boxes'),
('people-people-of-different-ethnicities','people',17,'People of different ethnicities'),
('people-a-large-group-of-people','people',18,'A large group of people'),
('people-a-person-hugging-or-greeting-you','people',19,'A person hugging or greeting you'),
('animals-a-calm-vaccinated-adult-dog','animals',20,'A calm, vaccinated adult dog'),
('animals-a-friendly-puppy-playmate','animals',21,'A friendly puppy playmate'),
('animals-a-dog-passing-on-lead','animals',22,'A dog passing on lead'),
('animals-a-small-breed-dog','animals',23,'A small-breed dog'),
('animals-a-large-breed-dog','animals',24,'A large-breed dog'),
('animals-a-cat','animals',25,'A cat'),
('animals-livestock-from-a-distance-horses-sheep-c','animals',26,'Livestock from a distance (horses, sheep, cows)'),
('animals-garden-birds','animals',27,'Garden birds'),
('animals-squirrels-or-wildlife','animals',28,'Squirrels or wildlife'),
('animals-ducks-or-waterfowl','animals',29,'Ducks or waterfowl'),
('places-grass','places',30,'Grass'),
('places-concrete-or-pavement','places',31,'Concrete or pavement'),
('places-gravel','places',32,'Gravel'),
('places-sand','places',33,'Sand'),
('places-a-wet-or-slippery-floor','places',34,'A wet or slippery floor'),
('places-tile-flooring','places',35,'Tile flooring'),
('places-wooden-floor','places',36,'Wooden floor'),
('places-carpet','places',37,'Carpet'),
('places-a-metal-grate-or-drain-cover','places',38,'A metal grate or drain cover'),
('places-a-set-of-stairs','places',39,'A set of stairs'),
('places-a-wobbly-or-unstable-surface','places',40,'A wobbly or unstable surface'),
('places-a-car-park','places',41,'A car park'),
('places-an-elevator-or-lift','places',42,'An elevator or lift'),
('places-the-vet-waiting-room-happy-visit','places',43,'The vet waiting room (happy visit)'),
('places-a-pet-shop','places',44,'A pet shop'),
('places-an-outdoor-cafe','places',45,'An outdoor cafe'),
('places-a-busy-street','places',46,'A busy street'),
('places-a-quiet-park','places',47,'A quiet park'),
('places-a-town-centre','places',48,'A town centre'),
('places-open-countryside','places',49,'Open countryside'),
('places-a-beach-or-shoreline','places',50,'A beach or shoreline'),
('sounds-the-vacuum-cleaner','sounds',51,'The vacuum cleaner'),
('sounds-the-doorbell','sounds',52,'The doorbell'),
('sounds-a-thunderstorm-recording-low-volume','sounds',53,'A thunderstorm (recording, low volume)'),
('sounds-fireworks-recording-low-volume','sounds',54,'Fireworks (recording, low volume)'),
('sounds-traffic-noise','sounds',55,'Traffic noise'),
('sounds-sirens','sounds',56,'Sirens'),
('sounds-the-hairdryer','sounds',57,'The hairdryer'),
('sounds-the-washing-machine-or-dryer','sounds',58,'The washing machine or dryer'),
('sounds-the-television','sounds',59,'The television'),
('sounds-a-blender-or-food-mixer','sounds',60,'A blender or food mixer'),
('sounds-children-shouting-or-playing','sounds',61,'Children shouting or playing'),
('sounds-a-dog-barking','sounds',62,'A dog barking'),
('sounds-a-motorbike','sounds',63,'A motorbike'),
('sounds-a-lawnmower-or-power-tools','sounds',64,'A lawnmower or power tools'),
('sounds-clapping-or-applause','sounds',65,'Clapping or applause'),
('handling-having-paws-touched-and-held','handling',66,'Having paws touched and held'),
('handling-having-ears-touched-and-looked-in','handling',67,'Having ears touched and looked in'),
('handling-having-the-mouth-teeth-checked','handling',68,'Having the mouth/teeth checked'),
('handling-being-brushed','handling',69,'Being brushed'),
('handling-nail-clippers-or-file-introduced','handling',70,'Nail clippers or file introduced'),
('handling-a-bath','handling',71,'A bath'),
('handling-being-towel-dried','handling',72,'Being towel-dried'),
('handling-having-the-collar-held','handling',73,'Having the collar held'),
('handling-gentle-restraint-for-a-moment','handling',74,'Gentle restraint for a moment'),
('handling-being-wiped-with-a-damp-cloth','handling',75,'Being wiped with a damp cloth'),
('handling-a-mock-vet-exam-all-over','handling',76,'A mock vet exam (all over)'),
('handling-being-picked-up-and-held','handling',77,'Being picked up and held'),
('handling-a-harness-put-on','handling',78,'A harness put on'),
('handling-wearing-a-coat-or-jumper','handling',79,'Wearing a coat or jumper'),
('objects-an-umbrella-opening','objects',80,'An umbrella opening'),
('objects-a-bicycle-passing','objects',81,'A bicycle passing'),
('objects-a-skateboard-or-scooter','objects',82,'A skateboard or scooter'),
('objects-a-pushchair-or-stroller','objects',83,'A pushchair or stroller'),
('objects-a-wheelie-bin','objects',84,'A wheelie bin'),
('objects-balloons','objects',85,'Balloons'),
('objects-plastic-bags-blowing','objects',86,'Plastic bags blowing'),
('objects-a-broom-or-mop-moving','objects',87,'A broom or mop moving'),
('objects-a-garden-hose-or-sprinkler','objects',88,'A garden hose or sprinkler'),
('objects-automatic-doors','objects',89,'Automatic doors'),
('objects-a-statue-or-mannequin','objects',90,'A statue or mannequin'),
('objects-flags-or-bunting-flapping','objects',91,'Flags or bunting flapping'),
('travel-a-short-car-ride','travel',92,'A short car ride'),
('travel-riding-secured-in-a-crate-or-harness','travel',93,'Riding secured in a crate or harness'),
('travel-a-car-with-the-engine-running','travel',94,'A car with the engine running'),
('travel-sitting-calmly-in-a-stationary-car','travel',95,'Sitting calmly in a stationary car'),
('travel-a-bus-stop-or-busy-pavement','travel',96,'A bus stop or busy pavement'),
('travel-a-train-or-station-from-a-distance','travel',97,'A train or station from a distance'),
('travel-crossing-a-bridge','travel',98,'Crossing a bridge'),
('travel-walking-past-roadworks','travel',99,'Walking past roadworks')
on conflict (id) do update set category=excluded.category,sort_order=excluded.sort_order,label=excluded.label;

commit;
notify pgrst, 'reload schema';
