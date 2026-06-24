/* ─── ذاكرة المدرب القصيرة — أحدث تفاعل واحد مع دويرب ───
   لا تُخزِّن محادثات كاملة، فقط السياق المفيد لجلسة اليوم التالية.
   مصدر واحد يُحدِّثه كل component بعد كل رد ناجح. */
import { localDayKey } from "./storage";

export type CoachMode = "schedule" | "progress" | "quiz" | "explain";

export interface CoachInteraction {
  date: string;           // YYYY-MM-DD
  mode: CoachMode;
  summary: string;        // أول 100 حرف من الرد
  subjects?: string[];    // المواد المستخدمة
  goalLine?: string;      // هدف الطالب وقت التفاعل
}

export interface CoachMemory {
  last?: CoachInteraction;
  lastRecommendation?: string; // أهم جملة من تحليل التقدم (لتذكير دقيق)
}

const MEM_KEY = "darb_coach_memory";

export function loadCoachMemory(): CoachMemory {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(MEM_KEY) ?? "{}") as CoachMemory; }
  catch { return {}; }
}

function saveCoachMemory(m: CoachMemory): void {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch {}
}

/* يُستدعى بعد كل رد ناجح من دويرب */
export function recordCoachInteraction(
  mode: CoachMode,
  response: string,
  opts?: { subjects?: string[]; goalLine?: string },
): void {
  const m = loadCoachMemory();
  m.last = {
    date: localDayKey(),
    mode,
    summary: response.replace(/\n+/g, " ").trim().slice(0, 100),
    subjects: opts?.subjects?.length ? opts.subjects : undefined,
    goalLine: opts?.goalLine || undefined,
  };
  // احفظ أهم جملة من تحليل التقدم — للتذكير في الزيارة التالية
  if (mode === "progress") {
    const firstLine = response.split("\n").find((l) => l.trim().length > 10);
    if (firstLine) m.lastRecommendation = firstLine.trim().slice(0, 120);
  }
  saveCoachMemory(m);
}

/* جملة تذكير طبيعية — null إن لا ذاكرة أو قديمة جداً (> 7 أيام) */
export function formatMemoryHint(m: CoachMemory): string | null {
  const last = m.last;
  if (!last) return null;
  const daysDiff = Math.round(
    (new Date().getTime() - new Date(last.date + "T12:00:00").getTime()) / 86_400_000,
  );
  if (daysDiff > 7) return null;

  const subj = last.subjects?.[0];
  const today = daysDiff === 0;

  switch (last.mode) {
    case "schedule":
      return subj
        ? (today ? `بنّينا اليوم جدولاً يشمل ${subj}. هل تريد تعديله؟` : `آخر جدول شمل ${subj}. هل تريد جدولاً جديداً؟`)
        : (today ? "بنّينا جدولاً اليوم. هل تريد تعديله؟" : "آخر مرة أنشأنا جدولاً. هل تريد جديداً؟");
    case "progress":
      return m.lastRecommendation
        ? `آخر مرة: ${m.lastRecommendation.slice(0, 65)}…`
        : (subj ? `آخر مرة ركّزنا على ${subj}. هل تريد تحليلاً جديداً؟` : null);
    case "quiz":
      return subj ? `آخر مرة أنشأنا أسئلة في ${subj}. هل تريد الاستمرار؟` : null;
    case "explain":
      return subj ? `شرحنا مفهوماً في ${subj}. هل يوجد شيء آخر تريد فهمه؟` : null;
    default:
      return null;
  }
}
