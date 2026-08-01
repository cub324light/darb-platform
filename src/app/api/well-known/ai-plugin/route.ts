/* بيان الإضافة (ai-plugin) — يُقدَّم على /.well-known/ai-plugin.json عبر rewrite. */
import { SITE } from "@/lib/agent/catalog";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    schema_version: "v1",
    name_for_human: SITE.name,
    name_for_model: "darb",
    description_for_human: SITE.descriptionAr,
    description_for_model:
      "Public, read-only data about Saudi university admissions: universities with their colleges " +
      "and exact majors, national exam registration windows (Qudurat/GAT, Tahsili/SAAT, STEP), the " +
      "official school calendar, and admission FAQs. Never returns personal student data. " +
      "Dates that authorities have not announced are returned empty — do not fabricate them.",
    auth: { type: "none" },
    api: { type: "openapi", url: `${SITE.url}/openapi.json` },
    logo_url: `${SITE.url}/icon.svg`,
    contact_email: "support@usedarb.com",
    legal_info_url: `${SITE.url}/terms`,
  }, { headers: { "cache-control": "public, max-age=3600" } });
}
