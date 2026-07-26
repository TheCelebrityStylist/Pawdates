begin;

create table if not exists milestones(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  actor_user_id uuid references auth.users,
  title text not null check(length(title) between 1 and 120),
  note text check(length(note)<=500),
  photo_path text,
  occurred_on date not null,
  created_at timestamptz not null default now()
);
create index if not exists milestones_pet on milestones(pet_id,occurred_on desc);
alter table milestones enable row level security;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='milestones' and policyname='milestones_select') then
    create policy milestones_select on milestones for select using(user_id=any(select household_read_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='milestones' and policyname='milestones_insert') then
    create policy milestones_insert on milestones for insert with check(user_id=any(select household_write_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='milestones' and policyname='milestones_update') then
    create policy milestones_update on milestones for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='milestones' and policyname='milestones_delete') then
    create policy milestones_delete on milestones for delete using(user_id=any(select household_write_scope(auth.uid())));
  end if;
end $$;

commit;
