/* ═══════════ محوّل تخزين الجلسات — طبقة IO رقيقة ═══════════
   يُلحِق سجلّ كل جلسةٍ منتهية (StudySessionLog) — مصدر إحصاءات الساعة/المادة/الاختبار. */
import type { StudySessionLog } from "./session";

const KEY = "darb_sessions";
const CAP = 1000; // نحتفظ بآخر ألف جلسة (يكفي لكل الإحصاءات)

export function loadSessions(): StudySessionLog[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(KEY); const arr = raw ? JSON.parse(raw) : null; return Array.isArray(arr) ? arr : []; }
  catch { return []; }
}

export function saveSessions(sessions: StudySessionLog[]): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(sessions.slice(-CAP))); } catch { /* تجاهل */ }
}

/** يُلحِق جلسةً منتهية ويعيد القائمة المحدّثة. */
export function appendSession(log: StudySessionLog): StudySessionLog[] {
  const next = [...loadSessions(), log];
  saveSessions(next); return next;
}
