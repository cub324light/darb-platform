import { NextRequest, NextResponse } from "next/server";
import { getAdminDbOptional, getVerifiedUid } from "@/lib/server/firebaseAdmin";

/* firebase-admin يحتاج Node APIs */
export const runtime = "nodejs";

/* أسماء الأحداث المسموحة — يجب أن تطابق EventName في lib/events.ts.
   حصر القائمة يمنع تلويث السجل بأحداث عشوائية. */
const ALLOWED = new Set([
  "user_registered", "onboarding_completed", "session_started", "session_completed",
  "exam_started", "exam_completed", "question_answered", "skill_rated", "skill_improved",
  "lesson_completed", "card_reviewed", "vault_error_added", "file_uploaded",
  "ai_plan_generated", "ai_explain_requested", "ai_quiz_generated",
]);

/* حد إساءة: 60 حدث بالدقيقة لكل IP (الأحداث متكررة بطبيعتها) */
const attempts = new Map<string, { count: number; reset: number }>();
function allow(ip: string): boolean {
  const now = Date.now();
  const e = attempts.get(ip);
  if (!e || now > e.reset) { attempts.set(ip, { count: 1, reset: now + 60_000 }); return true; }
  if (e.count >= 60) return false;
  e.count++;
  return true;
}

/* تنقية الخصائص: قيم بسيطة فقط، حد أقصى 20 مفتاح، نصوص ≤ 500 حرف */
function sanitizeProps(raw: unknown): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!raw || typeof raw !== "object") return out;
  let n = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (n >= 20) break;
    if (typeof v === "string") { out[k] = v.slice(0, 500); n++; }
    else if (typeof v === "number" && Number.isFinite(v)) { out[k] = v; n++; }
    else if (typeof v === "boolean" || v === null) { out[k] = v; n++; }
  }
  return out;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allow(ip)) {
    return NextResponse.json({ ok: false, error: "محاولات كثيرة" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const name = (body as { name?: unknown })?.name;
  if (typeof name !== "string" || !ALLOWED.has(name)) {
    return NextResponse.json({ ok: false, error: "حدث غير معروف" }, { status: 400 });
  }

  /* السجل اختياري: لو لم تُهيّأ البيئة، نعيد ok بصمت (PostHog غطّى التحليلات) */
  const db = await getAdminDbOptional();
  if (!db) return NextResponse.json({ ok: true, stored: false });

  const uid = await getVerifiedUid(req); // قد يكون null (حدث قبل تسجيل الدخول)
  const props = sanitizeProps((body as { props?: unknown })?.props);

  try {
    const { FieldValue } = await import("firebase-admin/firestore");
    await db.collection("events").add({
      name,
      uid: uid ?? null,
      props,
      ts: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true, stored: true });
  } catch {
    /* لا نُفشل العميل بسبب فشل السجل */
    return NextResponse.json({ ok: true, stored: false });
  }
}
