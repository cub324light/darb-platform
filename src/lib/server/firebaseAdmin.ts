/* ─── طبقة firebase-admin الموحّدة (خادمية فقط) ───
   نقطة واحدة لتهيئة Admin SDK، التحقق من هوية المستخدم (ID Token)،
   وفحص كلمة الأدمن — بدل تكرارها في كل راوت.

   لا تستوردها أبداً من كود العميل: تعتمد على FIREBASE_SERVICE_ACCOUNT. */

import { timingSafeEqual } from "crypto";
import type { App } from "firebase-admin/app";

/* تهيئة كسولة لمرة واحدة. لا نُخزّن الوعد عند الفشل حتى نعيد المحاولة
   بعد ضبط المتغيّر (بدل تثبيت خطأ دائم). */
let appPromise: Promise<App> | null = null;

async function buildApp(): Promise<App> {
  const { initializeApp, getApps, cert, applicationDefault } = await import("firebase-admin/app");
  if (getApps().length > 0) return getApps()[0]!;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    let parsed: object;
    try { parsed = JSON.parse(sa); }
    catch { throw new Error("FIREBASE_SERVICE_ACCOUNT ليس JSON صالحاً — تأكد من النسخ الكامل"); }
    return initializeApp({ credential: cert(parsed as Parameters<typeof cert>[0]) });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault(), projectId: "my-education-platform-a160e" });
  }
  throw new Error("FIREBASE_SERVICE_ACCOUNT غير مضبوط — أضفه في إعدادات Vercel ثم أعد النشر");
}

export async function getAdminApp(): Promise<App> {
  if (!appPromise) {
    appPromise = buildApp().catch((e) => { appPromise = null; throw e; });
  }
  return appPromise;
}

/* Firestore — يرمي إن لم تكن البيئة مهيّأة (للمسارات التي تتطلبها) */
export async function getAdminDb() {
  const app = await getAdminApp();
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore(app);
}

/* Firestore اختياري — يُرجع null بدل الرمي (للمسارات التي تتحمّل غيابه،
   مثل تسجيل استهلاك الـ AI: لا نُفشل الرد بسبب غياب المفتاح) */
export async function getAdminDbOptional() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.GOOGLE_APPLICATION_CREDENTIALS) return null;
  try { return await getAdminDb(); } catch { return null; }
}

/* ─── التحقق من هوية المستخدم عبر Firebase ID Token ───
   يقرأ ترويسة Authorization: Bearer <token> ويعيد uid الموثّق، أو null.
   هذا هو البديل الآمن عن الثقة بـ uid القادم من جسم الطلب. */
export async function getVerifiedUid(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    const app = await getAdminApp();
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth(app).verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

/* ─── فحص كلمة الأدمن (بوقت ثابت) ───
   fail-closed: لو ADMIN_PASS غير مضبوط في البيئة، يُرفض كل شيء —
   لا قيمة افتراضية في الكود. */
export function checkAdminPassword(provided: unknown): boolean {
  const expected = process.env.ADMIN_PASS;
  if (!expected) return false;
  if (typeof provided !== "string" || provided.length === 0) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/* ─── RBAC: الأدوار والصلاحيات (خادمي) ─── */
import { type Role, isRole, atLeast } from "@/lib/roles";

/* إيميلات المالك (bootstrap) — المالك يُعرَّف بإيميله فلا يُحبَس خارجاً أبداً،
   ويقدر يبني بقية النظام. يُضبط عبر OWNER_EMAIL (مفصول بفواصل) أو الافتراضي. */
const OWNER_EMAILS = (process.env.OWNER_EMAIL ?? "cublight231@gmail.com")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export function isOwnerEmail(email?: string | null): boolean {
  return !!email && OWNER_EMAILS.includes(email.toLowerCase());
}

export interface Caller { uid: string; email: string | null; role: Role; }

/* يتحقق من ID Token ويرجع دور المتصل.
   الأولوية: إيميل المالك > custom claim. لا نثق بأي مرآة في Firestore
   للترقية (لمنع رفع الصلاحيات الذاتي) — المرآة للعرض فقط. */
export async function getVerifiedRole(req: Request): Promise<Caller | null> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    const app = await getAdminApp();
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth(app).verifyIdToken(token);
    const email = decoded.email ?? null;
    if (isOwnerEmail(email)) return { uid: decoded.uid, email, role: "owner" };
    const claim = (decoded as Record<string, unknown>).role;
    const role: Role = isRole(claim) ? claim : "user";
    return { uid: decoded.uid, email, role };
  } catch {
    return null;
  }
}

/* بوابة موحّدة لعمليات الإدارة. يُصرَّح بأحد طريقين:
   ① كلمة الأدمن (ADMIN_PASS) → تُعامَل كـ«المالك» (break-glass للمالك).
   ② ID Token بدور ≥ الحد المطلوب (RBAC للطاقم).
   تُعيد المتصل المُصرَّح له، أو null. */
export async function authorizeAdmin(
  req: Request,
  body: { password?: unknown },
  min: Role,
): Promise<Caller | null> {
  if (checkAdminPassword(body?.password)) {
    return { uid: "__owner_pass__", email: null, role: "owner" };
  }
  const who = await getVerifiedRole(req);
  if (who && atLeast(who.role, min)) return who;
  return null;
}
