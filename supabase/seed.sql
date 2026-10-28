-- ============================================================
-- Seed — tells the demo story
-- ============================================================

insert into institutions (id, aicte_id, name, region, required_coverage) values
  ('11111111-1111-1111-1111-111111111111','AICTE-1-1001','Sunrise Institute of Technology','West',500000),
  ('22222222-2222-2222-2222-222222222222','AICTE-1-1002','Green Valley Engineering College','South',750000),
  ('33333333-3333-3333-3333-333333333333','AICTE-1-1003','Metro Institute of Management','North',400000);

-- Sunrise: 5-day coverage gap (the demo hero)
insert into fdr_instruments (id, institution_id, ref_no, bank_name, amount, issue_date, maturity_date, status, verification_state) values
  ('a1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','FDR-2023-001','SBI',500000,'2023-01-01','2024-01-01','renewed','bank_verified'),
  ('a1111111-1111-1111-1111-111111111112','11111111-1111-1111-1111-111111111111','FDR-2024-001','SBI',500000,'2024-01-06','2025-01-06','active','claimed');

update fdr_instruments set parent_fdr_id = 'a1111111-1111-1111-1111-111111111111'
  where id = 'a1111111-1111-1111-1111-111111111112';

-- Green Valley: mismatch pending
insert into fdr_instruments (id, institution_id, ref_no, bank_name, amount, issue_date, maturity_date, status, verification_state) values
  ('b2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','FDR-2024-777','HDFC',750000,'2024-03-01','2026-03-01','active','mismatch');

-- Metro: over-covered (overlap demo)
insert into fdr_instruments (id, institution_id, ref_no, bank_name, amount, issue_date, maturity_date, status, verification_state) values
  ('c3333333-3333-3333-3333-333333333333','33333333-3333-3333-3333-333333333333','FDR-2024-999','ICICI',800000,'2024-06-01','2025-06-01','active','doc_verified'),
  ('c3333333-3333-3333-3333-333333333334','33333333-3333-3333-3333-333333333333','FDR-2024-998','ICICI',300000,'2024-06-01','2025-06-01','active','claimed');

-- Audit seed
insert into audit_log (actor, action, entity_type, entity_id, details) values
  ('system','seed','portal','bootstrap','{"note":"initial seed"}');