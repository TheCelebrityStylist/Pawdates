begin;

alter table treatment_log add column if not exists actor_user_id uuid references auth.users;
alter table observation_log add column if not exists actor_user_id uuid references auth.users;

-- pets: read/write scope for household members, but creating or deleting a
-- pet stays strictly the owner's own action.
drop policy if exists own_pets on pets;
create policy pets_select on pets for select using(user_id=any(select household_read_scope(auth.uid())));
create policy pets_insert on pets for insert with check(auth.uid()=user_id);
create policy pets_update on pets for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
create policy pets_delete on pets for delete using(auth.uid()=user_id);

drop policy if exists own_treatments on treatments;
create policy treatments_select on treatments for select using(user_id=any(select household_read_scope(auth.uid())));
create policy treatments_insert on treatments for insert with check(user_id=any(select household_write_scope(auth.uid())));
create policy treatments_update on treatments for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
create policy treatments_delete on treatments for delete using(user_id=any(select household_write_scope(auth.uid())));

drop policy if exists own_logs on treatment_log;
create policy treatment_log_select on treatment_log for select using(user_id=any(select household_read_scope(auth.uid())));
create policy treatment_log_insert on treatment_log for insert with check(user_id=any(select household_write_scope(auth.uid())));

drop policy if exists own_visits on vet_visits;
create policy vet_visits_select on vet_visits for select using(user_id=any(select household_read_scope(auth.uid())));
create policy vet_visits_insert on vet_visits for insert with check(user_id=any(select household_write_scope(auth.uid())));
create policy vet_visits_update on vet_visits for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
create policy vet_visits_delete on vet_visits for delete using(user_id=any(select household_write_scope(auth.uid())));

drop policy if exists own_weight_log on weight_log;
create policy weight_log_select on weight_log for select using(user_id=any(select household_read_scope(auth.uid())));
create policy weight_log_insert on weight_log for insert with check(user_id=any(select household_write_scope(auth.uid())));
create policy weight_log_update on weight_log for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
create policy weight_log_delete on weight_log for delete using(user_id=any(select household_write_scope(auth.uid())));

drop policy if exists own_pet_profile on pet_profile;
create policy pet_profile_select on pet_profile for select using(user_id=any(select household_read_scope(auth.uid())));
create policy pet_profile_insert on pet_profile for insert with check(user_id=any(select household_write_scope(auth.uid())));
create policy pet_profile_update on pet_profile for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
create policy pet_profile_delete on pet_profile for delete using(user_id=any(select household_write_scope(auth.uid())));

drop policy if exists own_routine_items on routine_items;
create policy routine_items_select on routine_items for select using(user_id=any(select household_read_scope(auth.uid())));
create policy routine_items_insert on routine_items for insert with check(user_id=any(select household_write_scope(auth.uid())));
create policy routine_items_update on routine_items for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
create policy routine_items_delete on routine_items for delete using(user_id=any(select household_write_scope(auth.uid())));

drop policy if exists own_routine_checks on routine_checks;
create policy routine_checks_select on routine_checks for select using(exists(select 1 from routine_items i where i.id=routine_item_id and i.user_id=any(select household_read_scope(auth.uid()))));

drop policy if exists own_observation_log on observation_log;
create policy observation_log_select on observation_log for select using(user_id=any(select household_read_scope(auth.uid())));
create policy observation_log_insert on observation_log for insert with check(user_id=any(select household_write_scope(auth.uid())));
create policy observation_log_delete on observation_log for delete using(user_id=any(select household_write_scope(auth.uid())));

-- mark_treatment_done: a carer's auth.uid() won't equal the treatment's
-- owner user_id, so the lookup now checks household write-scope instead
-- of strict equality, and records who actually pressed done separately
-- from whose record it is.
create or replace function mark_treatment_done(p_treatment_id uuid,p_done_at timestamptz) returns void language plpgsql security invoker set search_path=public as $$
declare p treatments;
begin
  select * into p from treatments where id=p_treatment_id and user_id=any(select household_write_scope(auth.uid()));
  if not found then raise exception 'not found'; end if;
  insert into treatment_log(treatment_id,user_id,done_at,given_product,was_overdue,actor_user_id) values(p.id,p.user_id,p_done_at,p.product_name,p_done_at::date>p.next_due,auth.uid());
  update treatments set last_given=p_done_at::date where id=p.id;
  insert into app_events(user_id,name) values(auth.uid(),'marked_done');
end$$;

commit;
