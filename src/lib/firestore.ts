"use client";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";

/* ─── معرّف المستخدم: نستخدم UID المصادقة (يطابق قواعد Firestore) ─── */
export function getOrCreateUid(): string {
  return auth.currentUser?.uid ?? "";
}

/* ─── تسجيل مستخدم جديد (عند الـ onboarding) ─── */
export async function registerUser(name: string, track: string) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return; // لا كتابة بدون تسجيل دخول — القواعد ترفضها
    await setDoc(doc(db, "users", uid), {
      name,
      track,
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      streak: 0,
      focusMins: 0,
      sessions: 0,
      silver: 0,
      taseesProgress: 0,
      tadreebProgress: 0,
    }, { merge: true });
  } catch {}
}

/* ─── تحديث بيانات المستخدم (من الداشبورد أو عند تغيير المسار) ─── */
export async function syncUser(data: {
  name?: string;
  track?: string;
  streak?: number;
  focusMins?: number;
  sessions?: number;
  silver?: number;
  taseesProgress?: number;
  tadreebProgress?: number;
}) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await setDoc(doc(db, "users", uid), {
      ...data,
      lastSeen: serverTimestamp(),
    }, { merge: true });
  } catch {}
}
