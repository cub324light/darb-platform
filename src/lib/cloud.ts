"use client";
/* ─── تسجيل الدخول + مزامنة كل البيانات مع Firebase ───
   الدخول إجباري (Google / إيميل). بعد الدخول تُسترجع نسخة
   السحابة إلى localStorage، وتُرفع تلقائياً عند أي تغيير ومغادرة الصفحة. */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { loadUser, loadStats, computeStreak } from "./storage";

/* المفاتيح التي تُحفظ في السحابة (كل بيانات المستخدم) */
const BACKUP_KEYS = [
  "darb_user", "darb_stats", "darb_vault", "darb_cards", "darb_lessons",
  "darb_done_lessons", "darb_posts", "darb_schedule", "darb_exam_date",
  "darb_events", "darb_exam_flow", "darb_stage_reviews",
  "darb_tadreeb_items", "darb_tadreeb_done", "darb_tasreebat_pct",
  "darb_subject_exam_dates", "darb_track_exam_dates", "darb_dash_config",
  "darb_results",
];

/* علم اكتمال أول سحب — يمنع الرفع قبل استرجاع نسخة السحابة */
let initialSyncDone = false;
export function isInitialSyncDone(): boolean { return initialSyncDone; }

/* ─── المصادقة ─── */
export function currentUser(): User | null {
  return auth.currentUser;
}

export function onAuth(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function signUp(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function signOutUser() {
  await fbSignOut(auth);
  initialSyncDone = false;
}

/* ─── Google — popup أولاً دائماً (أكثر موثوقية ويُظهر الأخطاء فوراً)؛
   نلجأ لـ redirect فقط لو المتصفح منع البوب-أب ─── */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as { code?: string })?.code ?? "";
    /* البوب-أب ممنوع/مُغلق (شائع في PWA على الجوال) → جرّب redirect */
    if (
      code === "auth/popup-blocked" ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(auth, provider);
    } else throw e;
  }
}

/* يُستدعى عند إقلاع البوابة لإكمال تسجيل الدخول عبر redirect.
   يرجع رسالة خطأ بالعربي إن فشل، أو null إن لا شيء/نجح. */
export async function consumeRedirectResult(): Promise<string | null> {
  try {
    await getRedirectResult(auth);
    return null;
  } catch (e) {
    const code = (e as { code?: string })?.code ?? "";
    return code ? authErrorMsg(code) : "تعذّر تسجيل الدخول — حاول مرة ثانية";
  }
}

/* رسائل خطأ مفهومة بالعربي */
export function authErrorMsg(code: string): string {
  switch (code) {
    case "auth/invalid-email": return "الإيميل غير صحيح";
    case "auth/email-already-in-use": return "هذا الإيميل مسجّل من قبل — سجّل دخول بدله";
    case "auth/weak-password": return "كلمة المرور قصيرة — ٦ أحرف على الأقل";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "الإيميل أو كلمة المرور غير صحيحة";
    case "auth/too-many-requests": return "محاولات كثيرة — انتظر شوي وحاول مرة ثانية";
    case "auth/network-request-failed": return "تأكد من اتصالك بالإنترنت";
    case "auth/operation-not-allowed":
    case "auth/configuration-not-found":
      return "طريقة الدخول هذي غير مفعّلة — فعّلها من Firebase: Authentication ← Sign-in method";
    case "auth/account-exists-with-different-credential":
      return "عندك حساب بنفس الإيميل بطريقة دخول ثانية — جرّب الطريقة الأخرى";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "أُلغي تسجيل الدخول";
    case "auth/unauthorized-domain":
      return "هذا النطاق غير مصرّح — أضِفه في Firebase: Authentication ← Settings ← Authorized domains";
    default: return "صار خطأ — حاول مرة ثانية";
  }
}

/* ─── المزامنة الأولية: مرة واحدة بعد ثبوت تسجيل الدخول ─── */
/* تُستدعى من البوابة بعد تسجيل الدخول:
   اسحب من السحابة؛ وإن لم توجد نسخة وعندك بيانات محلية ارفعها (ترحيل حساب مجهول قديم). */
export async function initialSync(): Promise<void> {
  /* timeout 6 ثواني — لو Firestore ما ردّ (قواعد غير منشورة مثلاً) نكمل بدونه */
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 6000));
  try {
    await Promise.race([
      (async () => {
        const restored = await pullBackup();
        if (!restored && hasLocalData()) await pushBackup();
      })(),
      timeout,
    ]);
  } catch {
    /* نكمل في كل الأحوال */
  } finally {
    initialSyncDone = true;
  }
}

/* ─── جمع البيانات من localStorage ─── */
function collectBackup(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;
  for (const k of BACKUP_KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) out[k] = v;
  }
  return out;
}

/* ─── رفع نسخة كاملة للسحابة ─── */
export async function pushBackup(): Promise<boolean> {
  const u = auth.currentUser;
  if (!u || typeof window === "undefined") return false;
  try {
    const backup = collectBackup();
    const usr = loadUser();
    const st = loadStats();
    // حقول منظّمة للوحة الأدمن + النسخة الكاملة للاسترجاع
    await setDoc(
      doc(db, "users", u.uid),
      {
        email: u.email ?? null,
        name: usr?.name ?? null,
        track: usr?.track ?? null,
        streak: computeStreak(st),
        focusMins: st.totalFocusMins,
        sessions: st.sessionsCount,
        silver: st.silver,
        backup,
        backupAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch {
    return false;
  }
}

/* ─── استرجاع النسخة من السحابة إلى localStorage ─── */
export async function pullBackup(): Promise<boolean> {
  const u = auth.currentUser;
  if (!u || typeof window === "undefined") return false;
  try {
    const snap = await getDoc(doc(db, "users", u.uid));
    if (!snap.exists()) return false;
    const backup = snap.data().backup as Record<string, string> | undefined;
    if (!backup || Object.keys(backup).length === 0) return false;
    for (const [k, v] of Object.entries(backup)) {
      if (typeof v === "string") localStorage.setItem(k, v);
    }
    return true;
  } catch {
    return false;
  }
}

/* هل توجد بيانات محلية تستحق الحفظ؟ (للتمييز بين جهاز جديد ومستخدم قائم) */
export function hasLocalData(): boolean {
  return !!loadUser();
}
