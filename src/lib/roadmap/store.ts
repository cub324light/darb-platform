/* ═══════════ محوّل تخزين إعداد مساري — طبقة IO رقيقة فوق DarbUser ═══════════
   مصدر حقيقةٍ واحد: كل بيانات الطالب في DarbUser. هذه الطبقة تقرأ/تكتب حقل roadmap فقط،
   والمنطق النقيّ كلّه في model.ts. (فصلٌ صريح: منطقٌ نقيّ ↔ تخزين ↔ واجهة.) */
import { loadUser, saveUser } from "../storage";
import type { RoadmapConfig } from "./model";

export function loadRoadmapConfig(): RoadmapConfig {
  if (typeof window === "undefined") return {};
  return loadUser()?.roadmap ?? {};
}

/** يحفظ الإعداد داخل DarbUser (يُدمج فوق أحدث نسخةٍ تجنّباً لطمس تعديلاتٍ متزامنة). */
export function saveRoadmapConfig(config: RoadmapConfig): void {
  const u = loadUser();
  if (!u) return;
  saveUser({ ...u, roadmap: config });
}

/** يطبّق تحويلاً نقيّاً على الإعداد الحاليّ ويحفظه (قراءة-تعديل-حفظ آمنة). */
export function updateRoadmapConfig(fn: (c: RoadmapConfig) => RoadmapConfig): RoadmapConfig {
  const u = loadUser();
  if (!u) return {};
  const next = fn(u.roadmap ?? {});
  saveUser({ ...u, roadmap: next });
  return next;
}
