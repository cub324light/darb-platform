/* ═══════════════ طبقة المحتوى — واجهة المستودع (Repository) ═══════════════
   العقد المعمارية (يعتمدها المالك):
   • الكود في Git (Life Engine · World Model · الأنظمة · القواعد · التصميم).
   • المحتوى في قاعدة بيانات (المفاهيم/الدروس/الأسئلة/الكتب/المصادر/الجامعات/…).
   • لا واجهة تلمس قاعدة البيانات مباشرة: UI → Repository → Storage. فلو غيّرنا
     Firestore إلى Supabase/Postgres لاحقاً لا نعيد كتابة الواجهة ولا المنطق.
   • لكل عنصرٍ نسخةٌ وحالة (Draft/Review/Published/Archived) — لا يُعرض للطلاب إلا
     Published.
   • الحقيقة هي الرسم (World Model): المحتوى كيانٌ KBEntity بعلاقاته، لا صفوفٌ منفصلة.

   هذا الملفّ يعرّف العقد (interface + الأنواع) فقط — بلا أي اعتماد على مزوّدٍ بعينه. */
import type { KBEntity, EntityKind, ContentStatus } from "../entities/schema";

export type { ContentStatus };

/* سجلّ محتوى = الكيان (الرسم) + دورة حياته */
export interface ContentRecord {
  entity: KBEntity;
  status: ContentStatus;
  version: number;
  updatedAt: string;   // ISO
  updatedBy?: string;  // معرّف المحرِّر (اختياري)
}

export interface ContentQuery {
  kind?: EntityKind;
  status?: ContentStatus;
  search?: string;     // بحثٌ في الاسم/الملخّص
}

/* عقد المستودع — كل تخزينٍ يحقّقه (Firestore/محلي/غيره) */
export interface ContentRepository {
  /** اسمٌ للعرض في الأدمن (أي مزوّدٍ نعمل عليه الآن) */
  readonly backend: string;
  list(query?: ContentQuery): Promise<ContentRecord[]>;
  get(id: string): Promise<ContentRecord | null>;
  /** إنشاء/تحديث — يحفظ كمسوّدة أو يحافظ على الحالة الحالية إن وُجدت */
  save(entity: KBEntity, opts?: { status?: ContentStatus; updatedBy?: string }): Promise<ContentRecord>;
  setStatus(id: string, status: ContentStatus): Promise<ContentRecord>;
  remove(id: string): Promise<void>;
}

/* ── أدواتٌ مشتركة بين المزوّدات (نقية) ── */
import { normalizeAr } from "../retrieval";

export function matchesQuery(rec: ContentRecord, q?: ContentQuery): boolean {
  if (!q) return true;
  if (q.kind && rec.entity.kind !== q.kind) return false;
  if (q.status && rec.status !== q.status) return false;
  if (q.search?.trim()) {
    const needle = normalizeAr(q.search);
    const hay = [rec.entity.name, rec.entity.nameEn ?? "", rec.entity.summary].map(normalizeAr);
    if (!hay.some((h) => h.includes(needle))) return false;
  }
  return true;
}

/* حالة عنصرٍ من ميتاداتا الكيان (افتراض: منشور لمحتوى البذرة) */
export function statusOf(entity: KBEntity): ContentStatus {
  return entity.meta?.status ?? "published";
}

export function toRecord(entity: KBEntity): ContentRecord {
  return {
    entity,
    status: statusOf(entity),
    version: entity.meta?.version ?? 1,
    updatedAt: entity.meta?.lastUpdated ?? new Date().toISOString().slice(0, 10),
  };
}

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "مسوّدة", review: "مراجعة", published: "منشور", archived: "مؤرشف",
};
export const STATUS_FLOW: ContentStatus[] = ["draft", "review", "published", "archived"];
