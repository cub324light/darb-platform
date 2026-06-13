"use client";
/* ─── تسجيل الدخول + مزامنة كل البيانات مع Firebase ───
   التطبيق يشتغل بدون تسجيل دخول (localStorage). عند تسجيل الدخول
   تُحفظ نسخة كاملة من البيانات في السحابة وتُسترجع على أي جهاز. */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
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
];

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
      return "تسجيل الدخول بالإيميل غير مفعّل — فعّله من Firebase: Authentication ← Sign-in method ← Email/Password";
    default: return "صار خطأ — حاول مرة ثانية";
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
