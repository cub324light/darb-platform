/* ═══════════════════════════════════════════════════════════════════════
   مزامنة على مستوى الكيان (Entity-level sync) — بديل المزامنة الكتلية LWW
   ───────────────────────────────────────────────────────────────────────
   الذاكرة وسجلّ الأحداث يُزامَنان كوثيقتين منفصلتين خارج وثيقة المستخدم
   (تفادي حدّ 1MB) وبدمج حسب id/version/updatedAt — فلا يضيع عمل جهاز عند
   مزامنة جهاز آخر. الدمج دوال نقيّة قابلة للاختبار. الرفع داخل transaction
   ذرّية فلا سباق قراءة-تعديل-كتابة بين الأجهزة.
   ═══════════════════════════════════════════════════════════════════════ */
"use client";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { nsKey } from "./engineNamespace";
import { MEMORY_STORAGE_KEY } from "./memory";
import { EVENT_LOG_KEY } from "./events/store";
import { mergeMemories, mergeEvents } from "./engineMerge";
import { resetEngineSingletons } from "./engineSession";
import type { AnyMemory } from "./memory/types";
import type { AnyEvent } from "./events/types";

const ENVELOPE_V = 1;

/* ─── قراءة/كتابة محليّة (المفاتيح المنطَّقة) ─── */
function readLocal<T>(baseKey: string, field: "memories" | "events"): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(nsKey(baseKey));
    if (!raw) return [];
    const env = JSON.parse(raw) as Record<string, unknown>;
    const arr = env[field];
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch { return []; }
}
function writeLocal(baseKey: string, field: "memories" | "events", arr: unknown[]): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(nsKey(baseKey), JSON.stringify({ v: ENVELOPE_V, [field]: arr })); } catch { /* الحصّة */ }
}

const memDoc = (uid: string) => doc(db, "users", uid, "engine", "memory");
const evtDoc = (uid: string) => doc(db, "users", uid, "engine", "events");

/* ─── الرفع (transaction ذرّية تمنع سباق الأجهزة) ─── */
export async function pushEngineState(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const now = Date.now();
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(memDoc(uid));
      const cloud = (snap.exists() ? (snap.data().memories as AnyMemory[]) : []) ?? [];
      const merged = mergeMemories(readLocal<AnyMemory>(MEMORY_STORAGE_KEY, "memories"), cloud);
      tx.set(memDoc(uid), { v: ENVELOPE_V, memories: merged });
    });
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(evtDoc(uid));
      const cloud = (snap.exists() ? (snap.data().events as AnyEvent[]) : []) ?? [];
      const merged = mergeEvents(readLocal<AnyEvent>(EVENT_LOG_KEY, "events"), cloud, now);
      tx.set(evtDoc(uid), { v: ENVELOPE_V, events: merged });
    });
  } catch { /* فشل الشبكة — نعيد المحاولة في الدورة التالية */ }
}

/* ─── السحب (دمج السحابة في المحلّي ثم إعادة بناء المحرّكات) ─── */
export async function pullEngineState(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const now = Date.now();
  try {
    const [mSnap, eSnap] = await Promise.all([getDoc(memDoc(uid)), getDoc(evtDoc(uid))]);
    let changed = false;
    if (mSnap.exists()) {
      const merged = mergeMemories(readLocal<AnyMemory>(MEMORY_STORAGE_KEY, "memories"), (mSnap.data().memories as AnyMemory[]) ?? []);
      writeLocal(MEMORY_STORAGE_KEY, "memories", merged);
      changed = true;
    }
    if (eSnap.exists()) {
      const merged = mergeEvents(readLocal<AnyEvent>(EVENT_LOG_KEY, "events"), (eSnap.data().events as AnyEvent[]) ?? [], now);
      writeLocal(EVENT_LOG_KEY, "events", merged);
      changed = true;
    }
    if (changed) resetEngineSingletons(); // المحرّكات تُعيد القراءة من المحلّي المدموج
  } catch { /* نكمل بالمحلّي */ }
}
