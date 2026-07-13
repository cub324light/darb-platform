/* ═══════════════════════════════════════════════════════════════════════
   Memory — طبقة الوصول (السطح العام الموحّد)
   نقطة الاستيراد الوحيدة للمستهلكين: import { memory, ... } from "@/lib/memory"
   لا تلمس أي صفحة المخزن مباشرة — تمرّ عبر هذه الطبقة فقط (وغالباً للقراءة
   عبر buildStudentContext). الكتابة من خطّافات محكومة ومن المحرّكات.
   ═══════════════════════════════════════════════════════════════════════ */
import { MemoryEngine } from "./engine";
import { LocalStore } from "./store";

let _engine: MemoryEngine | null = null;

/** المثيل الافتراضي — مخزن محلي (darb_memory_v1) يُزامَن سحابياً عبر engineSync
    إلى users/{uid}/engine/memory بمعاملة دمج (مسارٌ مستقلّ عن BACKUP_KEYS/cloud.ts). */
export function memory(): MemoryEngine {
  if (!_engine) _engine = new MemoryEngine(new LocalStore());
  return _engine;
}

/* لإعادة الضبط في الاختبارات/التبديل (لا يُستخدم في الإنتاج) */
export function __setMemoryEngine(e: MemoryEngine | null): void { _engine = e; }

/* صيانة مُخنوقة — تُبقي التخزين محدوداً دون تكلفة في كل استدعاء. */
let _lastMaintain = 0;
export function maintainMemory(now: number = Date.now()): void {
  if (now - _lastMaintain < 10 * 60 * 1000) return; // ١٠ دقائق على الأكثر
  _lastMaintain = now;
  try { memory().maintain(); } catch { /* الصيانة لا تُفشل أي شيء */ }
}

export { MemoryEngine, DeterministicSummarizer, decayFactor } from "./engine";
export { InMemoryStore, LocalStore, MEMORY_STORAGE_KEY } from "./store";
export type { MemoryStore } from "./store";
export { MEMORY_REGISTRY, ALL_MEMORY_TYPES, defFor, categoryOf } from "./registry";
export type {
  Memory, AnyMemory, MemoryType, MemoryCategory, MemoryValueMap, MemorySource,
  MemoryStatus, MemoryEvidence, EduStage, RememberInput, MemorySearchFilter,
  MemoryQuery, StudentContext, Summarizer, MemoryTypeDef, MemoryRegistry,
  ExplanationStyle, StudyWindow, Pace, ConsistencyLevel, TonePreference, Sentiment,
} from "./types";
