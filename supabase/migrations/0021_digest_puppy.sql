-- ════════════════════════════════════════════════════════════════════════════
-- 0021 — Puppy routine in the SAME daily digest. Extends due_reminder_digest
-- (from 0019) with one more union branch: pets with puppy mode enabled get a
-- single 'puppy' line summarising how much of today's routine is still open, so
-- it rides along in the one morning email rather than a second one. Treatment/
-- grooming/feeding/weight behaviour is byte-for-byte unchanged. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
begin;

create or replace function due_reminder_digest(p_today date) returns table(user_id uuid,email text,items jsonb)
language sql security definer set search_path=public as $$
  with rows as (
    -- Due treatments (lead-day gated, as before)
    select t.user_id as uid,
      jsonb_build_object('kind','due','pet_name',pet.name,'name',t.name,'product_name',t.product_name,'days',t.next_due-p_today) as item,
      ((t.next_due-p_today)=any(pr.reminder_leads) or t.next_due-p_today=-2) as include
    from treatments t join pets pet on pet.id=t.pet_id join profiles pr on pr.user_id=t.user_id
    union all
    -- Due grooming (lead-day gated, as before)
    select g.user_id,
      jsonb_build_object('kind','due','pet_name',pet.name,'name',coalesce(nullif(g.label,''),initcap(replace(g.task::text,'_',' '))),'product_name',null,'days',g.next_due-p_today),
      ((g.next_due-p_today)=any(pr.reminder_leads) or g.next_due-p_today=-2)
    from grooming_schedule g join pets pet on pet.id=g.pet_id join profiles pr on pr.user_id=g.user_id
    union all
    -- Unlogged feeding from yesterday, only for pets with scheduled feeding times.
    select np.user_id,
      jsonb_build_object('kind','feeding','pet_name',pet.name,
        'name',(cardinality(np.feeding_times) - coalesce((select count(*) from feeding_log fl where fl.pet_id=np.pet_id and fl.fed_for_date=p_today-1 and fl.meal_time_slot=any(np.feeding_times)),0))::text
        || ' meal(s) not logged yesterday','product_name',null,'days',null),
      (cardinality(np.feeding_times) > coalesce((select count(*) from feeding_log fl where fl.pet_id=np.pet_id and fl.fed_for_date=p_today-1 and fl.meal_time_slot=any(np.feeding_times)),0))
    from nutrition_plans np join pets pet on pet.id=np.pet_id
    where cardinality(np.feeding_times) > 0
    union all
    -- Weight nudge: a previously-logged weight now 7+ days stale.
    select pet.user_id,
      jsonb_build_object('kind','weight','pet_name',pet.name,'name','Weight check due','product_name',null,
        'days',p_today-(select max(w.recorded_at) from weight_log w where w.pet_id=pet.id)),
      ((select max(w.recorded_at) from weight_log w where w.pet_id=pet.id) is not null
        and (select max(w.recorded_at) from weight_log w where w.pet_id=pet.id) <= p_today-7)
    from pets pet
    union all
    -- Puppy routine: one line per pet with puppy mode on and active routine
    -- items, showing how many are still open for today.
    select pm.user_id,
      jsonb_build_object('kind','puppy','pet_name',pet.name,
        'name','Puppy routine — '
          || (ri.n - coalesce((select count(*) from puppy_routine_log rl where rl.pet_id=pm.pet_id and rl.done_for_date=p_today),0))::text
          || ' of ' || ri.n::text || ' still to do today','product_name',null,'days',null),
      (ri.n > 0)
    from puppy_mode pm join pets pet on pet.id=pm.pet_id
      join lateral (select count(*) as n from puppy_routine_items pi where pi.pet_id=pm.pet_id and pi.active) ri on true
    where pm.enabled
  )
  select pr.user_id, pr.email, jsonb_agg(r.item)
  from profiles pr join rows r on r.uid=pr.user_id
  where pr.email_reminders_enabled and r.include
  group by pr.user_id, pr.email
$$;

commit;
notify pgrst, 'reload schema';
