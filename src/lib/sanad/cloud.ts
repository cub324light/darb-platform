"use client";
/* ═══════════ سند في السحابة — الجسرُ الذي كان ناقصاً ═══════════
   كان الربطُ كلُّه على جهاز الطالب: الرمزُ في `sessionStorage`، والملخّصُ يُقرأ
   من `localStorage` بـ`readParentDigest`. فالوالدُ على جوّاله لا يرى شيئاً —
   ميزةٌ نصفُها ناقص. هذا الملفُّ يُكمل النصفَ الآخر.

   ثلاثةُ أفعالٍ لا رابع: الطالبُ **يُصدر** رمزاً و**يرفع** ملخّصَه، والوالدُ
   **يُطالب** بالرمز ثم يقرأ. والقراءةُ مباشرةٌ من Firestore لا عبر مسارٍ خادميّ:
   قواعدُ الأمان تحرسها (وليٌّ مرتبطٌ فعلاً وحده)، فالمسارُ زيادةٌ بلا فائدة.

   `firebase` تُستورَد ديناميكياً كعادة المشروع — لا تدخل حزمةَ من لا يحتاجها. */
import { authedFetch } from "../authFetch";
import { readParentDigest } from "../parentDigest";
import { projectDigest, isDigestDoc, type DigestDoc } from "./digestDoc";

export interface CloudCode { code: string; issuedAt: number; expiresAt: number }

/* ── جانبُ الطالب ── */

/** يُصدر رمزاً على الخادم. يرمي برسالةٍ عربيةٍ صالحةٍ للعرض عند الفشل. */
export async function issueCloudCode(): Promise<CloudCode> {
  const res = await authedFetch("/api/sanad/code", { method: "POST" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "تعذّر إصدار رمز");
  return data as CloudCode;
}

/* ▓ لا نرفع ملخّصَ من لم يستعمل سند قطّ. عَلَمٌ محلّيّ يُرفع حين يُصدر الطالبُ
   رمزاً أو يُوجد له وليٌّ — فمن لم يقترب من الميزة لا تُغادر بياناتُه جهازَه
   أصلاً. أرخصُ من قراءةِ قائمةِ الأولياء في كل مزامنة، وأصدقُ في الخصوصية. */
const ACTIVE_KEY = "darb_sanad_active";

export function markSanadActive(on: boolean): void {
  try {
    if (on) localStorage.setItem(ACTIVE_KEY, "1");
    else localStorage.removeItem(ACTIVE_KEY);
  } catch { /* تجاهل */ }
}

export function isSanadActive(): boolean {
  try { return localStorage.getItem(ACTIVE_KEY) === "1"; } catch { return false; }
}

/** يرفع ملخّصَ الطالب. صامتٌ عند الفشل: المزامنةُ لا تُفشل جلسةَ مذاكرة. */
export async function pushDigest(now: number = Date.now()): Promise<boolean> {
  try {
    const { auth, db } = await import("../firebase");
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    const digest = readParentDigest();
    if (!digest) return false;
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "sanadDigests", uid), projectDigest(digest, now));
    return true;
  } catch {
    return false;
  }
}

/** أولياءُ أمر الطالب كما هم في السحابة (المصدرُ الحقيقيّ بعد الربط). */
export async function fetchGuardians(): Promise<{ id: string; name: string | null; relation: string | null; linkedAt: number }[]> {
  try {
    const { auth, db } = await import("../firebase");
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const { collection, getDocs } = await import("firebase/firestore");
    const snap = await getDocs(collection(db, "sanadLinks", uid, "guardians"));
    if (snap.size > 0) markSanadActive(true);
    return snap.docs.map((d) => {
      const v = d.data() as { name?: string; relation?: string; linkedAt?: number };
      return { id: d.id, name: v.name ?? null, relation: v.relation ?? null, linkedAt: v.linkedAt ?? 0 };
    });
  } catch {
    return [];
  }
}

/** يفصل وليّاً — حقُّ الطالب، ويقع فوراً لا بطلبٍ إلى أحد. */
export async function revokeGuardian(guardianUid: string): Promise<boolean> {
  try {
    const { auth, db } = await import("../firebase");
    const uid = auth.currentUser?.uid;
    if (!uid) return false;
    const { doc, deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "sanadLinks", uid, "guardians", guardianUid));
    return true;
  } catch {
    return false;
  }
}

/* ── جانبُ الوليّ ── */

export async function claimCode(code: string, info: { name?: string; relation?: string }): Promise<string> {
  const res = await authedFetch("/api/sanad/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, ...info }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "تعذّر الربط");
  return data.studentUid as string;
}

/** أبناءُ هذا الوليّ — يجدهم من أي جهازٍ يدخل منه. */
export async function fetchChildren(): Promise<string[]> {
  try {
    const { auth, db } = await import("../firebase");
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const { collection, getDocs } = await import("firebase/firestore");
    const snap = await getDocs(collection(db, "sanadGuardians", uid, "children"));
    return snap.docs.map((d) => d.id);
  } catch {
    return [];
  }
}

/** ملخّصُ الابن. `null` = لا وثيقةَ بعد (لم يفتح الطالبُ درب منذ الربط). */
export async function fetchChildDigest(studentUid: string): Promise<DigestDoc | null> {
  try {
    const { db } = await import("../firebase");
    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "sanadDigests", studentUid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return isDigestDoc(data) ? data : null;
  } catch {
    return null;
  }
}
