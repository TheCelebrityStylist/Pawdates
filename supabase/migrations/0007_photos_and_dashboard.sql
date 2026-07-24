begin;

insert into storage.buckets (id, name, public) values ('pet-photos', 'pet-photos', true) on conflict (id) do nothing;

-- Captured at the moment a treatment is marked done, comparing p_done_at
-- against the *then-current* next_due (before it's overwritten). Historical
-- rows logged before this column existed stay null ("unknown"), so the
-- dashboard's on-time percentage only ever counts entries it actually knows
-- the answer for, rather than assuming on-time for rows it can't verify.
alter table treatment_log add column if not exists was_overdue boolean;

create or replace function mark_treatment_done(p_treatment_id uuid,p_done_at timestamptz) returns void language plpgsql security invoker as $$
declare p treatments;
begin
  select * into p from treatments where id=p_treatment_id and user_id=auth.uid();
  if not found then raise exception 'not found'; end if;
  insert into treatment_log(treatment_id,user_id,done_at,given_product,was_overdue) values(p.id,p.user_id,p_done_at,p.product_name,p_done_at::date>p.next_due);
  update treatments set last_given=p_done_at::date where id=p.id;
  insert into app_events(user_id,name) values(auth.uid(),'marked_done');
end$$;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='pet_photos_public_read') then
    create policy pet_photos_public_read on storage.objects for select using(bucket_id='pet-photos');
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='pet_photos_owner_write') then
    create policy pet_photos_owner_write on storage.objects for insert with check(bucket_id='pet-photos' and auth.uid()::text=(storage.foldername(name))[1]);
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='pet_photos_owner_update') then
    create policy pet_photos_owner_update on storage.objects for update using(bucket_id='pet-photos' and auth.uid()::text=(storage.foldername(name))[1]);
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='pet_photos_owner_delete') then
    create policy pet_photos_owner_delete on storage.objects for delete using(bucket_id='pet-photos' and auth.uid()::text=(storage.foldername(name))[1]);
  end if;
end $$;

commit;
