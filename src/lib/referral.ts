"use client";
/* ─── نظام الإحالات ───
   رابط الإحالة: /?ref=<uid>. الطالب المُحال يلتقط الكود قبل التسجيل، ويُستبدل
   بعد إتمام الإعداد فيُمنح فضته فوراً. المُحيل يتراكم له رصيد يستلمه من بطاقة
   «ادعُ أصدقاءك» في ملفه. كل حقول الإحالة تُضبط عبر الخادم (Admin) فقط. */
import { postSocial } from "./authFetch";
import { addSilver } from "./storage";

export const REFERRAL_REWARD = 50;

const PENDING_KEY = "darb_ref_pending";
const REDEEMED_KEY = "darb_ref_redeemed";

/* التقط ?ref= من الرابط وخزّنه (قبل التسجيل، ما لم يكن استُبدل سابقاً) */
export function capturePendingRef(): void {
  if (typeof window === "undefined") return;
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref || ref.length < 6 || ref.length > 128) return;
    if (localStorage.getItem(REDEEMED_KEY)) return;
    localStorage.setItem(PENDING_KEY, ref);
  } catch {}
}

/* استبدل الإحالة المعلّقة بعد ثبوت الحساب — يُرجع الفضة الممنوحة (0 إن لا شيء) */
export async function redeemPendingRef(): Promise<number> {
  if (typeof window === "undefined") return 0;
  let code = "";
  try {
    if (localStorage.getItem(REDEEMED_KEY)) return 0;
    code = localStorage.getItem(PENDING_KEY) ?? "";
  } catch {}
  if (!code) return 0;
  try {
    const res = await postSocial({ mode: "redeemReferral", code });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      // علّمها مُستبدَلة دائماً عند رد ناجح (نجاح أو رفض self/مكرّر) حتى لا نكرّر المحاولة
      try { localStorage.setItem(REDEEMED_KEY, "1"); localStorage.removeItem(PENDING_KEY); } catch {}
      if (d.ok && typeof d.reward === "number") {
        addSilver(d.reward);
        return d.reward;
      }
    }
  } catch {}
  return 0;
}

export interface ReferralInfo { code: string; count: number; pendingReward: number; }

export async function getReferral(): Promise<ReferralInfo | null> {
  try {
    const res = await postSocial({ mode: "getReferral" });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.code) {
      return { code: d.code, count: Number(d.count ?? 0), pendingReward: Number(d.pendingReward ?? 0) };
    }
  } catch {}
  return null;
}

/* استلم مكافآت الإحالة المتراكمة → تُضاف فضة محلياً، يُرجع المبلغ المستلَم */
export async function claimRefReward(): Promise<number> {
  try {
    const res = await postSocial({ mode: "claimRefReward" });
    const d = await res.json().catch(() => ({}));
    if (res.ok && typeof d.claimed === "number" && d.claimed > 0) {
      addSilver(d.claimed);
      return d.claimed;
    }
  } catch {}
  return 0;
}

export function referralLink(code: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
}
