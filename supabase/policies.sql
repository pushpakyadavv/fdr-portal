-- ============================================================
-- RLS — the real authorization layer
-- Run AFTER: schema.sql, views.sql, triggers.sql
-- ============================================================

alter table institutions         enable row level security;
alter table profiles             enable row level security;
alter table fdr_instruments      enable row level security;
alter table documents            enable row level security;
alter table verification_records enable row level security;
alter table workflow_tasks       enable row level security;
alter table audit_log            enable row level security;
alter table notifications        enable row level security;

-- ---- Helper functions (renamed to avoid reserved keywords) ----
create or replace function app_role() returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function app_institution() returns uuid as $$
  select institution_id from profiles where id = auth.uid();
$$ language sql stable security definer;

-- ---- institutions ----
create policy "inst_read_all_auth" on institutions
  for select using (auth.uid() is not null);

create policy "inst_admin_write" on institutions
  for all using (app_role() = 'admin') with check (app_role() = 'admin');

-- ---- profiles ----
create policy "profile_own" on profiles
  for select using (id = auth.uid() or app_role() in ('officer','admin'));

create policy "profile_admin_update" on profiles
  for update using (app_role() = 'admin');

-- ---- fdr_instruments ----
create policy "fdr_read_scoped" on fdr_instruments
  for select using (
    app_role() in ('officer','admin')
    or institution_id = app_institution()
  );

create policy "fdr_institution_insert" on fdr_instruments
  for insert with check (
    app_role() = 'institution'
    and institution_id = app_institution()
  );

create policy "fdr_officer_update" on fdr_instruments
  for update using (app_role() in ('officer','admin'));

create policy "fdr_admin_delete" on fdr_instruments
  for delete using (app_role() = 'admin');

-- ---- documents ----
create policy "doc_read_scoped" on documents
  for select using (
    app_role() in ('officer','admin')
    or exists (
      select 1 from fdr_instruments f
      where f.id = documents.fdr_id and f.institution_id = app_institution()
    )
  );

create policy "doc_institution_insert" on documents
  for insert with check (
    app_role() in ('institution','officer','admin')
  );

-- ---- verification_records ----
create policy "verify_read_scoped" on verification_records
  for select using (
    app_role() in ('officer','admin')
    or exists (
      select 1 from fdr_instruments f
      where f.id = verification_records.fdr_id and f.institution_id = app_institution()
    )
  );

create policy "verify_officer_insert" on verification_records
  for insert with check (app_role() in ('officer','admin'));

-- ---- workflow_tasks ----
create policy "task_read_scoped" on workflow_tasks
  for select using (
    app_role() in ('officer','admin')
    or exists (
      select 1 from fdr_instruments f
      where f.id = workflow_tasks.fdr_id and f.institution_id = app_institution()
    )
  );

create policy "task_institution_insert" on workflow_tasks
  for insert with check (app_role() in ('institution','officer','admin'));

create policy "task_officer_update" on workflow_tasks
  for update using (app_role() in ('officer','admin'));

-- ---- audit_log ---- (immutable: insert + select only)
create policy "audit_insert_all" on audit_log
  for insert with check (true);

create policy "audit_read_officer" on audit_log
  for select using (app_role() in ('officer','admin'));

-- ---- notifications ----
create policy "notif_read_scoped" on notifications
  for select using (
    app_role() = 'admin'
    or (role = app_role() and (
        institution_id is null or institution_id = app_institution()
    ))
    or user_id = auth.uid()
  );

create policy "notif_insert_system" on notifications
  for insert with check (true);

create policy "notif_mark_read" on notifications
  for update using (
    app_role() in ('officer','admin','institution')
    or user_id = auth.uid()
  );