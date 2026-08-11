-- ════════════════════════════════════════════════════════════════════════════
-- 0019 — One daily digest, not a parallel system. Extends due_reminder_digest
-- so the SAME daily email also carries: unlogged feeding from the prior day
-- (for pets whose owner uses scheduled feeding times) and a weight nudge when a
-- previously-logged weight has gone 7+ days stale. Each item is kind-tagged so
-- the cron formatter can phrase it correctly. Treatment/grooming behaviour is
-- unchanged (still lead-day gated). Idempotent (create or replace).
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
    -- Weight nudge: a previously-logged weight now 7+ days stale. (First-ever
    -- weight prompting stays in-app to avoid daily emails to brand-new pets.)
    select pet.user_id,
      jsonb_build_object('kind','weight','pet_name',pet.name,'name','Weight check due','product_name',null,
        'days',p_today-(select max(w.recorded_at) from weight_log w where w.pet_id=pet.id)),
      ((select max(w.recorded_at) from weight_log w where w.pet_id=pet.id) is not null
        and (select max(w.recorded_at) from weight_log w where w.pet_id=pet.id) <= p_today-7)
    from pets pet
  )
  select pr.user_id, pr.email, jsonb_agg(r.item)
  from profiles pr join rows r on r.uid=pr.user_id
  where pr.email_reminders_enabled and r.include
  group by pr.user_id, pr.email
$$;

commit;
notify pgrst, 'reload schema';
