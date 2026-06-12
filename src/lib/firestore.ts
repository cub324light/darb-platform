"use client";
import { doc, setDoc, collection, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

/* ─── UID مستمر في localStorage ─── */
export function getOrCreateUid(): string {
  if (typeof window === "undefined") return "ssr";
  let uid = localStorage.getItem("darb_uid");
  if (!uid) {
    uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem("darb_uid", uid);
  }
  return uid;
}

/* ─── تسجيل مستخدم جديد (عند الـ onboarding) ─── */
export async function registerUser(name: string, track: string) {
  try {
    const uid = getOrCreateUid();
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
}) {
  try {
    const uid = getOrCreateUid();
    await setDoc(doc(db, "users", uid), {
      ...data,
      lastSeen: serverTimestamp(),
    }, { merge: true });
  } catch {}
}

/* ─── جلب كل المستخدمين (للأدمن فقط) ─── */
export interface FirestoreUser {
  id: string;
  name: string;
  track: string;
  streak: number;
  focusMins: number;
  sessions: number;
  silver: number;
  taseesProgress: number;
  joinedAt?: Timestamp;
  lastSeen?: Timestamp;
}

export async function getAllUsers(): Promise<FirestoreUser[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreUser));
}
