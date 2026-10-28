import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: fdrs } = await sb.from("fdr_with_trust")
    .select("*").eq("status", "active");

  const now = Date.now();
  const rows: any[] = [];
  for (const f of fdrs || []) {
    const d = Math.round((new Date(f.maturity_date).getTime() - now) / 86400000);
    let severity = null;
    if (d < 0 || d <= 7) severity = "critical";
    else if (d <= 30) severity = "warn";
    else if (d <= 90) severity = "info";
    if (severity) rows.push({
      role: "officer", institution_id: f.institution_id,
      type: "maturity", severity, entity_id: f.id,
      message: `FDR ${f.ref_no} (${f.bank_name}) ${d < 0 ? "expired" : `matures in ${d}d`}`
    });
    if (f.verification_state === "mismatch") rows.push({
      role: "officer", institution_id: f.institution_id,
      type: "discrepancy", severity: "critical", entity_id: f.id,
      message: `Discrepancy on FDR ${f.ref_no}`
    });
  }
  if (rows.length) await sb.from("notifications").insert(rows);
  return new Response(JSON.stringify({ inserted: rows.length }), {
    headers: { "Content-Type": "application/json" }
  });
});