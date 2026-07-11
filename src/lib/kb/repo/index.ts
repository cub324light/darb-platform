/* ═══════════ مستودع المحتوى — المصنع (اختيار المزوّد) ═══════════
   الواجهة تستدعي getContentRepository() ولا تعرف المزوّد. الافتراض: Firestore
   (الإنتاج). للتطوير/دون اتصال/الاختبار المحلي: علامة localStorage
   «darb_content_backend=local». تبديل قاعدة البيانات مستقبلاً = Adapter جديد هنا فقط. */
import type { ContentRepository } from "./repository";
import { LocalContentRepository } from "./localRepository";
import { FirestoreContentRepository } from "./firestoreRepository";
import { withHistory } from "./history";

export * from "./repository";
export { LocalContentRepository } from "./localRepository";
export { FirestoreContentRepository } from "./firestoreRepository";
export { loadHistory, recordHistory, ACTION_LABEL, type HistoryEntry, type HistoryAction } from "./history";

let cached: ContentRepository | null = null;

export function getContentRepository(): ContentRepository {
  if (cached) return cached;
  let useLocal = false;
  if (typeof window !== "undefined") {
    try { useLocal = localStorage.getItem("darb_content_backend") === "local"; } catch { /* تجاهل */ }
  }
  /* كل تعديلٍ يُسجَّل في History تلقائياً عبر الغلاف */
  cached = withHistory(useLocal ? new LocalContentRepository() : new FirestoreContentRepository());
  return cached;
}

/* للاختبار/الحقن: يعيد ضبط المصنع */
export function __setContentRepository(repo: ContentRepository | null) { cached = repo; }
