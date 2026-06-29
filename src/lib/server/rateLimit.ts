/* ─── تحديد المعدّل لكل مستخدم (دائم، عبر Firestore) ───
   بديل عن العدّاد في الذاكرة (الذي يُصفَّر مع كل instance ولا يُشارَك بينها).
   نافذة منزلقة لكل uid عبر transaction ذرّية. آمن للتوسّع لملايين المستخدمين
   (مفتاح لكل مستخدم). fail-open عند غياب البنية التحتية حتى لا نحبس الشرعيين.
   لا تستوردها من العميل. */
import { getAdminDbOptional } from "./firebaseAdmin";

export async function checkUserRateLimit(
  uid: string,
  limit = 20,
  windowMs = 60_000,
): Promise<boolean> {
  const db = await getAdminDbOptional();
  if (!db) return true; // بيئة تطوير بلا Admin SDK — لا نحبس
  const ref = db.collection("aiRate").doc(uid);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Date.now();
      const data = snap.exists ? (snap.data() as { count?: number; reset?: number }) : null;
      if (!data || now > (data.reset ?? 0)) {
        tx.set(ref, { count: 1, reset: now + windowMs });
        return true;
      }
      if ((data.count ?? 0) >= limit) return false;
      tx.update(ref, { count: (data.count ?? 0) + 1 });
      return true;
    });
  } catch {
    return true; // خطأ بنية تحتية لا يحبس مستخدماً شرعياً
  }
}

/* ─── محدّد معدّل عام دائم (Firestore) — يعمل عبر كل instances ─── */

/* منطق النافذة المنزلقة — نقي وقابل للاختبار */
export interface RateState { count: number; reset: number }
export function rateStep(
  prev: RateState | null, now: number, limit: number, windowMs: number,
): { allow: boolean; next: RateState | null } {
  if (!prev || now > prev.reset) return { allow: limit > 0, next: { count: 1, reset: now + windowMs } };
  if (prev.count >= limit) return { allow: false, next: null };
  return { allow: true, next: { count: prev.count + 1, reset: prev.reset } };
}

/* مفتاح وثيقة آمن (يمنع «/» وأي محرف مسار) */
function safeKey(key: string): string {
  return (key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 256)) || "x";
}

/* محدّد معدّل دائم لأي مفتاح (IP/uid/جلسة/عام) — بديل العدّادات في الذاكرة.
   نافذة منزلقة عبر transaction ذرّية. fail-open عند غياب البنية. */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const db = await getAdminDbOptional();
  if (!db) return true;
  const ref = db.collection("rateLimits").doc(safeKey(key));
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const { allow, next } = rateStep(snap.exists ? (snap.data() as RateState) : null, Date.now(), limit, windowMs);
      if (next) tx.set(ref, next);
      return allow;
    });
  } catch {
    return true;
  }
}

/* ─── حدّ يومي دائم (يُصفَّر مع تغيّر اليوم UTC) — لمنع استنزاف الميزانية ─── */
export function dayKeyUTC(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export interface DailyState { day: string; count: number }
export function dailyStep(
  prev: DailyState | null, today: string, limit: number,
): { allow: boolean; next: DailyState } {
  if (!prev || prev.day !== today) return { allow: limit > 0, next: { day: today, count: 1 } };
  if (prev.count >= limit) return { allow: false, next: prev };
  return { allow: true, next: { day: today, count: prev.count + 1 } };
}

export async function checkDailyLimit(key: string, limit: number): Promise<boolean> {
  const db = await getAdminDbOptional();
  if (!db) return true;
  const today = dayKeyUTC(Date.now());
  const ref = db.collection("rateLimits").doc(safeKey("d_" + key + "_" + today));
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const { allow, next } = dailyStep(snap.exists ? (snap.data() as DailyState) : null, today, limit);
      tx.set(ref, next);
      return allow;
    });
  } catch {
    return true;
  }
}
