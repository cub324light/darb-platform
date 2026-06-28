/* ─── تصفية سجلّ التدقيق — وحدة نقية ───
   منطق البحث والتصفية على صفوف السجلّ (قابل للاختبار، يُستعمل في الخادم
   والواجهة). حتمي. */

export interface AuditRow {
  id: string;
  area: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  summary?: string | null;
  before?: string | null;
  after?: string | null;
  changes?: { field: string; before: string; after: string }[] | null;
  actorUid: string;
  actorEmail?: string | null;
  actorRole: string;
  ip?: string | null;
  device?: string | null;
  at: number;
}

export interface AuditQuery {
  q?: string;        // بحث نصّي حر
  area?: string;     // قسم محدّد
  action?: string;   // نوع عملية محدّد
  actor?: string;    // إيميل/uid المشرف
  from?: number;     // من (ms)
  to?: number;       // إلى (ms)
}

function norm(s: string): string {
  return s.toLowerCase().trim();
}

/* يطابق صفّاً واحداً مع الاستعلام */
export function matchesAudit(row: AuditRow, query: AuditQuery): boolean {
  if (query.area && row.area !== query.area) return false;
  if (query.action && row.action !== query.action) return false;
  if (query.from != null && row.at < query.from) return false;
  if (query.to != null && row.at > query.to) return false;

  if (query.actor) {
    const a = norm(query.actor);
    const hit = norm(row.actorEmail ?? "").includes(a) || norm(row.actorUid).includes(a);
    if (!hit) return false;
  }

  if (query.q) {
    const q = norm(query.q);
    const hay = [
      row.area, row.action, row.summary ?? "", row.targetId ?? "",
      row.targetType ?? "", row.actorEmail ?? "", row.actorUid, row.ip ?? "",
    ].map(norm).join(" ");
    if (!hay.includes(q)) return false;
  }
  return true;
}

/* يصفّي ويُرتّب تنازلياً بالوقت */
export function filterAudit(rows: AuditRow[], query: AuditQuery): AuditRow[] {
  return rows.filter((r) => matchesAudit(r, query)).sort((a, b) => b.at - a.at);
}

/* تجميع عدد العمليات لكل قسم (لرأس اللوحة) */
export function countByArea(rows: AuditRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.area] = (out[r.area] ?? 0) + 1;
  return out;
}
