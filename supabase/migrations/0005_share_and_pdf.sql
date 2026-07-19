begin;
alter table pets add column if not exists share_token uuid not null default gen_random_uuid();
alter table pets add column if not exists share_enabled boolean not null default false;
create unique index if not exists pets_share_token on pets(share_token);
commit;
