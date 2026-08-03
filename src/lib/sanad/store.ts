"use client";
/* ═══════════ ربطُ سند — طبقةُ التخزين وحدها ═══════════
   جانبُ الطالب: رمزٌ حيٌّ واحد + قائمةُ أولياء أمره.
   جانبُ الوالد: الطالبُ الذي ربطه (رمزُه ومتى).

   الرمزُ يُكتب في `sessionStorage` لا `localStorage`: هو عابرٌ بطبعه (عشر دقائق)،
   ولا معنى لبقائه بعد إغلاق التطبيق. أمّا الأولياءُ فقرارٌ يبقى. */
import {
  makeCode, addGuardian, removeGuardian, isExpired,
  type PairCode, type Guardian,
} from "./link";

const CODE_KEY = "darb_sanad_code";
const GUARD_KEY = "darb_sanad_guardians";
const PARENT_KEY = "darb_sanad_child";
export const SANAD_CHANGED = "darb:sanadChanged";

const announce = () => { try { window.dispatchEvent(new Event(SANAD_CHANGED)); } catch { /* تجاهل */ } };

/* ── جانبُ الطالب ── */

export function loadCode(): PairCode | null {
  try {
    const raw = sessionStorage.getItem(CODE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PairCode>;
    if (typeof p.code !== "string" || typeof p.issuedAt !== "number") return null;
    if (isExpired(p.issuedAt, Date.now())) return null;
    return { code: p.code, issuedAt: p.issuedAt };
  } catch { return null; }
}

/** رمزٌ جديد — يُبطل ما قبله. الطالبُ وحده من يُنشئه. */
export function issueCode(): PairCode {
  return saveCode(makeCode(Math.random, Date.now()));
}

/** يحفظ رمزاً **أصدره الخادم** — هو مصدرُ الرمز منذ صار الربطُ سحابياً؛
    والمحلّيُّ لا يُعتدّ به إلا كذاكرةٍ للعرض حتى ينتهي عدّاده. */
export function saveCode(c: PairCode): PairCode {
  try { sessionStorage.setItem(CODE_KEY, JSON.stringify(c)); } catch { /* تجاهل */ }
  announce();
  return c;
}

export function clearCode(): void {
  try { sessionStorage.removeItem(CODE_KEY); } catch { /* تجاهل */ }
  announce();
}

export function loadGuardians(): Guardian[] {
  try {
    const raw = localStorage.getItem(GUARD_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? (v as Guardian[]).filter((g) => g && typeof g.id === "string") : [];
  } catch { return []; }
}

function saveGuardians(list: Guardian[]): void {
  try { localStorage.setItem(GUARD_KEY, JSON.stringify(list)); } catch { /* تجاهل */ }
  announce();
}

export function linkGuardian(g: Guardian): Guardian[] {
  const next = addGuardian(loadGuardians(), g);
  saveGuardians(next);
  clearCode();               // الرمزُ يُقرأ مرّةً ثم يموت
  return next;
}

export function unlinkGuardian(id: string): Guardian[] {
  const next = removeGuardian(loadGuardians(), id);
  saveGuardians(next);
  return next;
}

/* ── جانبُ الوالد ── */

/** `studentUid` هو مفتاحُ القراءة السحابية — بلاده لا يعرف الوالدُ أيَّ ملخّصٍ يقرأ. */
export interface LinkedChild { code: string; linkedAt: number; label?: string; studentUid?: string }

export function loadChild(): LinkedChild | null {
  try {
    const raw = localStorage.getItem(PARENT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<LinkedChild>;
    return typeof p.code === "string"
      ? { code: p.code, linkedAt: p.linkedAt ?? 0, label: p.label, studentUid: p.studentUid }
      : null;
  } catch { return null; }
}

export function saveChild(c: LinkedChild): void {
  try { localStorage.setItem(PARENT_KEY, JSON.stringify(c)); } catch { /* تجاهل */ }
  announce();
}

export function forgetChild(): void {
  try { localStorage.removeItem(PARENT_KEY); } catch { /* تجاهل */ }
  announce();
}
