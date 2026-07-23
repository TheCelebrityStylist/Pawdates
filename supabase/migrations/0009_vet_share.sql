begin;
alter table pets add column if not exists vet_share_token uuid not null default gen_random_uuid();
alter table pets add column if not exists vet_share_enabled boolean not null default false;
create unique index if not exists pets_vet_share_token on pets(vet_share_token);
commit;
