"use client";
/* ─── عميل الأرينا 1v1 ───
   غلاف رفيع حول /api/arena (كل المنطق والكتابة على الخادم) + مراقبة فورية
   عبر Firestore onSnapshot لتذكرة الطابور ووثيقة المباراة. */
import { authedFetch } from "@/lib/authFetch";
import type { MatchQuestion } from "@/lib/arena/questions";

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await authedFetch("/api/arena", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data?.error || "تعذّر الاتصال بالأرينا");
  return data;
}

export interface MyRank { rp: number; winStreak: number; wins: number; losses: number; peakRp: number; rank: string; }
export async function fetchMyRank(): Promise<MyRank> {
  const r = await call<MyRank>({ mode: "me" });
  /* نخبّئ RP محلياً ليُعرَض بسرعة بجانب الاسم في المجلس/الدردشة */
  try { localStorage.setItem("darb_rp", String(r.rp)); } catch { /* تجاهل */ }
  return r;
}

/* RP المخبّأ محلياً (للعرض الفوري بلا نداء شبكة) — null إن لم يُجلب بعد */
export function getCachedRp(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem("darb_rp");
    return v != null && v !== "" && Number.isFinite(+v) ? +v : null;
  } catch { return null; }
}

export interface LeaderRow { uid: string; name: string; track: string; rp: number; rank: string; }
export function fetchLeaderboard() { return call<{ leaderboard: LeaderRow[] }>({ mode: "leaderboard" }); }

export interface EnqueueResult { matched: boolean; matchId?: string; createdAt?: number; }
export function enqueue(track: string) { return call<EnqueueResult>({ mode: "enqueue", track }); }

export function cancelQueue() { return call<{ ok: boolean }>({ mode: "cancel" }).catch(() => ({ ok: false })); }

export interface RpDelta { oldRP: number; newRP: number; delta: number; promoted: boolean; demoted: boolean; streakBonus: number; }
export interface MatchResult {
  winnerUid: string | null;
  draw: boolean;
  scores: Record<string, number>;
  rp: Record<string, RpDelta>;
}
export interface SubmitResult { resolved: boolean; waiting?: boolean; result?: MatchResult; alreadyResolved?: boolean; }
export function submitMatch(matchId: string, answers: (number | null)[]) {
  return call<SubmitResult>({ mode: "submit", matchId, answers });
}
export function leaveMatch(matchId: string) {
  return call<SubmitResult>({ mode: "leave", matchId, answers: [] }).catch(() => ({ resolved: false }));
}

export interface MatchPlayer { name: string; rp: number; rank: string; track: string; }
export interface MatchDoc {
  playerUids: string[];
  players: Record<string, MatchPlayer>;
  track: string;
  questions: MatchQuestion[];
  status: "active" | "resolved";
  createdAt: number;
  playUntil: number;
  submissions: Record<string, { score: number; forfeit?: boolean; submittedAt: number }>;
  result?: MatchResult;
}

/* مراقبة تذكرة الطابور: حين تصبح حالتها «matched» نُعيد matchId فوراً.
   تُعيد دالة إلغاء الاشتراك. */
export async function watchTicket(uid: string, onMatched: (matchId: string) => void): Promise<() => void> {
  const { db } = await import("@/lib/firebase");
  const { doc, onSnapshot } = await import("firebase/firestore");
  return onSnapshot(doc(db, "matchQueue", uid), (snap) => {
    const d = snap.data();
    if (d?.status === "matched" && typeof d.matchId === "string") onMatched(d.matchId);
  }, () => { /* أخطاء القراءة تُتجاهَل — العميل يعيد المحاولة بالـ poll */ });
}

/* مراقبة وثيقة المباراة (تقدّم الخصم + الحسم). تُعيد دالة إلغاء الاشتراك. */
export async function watchMatch(matchId: string, onUpdate: (m: MatchDoc) => void): Promise<() => void> {
  const { db } = await import("@/lib/firebase");
  const { doc, onSnapshot } = await import("firebase/firestore");
  return onSnapshot(doc(db, "matches", matchId), (snap) => {
    const d = snap.data();
    if (d) onUpdate(d as MatchDoc);
  }, () => {});
}
