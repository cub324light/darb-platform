"use client";
/* ─── نظام الأحداث الموحّد (Event System) ───
   نقطة واحدة لتسجيل أحداث المنتج: تُرسَل إلى PostHog (تحليلات فورية)
   وإلى Firestore عبر /api/events (سجل دائم للتوصيات والـ AI لاحقاً).

   كلاهما fire-and-forget: لا يرمي ولا يبطّئ واجهة المستخدم أبداً.

   الاستخدام:
     import { trackEvent } from "@/lib/events";
     trackEvent("session_completed", { focusMins: 50, silver: 12 }); */

import { authedFetch } from "./authFetch";

/* تصنيف الأحداث — مصدر الحقيقة الواحد لأسماء الأحداث (type-safe).
   أضِف اسماً هنا لاستخدامه في trackEvent. */
export type EventName =
  | "user_registered"
  | "onboarding_completed"
  | "session_started"
  | "session_completed"
  | "exam_started"
  | "exam_completed"
  | "question_answered"
  | "skill_rated"
  | "skill_improved"
  | "lesson_completed"
  | "card_reviewed"
  | "vault_error_added"
  | "file_uploaded"
  | "ai_plan_generated"
  | "ai_explain_requested"
  | "ai_quiz_generated";

export type EventProps = Record<string, string | number | boolean | null>;

interface PostHogCapture {
  capture?: (event: string, props?: Record<string, unknown>) => void;
}

function ph(): PostHogCapture | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { posthog?: PostHogCapture }).posthog ?? null;
}

/* تسجيل حدث — PostHog فوراً + Firestore في الخلفية */
export function trackEvent(name: EventName, props: EventProps = {}): void {
  if (typeof window === "undefined") return;

  // 1) PostHog — تحليلات فورية
  try { ph()?.capture?.(name, props); } catch { /* صامت */ }

  // 2) Firestore — سجل دائم (خلفي، لا ننتظره)
  try {
    void authedFetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, props }),
      keepalive: true, // يكمل الإرسال حتى لو غادر المستخدم الصفحة
    }).catch(() => {});
  } catch { /* صامت */ }
}
