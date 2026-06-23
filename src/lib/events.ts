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
  | "ai_quiz_generated"
  | "council_contact_blocked"
  | "council_message_reported"
  | "page_view";

export type EventProps = Record<string, string | number | boolean | null>;

interface PostHogCapture {
  capture?: (event: string, props?: Record<string, unknown>) => void;
}

function ph(): PostHogCapture | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { posthog?: PostHogCapture }).posthog ?? null;
}

/* معرّف زائر مجهول ثابت — يُولَّد مرة ويُحفظ محلياً.
   يميّز الأجهزة قبل تسجيل الدخول (لحساب الزوار الفريدين في التحليلات).
   ليس هوية شخصية — مجرد رقم عشوائي للعدّ. */
export function visitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("darb_visitor");
    if (!id) {
      id = (crypto?.randomUUID?.() ?? `v${Date.now()}${Math.random().toString(36).slice(2)}`);
      localStorage.setItem("darb_visitor", id);
    }
    return id;
  } catch {
    return "";
  }
}

/* تسجيل زيارة صفحة — مرة واحدة لكل مسار في الجلسة (يقلّل كتابات Firestore).
   PostHog يلتقط كل زيارة تلقائياً؛ هذا فقط للسجل الدائم (تحليلات الأدمن). */
export function trackPageView(path: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = `darb_pv_${path}`;
    if (sessionStorage.getItem(key)) return; // سُجّلت في هذه الجلسة
    sessionStorage.setItem(key, "1");
  } catch { /* لو تعذّر sessionStorage نكمل ونسجّل */ }
  trackEvent("page_view", { path, visitorId: visitorId() });
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
