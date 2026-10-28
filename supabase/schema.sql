-- ============================================================
-- FDR Trust & Assurance Engine — Schema
-- Run order: schema → views → triggers → policies → seed
-- ============================================================

create extension if not exists "pgcrypto";

-- Institutions
create table institutions (
  id uuid primary key default gen_random_uuid(),
  aicte_id text unique not null,
  name text not null,
  region text not null check (region in ('North','South','East','West','Central')),
  required_coverage numeric not null default 0,
  created_at timestamptz default now()
);

-- Profiles (linked to auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'institution'
       check (role in ('institution','officer','admin')),
  institution_id uuid references institutions(id),
  full_name text,
  created_at timestamptz default now()
);

-- FDR instruments
create table fdr_instruments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  ref_no text not null,
  bank_name text not null,
  amount numeric not null check (amount > 0),
  issue_date date not null,
  maturity_date date not null,
  status text not null default 'active'
       check (status in ('active','matured','renewed','released')),
  verification_state text not null default 'claimed'
       check (verification_state in ('claimed','doc_verified','bank_verified','mismatch')),
  parent_fdr_id uuid references fdr_instruments(id),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  check (maturity_date > issue_date)
);

create index idx_fdr_inst on fdr_instruments(institution_id);
create index idx_fdr_maturity on fdr_instruments(maturity_date) where status = 'active';
create index idx_fdr_verify on fdr_instruments(verification_state);

-- Documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  fdr_id uuid not null references fdr_instruments(id) on delete cascade,
  doc_type text not null check (doc_type in ('fdr_scan','deposit_confirmation','renewal_proof','release_approval')),
  storage_path text not null,     -- private bucket path, NOT a public URL
  original_name text,
  mime_type text,
  size_bytes int,
  checksum_sha256 text,
  uploaded_by uuid references auth.users(id),
  version int default 1,
  uploaded_at timestamptz default now()
);

create index idx_doc_fdr on documents(fdr_id);

-- Verification records
create table verification_records (
  id uuid primary key default gen_random_uuid(),
  fdr_id uuid not null references fdr_instruments(id) on delete cascade,
  source text not null check (source in ('mock_bank_api','qr_checksum','manual_officer')),
  result text not null check (result in ('verified','mismatch','source_unavailable','manual_review')),
  evidence jsonb,
  verified_by uuid references auth.users(id),
  verified_at timestamptz default now()
);

-- Workflow tasks (renewal + release)
create table workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  fdr_id uuid not null references fdr_instruments(id) on delete cascade,
  task_type text not null check (task_type in ('renewal','release')),
  state text not null default 'pending'
       check (state in ('pending','in_review','approved','rejected','completed')),
  requested_by uuid references auth.users(id),
  assigned_to uuid references auth.users(id),
  checklist jsonb default '[]'::jsonb,
  notes text,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_task_state on workflow_tasks(state);
create index idx_task_type on workflow_tasks(task_type);

-- Audit log (immutable, hash-chained)
create table audit_log (
  id bigserial primary key,
  actor text not null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb default '{}'::jsonb,
  prev_hash text not null,
  hash text not null,
  created_at timestamptz default now()
);

create index idx_audit_time on audit_log(created_at desc);

-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  role text check (role in ('officer','institution','admin')),
  institution_id uuid references institutions(id),
  user_id uuid references auth.users(id),
  type text not null,
  severity text not null default 'info' check (severity in ('info','warn','critical')),
  message text not null,
  entity_id text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index idx_notif_unread on notifications(role, is_read) where is_read = false;