"use client";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";

/* ─── معرّف المستخدم: نستخدم UID المصادقة (يطابق قواعد Firestore) ─── */
export function getOrCreateUid(): string {
  return auth.currentUser?.uid ?? "";
}

/* ─── تسجيل مستخدم جديد (عند الـ onboarding) ─── */
export async function registerUser(
  name: string,
  track: string,
  extras?: { school?: string; region?: string; city?: string; phone?: string },
) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const extra: Record<string, string> = {};
    if (extras?.school) extra.school = extras.school;
    if (extras?.region) extra.region = extras.region;
    if (extras?.city)   extra.city   = extras.city;
    if (extras?.phone)  extra.phone  = extras.phone;
    await setDoc(doc(db, "users", uid), {
      name,
      track,
      ...extra,
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
