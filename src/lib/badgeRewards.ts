"use client";
/* ═══════════ صرفُ فضّة الشارات — طبقةُ التخزين وحدها ═══════════
   الشارةُ تُفتح بالإنجاز، وفضّتُها تُصرف **مرّةً واحدة**. المصروفُ يُسجَّل في
   `darb_badges_claimed` فلا يُصرف مرّتين ولو أُعيد فتح الصفحة ألف مرّة.

   والفضةُ تدخل من `addSilver` نفسِها التي يكسب بها «تركيز» — لا رصيدَ ثانٍ. */
import { loadStats, addSilver } from "./storage";
import { getUnlockedBadgeIds, pendingBadgeSilver, BADGE_DEFS } from "./xp";

const KEY = "darb_badges_claimed";
export const BADGES_CLAIMED = "darb:badgesClaimed";

export function loadClaimed(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}

function saveClaimed(ids: string[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* تجاهل */ }
}

export interface ClaimResult { ids: string[]; silver: number }

/**
 * يصرف فضّةَ ما فُتح ولم يُصرف. يُستدعى عند فتح صفحة الإنجازات.
 *
 * ▓ الزائرُ القديم: من فتح شاراتٍ قبل أن توجد الفضةُ لها يأخذها الآن — لا نعاقبه
 *   على أنه سبقنا. ومن لا شيءَ عنده لا يرى شيئاً.
 */
export function claimBadgeSilver(vaultCount: number): ClaimResult {
  if (typeof window === "undefined") return { ids: [], silver: 0 };
  const unlocked = getUnlockedBadgeIds(loadStats(), vaultCount);
  const claimed = loadClaimed();
  const due = pendingBadgeSilver(unlocked, claimed);
  if (due.ids.length === 0) return { ids: [], silver: 0 };
  saveClaimed([...claimed, ...due.ids]);
  if (due.silver > 0) addSilver(due.silver);
  try { window.dispatchEvent(new Event(BADGES_CLAIMED)); } catch { /* تجاهل */ }
  return due;
}

/** أسماءُ ما صُرف الآن — للرسالة التي يراها الطالب. */
export const labelsOf = (ids: string[]): string[] =>
  ids.map((id) => BADGE_DEFS.find((b) => b.id === id)?.label ?? id);
