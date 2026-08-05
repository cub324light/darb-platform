/* ─── ذاكرة المدرب القصيرة — أحدث تفاعل واحد مع دويرب ───
   ▓ العطل الذي أُغلق: كان هذا **مخزناً ثانياً للذاكرة** (`darb_coach_memory`)
     تكتبه أربعةُ مكوّناتٍ بيدها مباشرةً ويقرؤه `DuirbHub` — لا يمرّ بحدثٍ ولا
     بمُتفاعِل، ولا يعرف محرّكُ الذاكرة بوجوده. فكان لدويرب ذاكرتان لا تعرف
     إحداهما الأخرى، ولا تُزامَن هذه سحابياً بالمسار الكيانيّ.

   ▓ صار مصدرُ الحقيقة **محرّكَ الذاكرة وحدَه** (`conversation.coachInteraction`)،
     والكتابةُ تمرّ بالطريق نفسِه الذي تمرّ به كلُّ ذاكرة: حدثٌ ← مُتفاعِل ← ذاكرة.
     وهذا الملفُّ بقي واجهةً بنفس أسمائه وأنواعه ومخرجاته — لم يتغيّر على
     مستدعيه حرف، ولا تغيّرت جملةُ التذكير التي يراها الطالب.
   ▓ والقديمُ يُرحَّل مرّةً بلا فقد: أوّلُ قراءةٍ تجد المخزنَ القديم تمرّره في
     الطريق الجديد ثم تحذفه. */
import { localDayKey } from "./storage";
import { memory } from "./memory";

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

const LEGACY_KEY = "darb_coach_memory";
const MEMORY_ID = "conversation.coachInteraction:self";

interface StoredValue {
  mode: CoachMode; summary: string; date: string;
  subjects?: string[]; goalLine?: string; recommendation?: string;
}

/* الكتابةُ الوحيدة — حدثٌ يلتقطه `MemoryReactor`. متزامنٌ في نتيجته لأن
   `remember` كتابةٌ فورية (write-through)، والاستيرادُ ديناميّ كبقيّة المُطلِقين. */
function fire(v: StoredValue): void {
  import("./events").then(({ emit }) => emit({
    eventType: "CoachInteractionUsed",
    metadata: v,
    actor: { kind: "student" }, source: "ui",
  })).catch(() => { /* فشلُ الإطلاق لا يُسقط ردَّ دويرب */ });
}

/* ترحيلُ المخزن القديم مرّةً واحدة — يمرّ بالطريق الجديد نفسِه لا بكتابةٍ مباشرة. */
let migrated = false;
function migrateLegacy(): CoachMemory | null {
  if (migrated || typeof window === "undefined") return null;
  migrated = true;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw) as CoachMemory;
    localStorage.removeItem(LEGACY_KEY);
    if (!old?.last) return null;
    fire({
      mode: old.last.mode, summary: old.last.summary, date: old.last.date,
      subjects: old.last.subjects, goalLine: old.last.goalLine,
      recommendation: old.lastRecommendation,
    });
    return old;
  } catch { return null; }
}

export function loadCoachMemory(): CoachMemory {
  if (typeof window === "undefined") return {};
  const legacy = migrateLegacy();
  try {
    const rec = memory().all().find((m) => m.id === MEMORY_ID);
    if (rec && rec.status === "active") {
      const v = rec.value as StoredValue;
      return {
        last: { date: v.date, mode: v.mode, summary: v.summary, subjects: v.subjects, goalLine: v.goalLine },
        lastRecommendation: v.recommendation,
      };
    }
  } catch { /* المحرّكُ غيرُ متاح — نكتفي بما رُحِّل */ }
  return legacy ?? {};
}

/* يُستدعى بعد كل رد ناجح من دويرب */
export function recordCoachInteraction(
  mode: CoachMode,
  response: string,
  opts?: { subjects?: string[]; goalLine?: string },
): void {
  const prev = loadCoachMemory();
  // احفظ أهم جملة من تحليل التقدم — للتذكير في الزيارة التالية
  let recommendation = prev.lastRecommendation;
  if (mode === "progress") {
    const firstLine = response.split("\n").find((l) => l.trim().length > 10);
    if (firstLine) recommendation = firstLine.trim().slice(0, 120);
  }
  fire({
    mode,
    summary: response.replace(/\n+/g, " ").trim().slice(0, 100),
    date: localDayKey(),
    subjects: opts?.subjects?.length ? opts.subjects : undefined,
    goalLine: opts?.goalLine || undefined,
    recommendation,
  });
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
