/* ─── محرّك المطابقة وحسم المباراة (Matchmaking core) — وحدة نقية ───
   نفس المنطق الذي يعمل داخل معاملة الخادم (transaction)، لكن مستخرَج هنا
   كدوال نقية كي يُختبر حتمياً — بما في ذلك سباق لاعبَين ⇒ مباراة واحدة فقط. */

export interface QueueTicket {
  uid: string;
  name: string;
  rp: number;
  track: string;
  createdAt: number; // ms — يحدّد توسّع نطاق المطابقة مع الانتظار
}

/* تذكرة أقدم من هذا تُعتبر ميتة (انقطع صاحبها) فتُتجاهَل وتُنظَّف */
export const QUEUE_TTL_MS = 60_000;
/* بعد هذا الزمن يُبلَّغ اللاعب أنه لم يجد منافساً (مع إلغاء/إعادة بحث) */
export const SEARCH_TIMEOUT_MS = 30_000;

/* نطاق RP المسموح يتوسّع كلما طال الانتظار — يضمن مباريات عادلة أولاً
   ثم يوسّع تدريجياً حتى يجد أي منافس بعد ~25 ثانية. */
export function mmRange(waitedMs: number): number {
  const steps = Math.floor(Math.max(0, waitedMs) / 5000); // كل 5 ثوانٍ
  return Math.min(150 + steps * 120, 3000);
}

export function isStale(t: QueueTicket, now: number): boolean {
  return now - t.createdAt > QUEUE_TTL_MS;
}

/* يختار أفضل خصم من قائمة المنتظرين:
   - يستبعد النفس والتذاكر الميتة.
   - يحترم نطاق RP المتوسّع بزمن انتظار أقدم التذكرتين.
   - يفضّل الأقرب RP، ثم الأقدم انتظاراً (عدالة + إنصاف للمنتظر).
   نقي وحتمي: نفس المدخلات ⇒ نفس الخصم. */
export function pickOpponent(
  me: QueueTicket,
  candidates: QueueTicket[],
  now: number,
): QueueTicket | null {
  let best: QueueTicket | null = null;
  let bestDiff = Infinity;
  let bestAge = -Infinity;

  for (const c of candidates) {
    if (c.uid === me.uid) continue;
    if (isStale(c, now)) continue;
    const waited = Math.max(now - c.createdAt, now - me.createdAt);
    const range = mmRange(waited);
    const diff = Math.abs(c.rp - me.rp);
    if (diff > range) continue;

    const age = now - c.createdAt;
    if (diff < bestDiff || (diff === bestDiff && age > bestAge)) {
      best = c; bestDiff = diff; bestAge = age;
    }
  }
  return best;
}

/* ─── حسم المباراة ─── */

/* يحسب عدد الإجابات الصحيحة مقابل مفتاح الإجابات (يُنفَّذ على الخادم) */
export function scoreAnswers(key: number[], answers: (number | null)[]): number {
  let s = 0;
  for (let i = 0; i < key.length; i++) {
    if (answers[i] != null && answers[i] === key[i]) s++;
  }
  return s;
}

export type WinnerSide = "a" | "b" | "draw";

export function decideWinner(scoreA: number, scoreB: number): WinnerSide {
  if (scoreA > scoreB) return "a";
  if (scoreB > scoreA) return "b";
  return "draw";
}

/* بذرة حتمية لأسئلة المباراة من معرّفها — يحصل اللاعبان على نفس الترتيب */
export function seedFromMatchId(matchId: string): number {
  let h = 2166136261;
  for (let i = 0; i < matchId.length; i++) {
    h ^= matchId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
