/* ─── كشف تقادم المصادر/المدخلات — وحدة نقية ───
   يحدّد ما يحتاج مراجعة (تجاوز دورية المراجعة) وما انتهت صلاحيته. حتمي. */
import type { Source, KBEntry, ItemStatus } from "./types";

export type FreshnessState = "fresh" | "due" | "stale" | "expired";

export interface FreshnessInfo {
  state: FreshnessState;
  daysSinceVerified: number;
  daysOverdue: number;   // كم تجاوز دورية المراجعة (0 إن لم يتجاوز)
}

const DAY = 86_400_000;

/* يقيّم حداثة مصدر: expired إن مرّ تاريخ الانتهاء، stale إن تجاوز ضعف الدورية،
   due إن تجاوز الدورية، وإلا fresh. */
export function sourceFreshness(s: Source, now: number): FreshnessInfo {
  const daysSince = Math.max(0, Math.floor((now - s.lastVerified) / DAY));
  const overdue = Math.max(0, daysSince - s.reviewCadenceDays);
  let state: FreshnessState = "fresh";
  if (s.expiresAt != null && now >= s.expiresAt) state = "expired";
  else if (daysSince >= s.reviewCadenceDays * 2) state = "stale";
  else if (daysSince >= s.reviewCadenceDays) state = "due";
  return { state, daysSinceVerified: daysSince, daysOverdue: overdue };
}

/* حداثة مدخل معرفة: يعتمد على تاريخ التحقق ودورية افتراضية (180 يوماً) */
export function entryFreshness(e: KBEntry, now: number, cadenceDays = 180): FreshnessInfo {
  const daysSince = Math.max(0, Math.floor((now - e.lastVerified) / DAY));
  const overdue = Math.max(0, daysSince - cadenceDays);
  let state: FreshnessState = "fresh";
  if (e.expiresAt != null && now >= e.expiresAt) state = "expired";
  else if (daysSince >= cadenceDays * 2) state = "stale";
  else if (daysSince >= cadenceDays) state = "due";
  return { state, daysSinceVerified: daysSince, daysOverdue: overdue };
}

export interface StaleReport<T> { item: T; info: FreshnessInfo; }

/* يفحص قائمة مصادر ويُعيد ما يحتاج انتباهاً (due/stale/expired)، الأسوأ أولاً */
export function scanStaleSources(sources: Source[], now: number): StaleReport<Source>[] {
  const order: Record<FreshnessState, number> = { expired: 3, stale: 2, due: 1, fresh: 0 };
  return sources
    .map((item) => ({ item, info: sourceFreshness(item, now) }))
    .filter((r) => r.info.state !== "fresh")
    .sort((a, b) => order[b.info.state] - order[a.info.state] || b.info.daysOverdue - a.info.daysOverdue);
}

/* الحالة المقترحة بعد الفحص: المنتهي يُعطَّل تلقائياً (expired) */
export function suggestedStatus(s: Source, now: number): ItemStatus {
  if (s.status === "disabled") return "disabled";
  return sourceFreshness(s, now).state === "expired" ? "expired" : s.status;
}
