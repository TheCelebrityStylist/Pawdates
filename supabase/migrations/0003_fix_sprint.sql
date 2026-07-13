alter table app_events add column if not exists metadata jsonb not null default '{}';
create policy insert_own_events on app_events for insert with check(auth.uid()=user_id);
create index if not exists app_events_name_created on app_events(name,created_at);
