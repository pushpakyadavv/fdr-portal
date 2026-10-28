-- ============================================================
-- Triggers — immutability, hash-chain, updated_at
-- ============================================================

-- Block audit_log modifications
create or replace function block_audit_tamper() returns trigger as $$
begin
  raise exception 'audit_log is immutable';
end;
$$ language plpgsql;

create trigger no_update_audit before update on audit_log
  for each row execute function block_audit_tamper();
create trigger no_delete_audit before delete on audit_log
  for each row execute function block_audit_tamper();

-- Auto hash-chain audit inserts
create or replace function audit_chain() returns trigger as $$
declare
  last_hash text;
  payload text;
begin
  select hash into last_hash from audit_log order by id desc limit 1;
  if last_hash is null then last_hash := 'GENESIS'; end if;

  payload := coalesce(new.actor,'') || '|' || coalesce(new.action,'') ||
             '|' || coalesce(new.entity_type,'') || '|' || coalesce(new.entity_id,'') ||
             '|' || coalesce(new.details::text,'{}') || '|' || last_hash ||
             '|' || extract(epoch from now())::text;

  new.prev_hash := last_hash;
  new.hash := encode(digest(payload, 'sha256'), 'hex');
  return new;
end;
$$ language plpgsql;

create trigger trg_audit_chain before insert on audit_log
  for each row execute function audit_chain();

-- updated_at on workflow_tasks
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end;
$$ language plpgsql;

create trigger trg_task_touch before update on workflow_tasks
  for each row execute function touch_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, role, full_name)
  values (new.id, 'institution', coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_new_user after insert on auth.users
  for each row execute function handle_new_user();