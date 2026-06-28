"use client";
/* ─── عميل مركز الإشعارات ───
   يجلب إشعارات المستخدم المطابقة من الخادم ويبلّغ بالإحصاءات. التسليم الفعلي
   يمرّ عبر نقل محرّك الإشعار الحالي (InAppTransport) — لا تكرار لمنطق المحرّك. */
import { authedFetch } from "@/lib/authFetch";

export interface ActiveBroadcast {
  id: string;
  type: string;
  title: string;
  body: string;
  targetPage: string | null;
  createdAt: number;
}

export async function fetchActiveBroadcasts(): Promise<ActiveBroadcast[]> {
  try {
    const res = await authedFetch("/api/admin/broadcast", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "activeForUser" }),
    });
    if (!res.ok) return [];
    const data = await res.json() as { broadcasts?: ActiveBroadcast[] };
    return data.broadcasts ?? [];
  } catch { return []; }
}

export type BroadcastEvent = "delivered" | "opened" | "dismissed";

export function reportBroadcast(id: string, event: BroadcastEvent): void {
  try {
    void authedFetch("/api/admin/broadcast", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "report", id, event }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* صامت */ }
}

/* تتبّع ما عُرض سابقاً (عبر الأجهزة محلياً) كي لا يتكرر الإشعار نفسه */
const SEEN_KEY = "darb_seen_broadcasts";
export function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]); }
  catch { return new Set(); }
}
export function markSeen(ids: string[]): void {
  try {
    const cur = loadSeen();
    for (const id of ids) cur.add(id);
    /* نحتفظ بآخر 200 معرّف فقط */
    localStorage.setItem(SEEN_KEY, JSON.stringify([...cur].slice(-200)));
  } catch { /* صامت */ }
}
