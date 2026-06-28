/* ─── النسخ (Versioning) — وحدة نقية ───
   تكشف ما تغيّر في مصدر/مدخل بين نسختين وتبني سجلّات التغيير. حتمية. */
import type { Source, KBEntry, KBVersionRecord } from "./types";

/* الحقول المتتبَّعة لكل نوع */
const SOURCE_FIELDS: (keyof Source)[] = ["name", "org", "url", "official", "trust", "fetchMethod", "updateMode", "reviewCadenceDays", "expiresAt", "status", "notes"];
const ENTRY_FIELDS: (keyof KBEntry)[] = ["question", "answer", "keywords", "sourceIds", "trust", "expiresAt", "status"];

function norm(v: unknown): string {
  if (Array.isArray(v)) return v.join("|");
  if (v == null) return "";
  return String(v);
}

export interface FieldChange { field: string; before: string; after: string; }

/* يقارن كائنين ويُعيد الحقول المتغيّرة فقط */
export function diffFields<T extends Record<string, unknown>>(
  before: T | null,
  after: T,
  fields: (keyof T)[],
): FieldChange[] {
  const out: FieldChange[] = [];
  for (const f of fields) {
    const b = norm(before?.[f]);
    const a = norm(after[f]);
    if (b !== a) out.push({ field: String(f), before: b, after: a });
  }
  return out;
}

export function diffSource(before: Source | null, after: Source): FieldChange[] {
  return diffFields(before as unknown as Record<string, unknown> | null, after as unknown as Record<string, unknown>, SOURCE_FIELDS as string[]);
}
export function diffEntry(before: KBEntry | null, after: KBEntry): FieldChange[] {
  return diffFields(before as unknown as Record<string, unknown> | null, after as unknown as Record<string, unknown>, ENTRY_FIELDS as string[]);
}

/* الرقم التالي للنسخة (يزيد فقط عند وجود تغيير فعلي) */
export function nextVersion(currentVersion: number | undefined, hasChanges: boolean): number {
  const cur = typeof currentVersion === "number" && currentVersion > 0 ? currentVersion : 1;
  return hasChanges ? cur + 1 : cur;
}

/* يبني سجلّات نسخة من قائمة تغييرات (لكتابتها في مجموعة kb_versions) */
export function buildVersionRecords(
  targetType: "source" | "entry",
  targetId: string,
  version: number,
  changes: FieldChange[],
  changedBy: string,
  changedAt: number,
): KBVersionRecord[] {
  return changes.map((c, i) => ({
    id: `${targetId}_v${version}_${i}`,
    targetType, targetId, version,
    field: c.field, before: c.before, after: c.after,
    changedBy, changedAt,
  }));
}
