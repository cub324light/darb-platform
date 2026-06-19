"use client";
/* ─── أعلام الميزات (Feature Flags) عبر PostHog ───
   تتحكّم في تشغيل/إطفاء ميزات بدون نشر جديد — من لوحة PostHog:
   Project → Feature Flags → New feature flag → اكتب المفتاح (key) أدناه.

   الأعلام المعرّفة حالياً (كلها مفعّلة افتراضياً — لا تتأثر إلا لو أطفأتها):
   - "council"   : إظهار بطاقة المجلس في الصفحة الرئيسية
   - "ai_quiz"   : إظهار مولّد أسئلة التدريب في صفحة المراجعة
   - "ai_dueirb" : إظهار مساعد دويرب الذكي

   الاستخدام:
     const on = useFlag("council");          // افتراضي true
     const on = useFlag("beta_feature", false); // افتراضي false
*/
import { useCallback, useSyncExternalStore } from "react";

interface PostHogLike {
  isFeatureEnabled?: (key: string) => boolean | undefined;
  onFeatureFlags?: (cb: () => void) => () => void;
}

function ph(): PostHogLike | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { posthog?: PostHogLike }).posthog ?? null;
}

/* قراءة علم بشكل تفاعلي — يتحدّث تلقائياً حين تصل الأعلام من PostHog.
   الافتراضي true: الميزة تعمل ما لم تُطفأ صراحةً (آمن للنشر). */
export function useFlag(key: string, fallback = true): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const p = ph();
    return p?.onFeatureFlags ? p.onFeatureFlags(cb) : () => {};
  }, []);

  const getSnapshot = useCallback(() => {
    const v = ph()?.isFeatureEnabled?.(key);
    return typeof v === "boolean" ? v : fallback;
  }, [key, fallback]);

  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
