-- ── Engagement mechanics: per-pet streak, weekly recap, recap-seen marker ─────
-- All day boundaries use the server/UTC convention already in force across the
-- app (feeding_log.fed_for_date, current_date, now()); there is no per-household
-- timezone in the schema, so we deliberately do NOT introduce a second one.

-- A "counted day" for a pet = at least one row that day, in the household's
-- (server) local day, across treatment_log (done), weight_log (weight),
-- observation_log (mood/note) or feeding_log (meal). treatment_log has no direct
-- pet_id — it joins through treatments, exactly as the dashboard already does.
create or replace function compute_pet_streak(p_pet_id uuid) returns int
language plpgsql stable set search_path=public as $$
declare
  v_days date[];
  v_day date;
  v_streak int := 0;
begin
  if p_pet_id is null then return 0; end if;

  select array_agg(distinct d) into v_days from (
    select tl.done_at::date d from treatment_log tl
      join treatments t on t.id = tl.treatment_id
      where t.pet_id = p_pet_id
    union
    select recorded_at from weight_log where pet_id = p_pet_id
    union
    select created_at::date from observation_log where pet_id = p_pet_id
    union
    select fed_for_date from feeding_log where pet_id = p_pet_id
  ) x;

  if v_days is null then return 0; end if;

  -- Anchor on today if today already has a counted row; otherwise anchor on
  -- yesterday, so an as-yet-unlogged morning doesn't zero the streak mid-day.
  v_day := current_date;
  if not (v_day = any(v_days)) then
    v_day := current_date - 1;
  end if;

  while v_day = any(v_days) loop
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;

  return v_streak;
end $$;

-- Weekly recap numbers over the trailing 7 days (today + 6 prior). Every number
-- traces to a real query here; the app renders them verbatim.
--   days_logged : distinct counted days (same 4-source definition as the streak)
--   on_time     : treatment_log rows with was_overdue = false (null excluded)
--   new_stamps  : real logged stamp events — treatments done, milestones,
--                 weights, vet visits, routine check-offs (the passport's earned
--                 stamps; synthetic birthday stamps are not "earned" and excluded)
create or replace function compute_pet_recap(p_pet_id uuid)
returns table(days_logged int, on_time int, new_stamps int)
language plpgsql stable set search_path=public as $$
declare v_from date := current_date - 6;
begin
  days_logged := 0; on_time := 0; new_stamps := 0;
  if p_pet_id is null then return next; return; end if;

  select count(distinct d) into days_logged from (
    select tl.done_at::date d from treatment_log tl
      join treatments t on t.id = tl.treatment_id
      where t.pet_id = p_pet_id and tl.done_at::date >= v_from
    union
    select recorded_at from weight_log where pet_id = p_pet_id and recorded_at >= v_from
    union
    select created_at::date from observation_log where pet_id = p_pet_id and created_at::date >= v_from
    union
    select fed_for_date from feeding_log where pet_id = p_pet_id and fed_for_date >= v_from
  ) x;

  select count(*) into on_time from treatment_log tl
    join treatments t on t.id = tl.treatment_id
    where t.pet_id = p_pet_id and tl.was_overdue = false and tl.done_at::date >= v_from;

  select
      (select count(*) from treatment_log tl join treatments t on t.id = tl.treatment_id
         where t.pet_id = p_pet_id and tl.done_at::date >= v_from)
    + (select count(*) from milestones where pet_id = p_pet_id and occurred_on >= v_from)
    + (select count(*) from weight_log where pet_id = p_pet_id and recorded_at >= v_from)
    + (select count(*) from vet_visits where pet_id = p_pet_id and date >= v_from)
    + (select count(*) from routine_checks where pet_id = p_pet_id and checked_at::date >= v_from)
    into new_stamps;

  return next;
end $$;

-- Per-pet marker so the weekly recap shows once per pet per calendar week.
-- last_recap_shown_week holds the Monday (ISO week start) it was last surfaced.
create table if not exists pet_engagement(
  pet_id uuid primary key references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  last_recap_shown_week date,
  updated_at timestamptz not null default now()
);
create index if not exists pet_engagement_user on pet_engagement(user_id);

alter table pet_engagement enable row level security;
drop policy if exists pet_engagement_select on pet_engagement;
create policy pet_engagement_select on pet_engagement for select using(user_id=any(select household_read_scope(auth.uid())));
drop policy if exists pet_engagement_insert on pet_engagement;
create policy pet_engagement_insert on pet_engagement for insert with check(user_id=any(select household_write_scope(auth.uid())));
drop policy if exists pet_engagement_update on pet_engagement;
create policy pet_engagement_update on pet_engagement for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));

grant select,insert,update,delete on pet_engagement to authenticated,anon;
grant execute on function compute_pet_streak(uuid) to authenticated,anon;
grant execute on function compute_pet_recap(uuid) to authenticated,anon;

notify pgrst, 'reload schema';
