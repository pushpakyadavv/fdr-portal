-- ============================================================
-- Views — trust scores computed server-side (not spoofable)
-- ============================================================

-- Trust score per instrument
create or replace view fdr_with_trust as
select
  f.*,
  case f.verification_state
    when 'bank_verified' then 100
    when 'doc_verified'  then 70
    when 'claimed'       then 40
    when 'mismatch'      then 0
  end as trust_score,
  i.name as institution_name,
  i.aicte_id as institution_aicte_id,
  i.region,
  i.required_coverage,
  (f.maturity_date - current_date) as days_to_maturity
from fdr_instruments f
join institutions i on i.id = f.institution_id;

-- Institution-level aggregate
create or replace view institution_trust_summary as
select
  i.id as institution_id,
  i.name,
  i.aicte_id,
  i.region,
  i.required_coverage,
  count(f.id) filter (where f.status = 'active') as active_count,
  coalesce(sum(f.amount) filter (where f.status = 'active'), 0) as total_active_amount,
  round(avg(
    case f.verification_state
      when 'bank_verified' then 100
      when 'doc_verified'  then 70
      when 'claimed'       then 40
      when 'mismatch'      then 0
    end
  ) filter (where f.status = 'active'))::int as avg_trust_score,
  count(f.id) filter (where f.verification_state = 'claimed') as claimed_count,
  count(f.id) filter (where f.verification_state = 'mismatch') as mismatch_count
from institutions i
left join fdr_instruments f on f.institution_id = i.id
group by i.id, i.name, i.aicte_id, i.region, i.required_coverage;