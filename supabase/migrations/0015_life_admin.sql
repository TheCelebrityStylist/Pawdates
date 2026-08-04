begin;

-- ── Life-admin layer ────────────────────────────────────────────────────────
-- Three first-class tables that promote data previously held either as flat
-- columns on pets (insurance) or buried in pet_profile JSONB (emergency vet /
-- backup contact). Each follows the exact household-scoped RLS convention from
-- 0011/0012: user_id is the owner's id (the scope key), read = household_read_scope,
-- write = household_write_scope. Backfills below move the existing data across so
-- nothing is stored in two places going forward.

-- 1. Insurance policies ------------------------------------------------------
create table if not exists insurance_policies(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  provider text not null check(length(provider) between 1 and 160),
  policy_number text check(length(policy_number)<=120),
  coverage_summary text check(length(coverage_summary)<=1000),
  renewal_date date,
  file_path text check(length(file_path)<=400),   -- object key in the private pet-documents bucket
  notes text check(length(notes)<=1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists insurance_policies_pet on insurance_policies(pet_id,created_at desc);
create index if not exists insurance_policies_user on insurance_policies(user_id);
create index if not exists insurance_policies_renewal on insurance_policies(renewal_date);

-- 2. Provider directory ------------------------------------------------------
do $$ begin create type provider_type as enum ('vet','groomer','sitter','walker','boarding','other'); exception when duplicate_object then null; end $$;
create table if not exists providers(
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  type provider_type not null,
  name text not null check(length(name) between 1 and 160),
  phone text check(length(phone)<=60),
  email text check(length(email)<=200),
  notes text check(length(notes)<=1000),
  created_at timestamptz not null default now()
);
create index if not exists providers_pet on providers(pet_id,type);
create index if not exists providers_user on providers(user_id);

-- 3. Emergency info (one row per pet) ---------------------------------------
create table if not exists emergency_info(
  pet_id uuid primary key references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  emergency_contact_name text check(length(emergency_contact_name)<=160),
  emergency_contact_phone text check(length(emergency_contact_phone)<=60),
  vet_name text check(length(vet_name)<=160),
  vet_phone text check(length(vet_phone)<=60),
  care_instructions text check(length(care_instructions)<=2000),
  updated_at timestamptz not null default now()
);
create index if not exists emergency_info_user on emergency_info(user_id);

alter table insurance_policies enable row level security;
alter table providers enable row level security;
alter table emergency_info enable row level security;

do $$ begin
  -- insurance_policies
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='insurance_policies' and policyname='insurance_policies_select') then
    create policy insurance_policies_select on insurance_policies for select using(user_id=any(select household_read_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='insurance_policies' and policyname='insurance_policies_insert') then
    create policy insurance_policies_insert on insurance_policies for insert with check(user_id=any(select household_write_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='insurance_policies' and policyname='insurance_policies_update') then
    create policy insurance_policies_update on insurance_policies for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='insurance_policies' and policyname='insurance_policies_delete') then
    create policy insurance_policies_delete on insurance_policies for delete using(user_id=any(select household_write_scope(auth.uid())));
  end if;
  -- providers
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='providers' and policyname='providers_select') then
    create policy providers_select on providers for select using(user_id=any(select household_read_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='providers' and policyname='providers_insert') then
    create policy providers_insert on providers for insert with check(user_id=any(select household_write_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='providers' and policyname='providers_update') then
    create policy providers_update on providers for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='providers' and policyname='providers_delete') then
    create policy providers_delete on providers for delete using(user_id=any(select household_write_scope(auth.uid())));
  end if;
  -- emergency_info
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='emergency_info' and policyname='emergency_info_select') then
    create policy emergency_info_select on emergency_info for select using(user_id=any(select household_read_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='emergency_info' and policyname='emergency_info_insert') then
    create policy emergency_info_insert on emergency_info for insert with check(user_id=any(select household_write_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='emergency_info' and policyname='emergency_info_update') then
    create policy emergency_info_update on emergency_info for update using(user_id=any(select household_write_scope(auth.uid()))) with check(user_id=any(select household_write_scope(auth.uid())));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='emergency_info' and policyname='emergency_info_delete') then
    create policy emergency_info_delete on emergency_info for delete using(user_id=any(select household_write_scope(auth.uid())));
  end if;
end $$;

-- ── Backfills (idempotent) ──────────────────────────────────────────────────
-- Insurance: move pets.insurance_provider / insurance_policy into the new table.
-- Only for pets that have some insurance recorded and no policy row yet, so a
-- re-run of this migration is safe. The old columns are left in place (inert /
-- deprecated) rather than dropped — dropping is destructive and irreversible;
-- app code no longer reads or writes them after this migration.
insert into insurance_policies(pet_id,user_id,provider,policy_number)
select p.id,p.user_id,coalesce(nullif(p.insurance_provider,''),'Insurance'),nullif(p.insurance_policy,'')
from pets p
where (coalesce(p.insurance_provider,'')<>'' or coalesce(p.insurance_policy,'')<>'')
  and not exists(select 1 from insurance_policies ip where ip.pet_id=p.id);

-- Emergency: lift the vet + backup-contact fields out of pet_profile JSONB.
-- vet name/phone prefer the explicit emergency vet, falling back to the routine
-- vet contact. Only inserts where at least one field is present and no row exists.
insert into emergency_info(pet_id,user_id,emergency_contact_name,emergency_contact_phone,vet_name,vet_phone)
select pp.pet_id,pp.user_id,
  nullif(pp.house_access->>'backupContactName',''),
  nullif(pp.house_access->>'backupContactPhone',''),
  coalesce(nullif(pp.medical->>'emergencyVetName',''),nullif(pp.house_logistics->>'vetName','')),
  coalesce(nullif(pp.medical->>'emergencyVetPhone',''),nullif(pp.house_logistics->>'vetPhone',''))
from pet_profile pp
where (
  coalesce(pp.house_access->>'backupContactName','')<>'' or
  coalesce(pp.house_access->>'backupContactPhone','')<>'' or
  coalesce(pp.medical->>'emergencyVetName','')<>'' or
  coalesce(pp.house_logistics->>'vetName','')<>'' or
  coalesce(pp.medical->>'emergencyVetPhone','')<>'' or
  coalesce(pp.house_logistics->>'vetPhone','')<>''
)
and not exists(select 1 from emergency_info ei where ei.pet_id=pp.pet_id);

-- ── Private document bucket ─────────────────────────────────────────────────
-- Insurance policy documents are sensitive — they go in a PRIVATE bucket
-- (public=false), unlike pet-photos. Objects are owner-folder scoped for direct
-- access; the app serves downloads via short-lived signed URLs minted server-side
-- after a household-scope check, so a link is never public-by-default.
insert into storage.buckets (id, name, public) values ('pet-documents','pet-documents',false) on conflict (id) do nothing;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='pet_documents_owner_read') then
    create policy pet_documents_owner_read on storage.objects for select using(bucket_id='pet-documents' and auth.uid()::text=(storage.foldername(name))[1]);
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='pet_documents_owner_write') then
    create policy pet_documents_owner_write on storage.objects for insert with check(bucket_id='pet-documents' and auth.uid()::text=(storage.foldername(name))[1]);
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='pet_documents_owner_update') then
    create policy pet_documents_owner_update on storage.objects for update using(bucket_id='pet-documents' and auth.uid()::text=(storage.foldername(name))[1]);
  end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='pet_documents_owner_delete') then
    create policy pet_documents_owner_delete on storage.objects for delete using(bucket_id='pet-documents' and auth.uid()::text=(storage.foldername(name))[1]);
  end if;
end $$;

commit;
notify pgrst, 'reload schema';
