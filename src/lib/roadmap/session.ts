/* ═══════════ محرّك جلسة المذاكرة (Session Engine V2) — نقيٌّ 100٪ ═══════════
   ▸ لماذا؟ «ابدأ المذاكرة» لا يدخل الدروس مباشرة؛ بل يولّد جلسةً لها هدفٌ واضح («ماذا ستفعل
     اليوم؟») كمدرّبٍ شخصيّ. ▸ المصدر: مواد الاختبار + المتبقّي (دروس/تدريب/أخطاء) + الوقت المتاح
     (من التقويم) + نمط المذاكرة — يجمّعها القارئ. ▸ الهدف: 3 مهامّ كحدٍّ أقصى، كلٌّ بهدف، مع
     رسالةٍ تحفيزية. ▸ الصدق: وقتٌ غير كافٍ (إجازة/مشغول) ⇒ لا جلسة، بل رسالةٌ لطيفة.

   ▓▓▓ V2 — من ترتيبٍ ثابتٍ إلى **محرّك أولويات** ▓▓▓
   كان الترتيبُ مكتوباً في الكود: مراجعة ← تدريب ← أخطاء، مهما كانت حالُ الطالب. فطالبٌ بقي
   على اختباره ثلاثةُ أيام يأخذ نفسَ توزيع طالبٍ بقي له ثلاثةُ أشهر.

   صار المحرّكُ سبعَ مراحلَ مفصولة — **القراءةُ شيء، والحسابُ شيء، والاختيارُ شيء**:
     ①  الإشارات   (تصل جاهزةً من القارئ — المحرّكُ لا يقرأ تخزيناً)
     ②  التطبيع    normalize()      كلُّ إشارةٍ إلى 0..1، والغائبةُ `null` لا صفر
     ③  الأولوية   scoreCandidate() مجموعٌ موزونٌ + أعلى عاملٍ مساهم
     ④  المرشَّحون  candidates()     كلُّ ما يمكن فعلُه اليوم
     ⑤  الاختيار   select()         الأعلى أولويةً أوّلاً، بلا تكرار
     ⑥  الزمن      allocate()       بالموضع لا بالنوع — وتقصيرٌ لا حذف
     ⑦  السبب      reasonFor()      من أعلى عاملٍ وحده، وبلا عاملٍ لا سبب

   ▓ التوافقُ الخلفيّ عقدٌ لا نيّة: الإشاراتُ الأربع الجديدة **اختيارية**، وحين تغيب كلُّها
     يعود الترتيبُ والتوزيعُ إلى ما كانا حرفاً بحرف — تحرسه اختباراتُ V1 كما هي. */
import { ROADMAP_TUNING } from "./config";
import type { StudyMode } from "./model";
import { n, days as daysWord } from "@/lib/format";

export type SessionTaskKind = "review" | "drill" | "errors";

/** العواملُ التي قد تصنع الأولوية — يُذكر أعلاها وحدَه في السبب. */
export type PriorityFactor =
  | "exam-urgency"      // قربُ الاختبار
  | "score-gap"         // درجةٌ دون المئة في مادّة
  | "weak-subject"      // أقلُّ المواد إنجازاً
  | "recent-mistakes"   // أخطاءٌ لم تُراجَع
  | "remaining-units"   // دروسٌ متبقّية
  | "remaining-drills"  // تدريبٌ متبقٍّ
  | "commitment"        // التزامٌ منخفض
  | "readiness";        // جاهزيةٌ منخفضة

export interface SessionTask {
  kind: SessionTaskKind;
  subject?: string;
  label: string;
  goalMins?: number;    // للمراجعة/الأخطاء
  goalCount?: number;   // للتدريب (عدد الأسئلة)
  /* V2 — إضافاتٌ اختيارية لا تكسر أي مستهلك قائم */
  priority?: number;            // درجةُ الأولوية التي رُتّب بها
  topFactor?: PriorityFactor;   // أعلى عاملٍ مساهم (غائبٌ ⇒ لا إشارة)
  reason?: string;              // جملةُ السبب من العامل الأعلى («» ⇒ لا سبب)
  optional?: boolean;           // المهمّةُ الرابعة: تحسينٌ لا واجب
}

export interface SessionPlan {
  available: boolean;
  totalMins: number;
  tasks: SessionTask[];
  motivation: string;
  hint: string;         // يُعرض حين لا جلسة
}

/* سجلّ جلسةٍ منتهية — يُخزَّن (sessionStore) ويغذّي الإحصائيات (أكثر ساعة/مادة/اختبار). */
export interface StudySessionLog {
  id: string;
  examId: string;
  subject?: string;
  taskKind: SessionTaskKind;
  startedAt: number;      // ms
  durationMins: number;
}

/* ─── ① الإشارات: تصل جاهزةً. الأربعُ الأخيرة اختياريةٌ (V2). ─── */
export interface SessionInputs {
  subjects: string[];
  weakestSubject?: string | null;   // مادةٌ يُقترح البدء بها (من التقدّم/الأخطاء)
  remainingLessons: number;
  remainingDrills: number;
  activeErrors: number;
  availableMinutes: number;         // من availableStudyMinutes (التقويم)
  mode?: StudyMode;
  /* ── V2 ── غيابُها يُبقي السلوكَ كما كان تماماً */
  daysUntilExam?: number | null;            // أيامٌ حتى الاختبار المُعلن
  scoreBySubject?: Record<string, number>;  // آخرُ درجةٍ لكل مادّة (0..100)
  commitmentPercentage?: number | null;     // 0..100
  readinessPercentage?: number | null;      // 0..100
}

const clampInt = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(x)));
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/* مقاييسُ التطبيع — مشتقّةٌ من معايرة المسار لا أرقاماً جديدة حيثما أمكن. */
const UNITS_FULL = 40;                                  // «كثيرٌ متبقٍّ» للدروس/التدريب
const PREP_DAYS = ROADMAP_TUNING.proximityPrepDays;     // 60 — أفقُ الاستعداد
const ERRORS_CAP = ROADMAP_TUNING.errorsCap;            // 40
const TASK_MAX_MINS = 45;                               // سقفُ المهمّة الواحدة
const OPTIONAL_MIN_SLACK = 20;                          // فائضٌ يستحقّ مهمّةً رابعة
const OPTIONAL_MAX_MINS = 25;

/* ─── ② التطبيع: كلُّ إشارةٍ إلى 0..1. و`null` تعني **غائبة** لا صفراً —
   فالغائبةُ لا تُسهم ولا تصلح أن تكون سببَ المهمّة. ─── */
interface Normalized {
  urgency: number | null;
  errorLoad: number;
  lessonLoad: number;
  drillLoad: number;
  lowCommitment: number | null;
  lowReadiness: number | null;
  gapOf: (subject?: string) => number | null;
}

function normalize(i: SessionInputs): Normalized {
  const scores = i.scoreBySubject;
  return {
    urgency: i.daysUntilExam == null || !Number.isFinite(i.daysUntilExam)
      ? null : clamp01((PREP_DAYS - i.daysUntilExam) / PREP_DAYS),
    errorLoad: clamp01(i.activeErrors / ERRORS_CAP),
    lessonLoad: clamp01(i.remainingLessons / UNITS_FULL),
    drillLoad: clamp01(i.remainingDrills / UNITS_FULL),
    lowCommitment: i.commitmentPercentage == null ? null : clamp01((100 - i.commitmentPercentage) / 100),
    lowReadiness: i.readinessPercentage == null ? null : clamp01((100 - i.readinessPercentage) / 100),
    gapOf: (s?: string) => {
      const v = s && scores ? scores[s] : undefined;
      return v == null || !Number.isFinite(v) ? null : clamp01((100 - v) / 100);
    },
  };
}

/* ─── ③ الأولوية ───
   أساسٌ لكل نوعٍ + مساهماتٌ موزونة. الأساساتُ مرتّبةٌ عمداً (مراجعة > تدريب > أخطاء)
   حتى إذا غابت الإشاراتُ كلُّها خرج الترتيبُ القديمُ نفسُه. وقربُ الاختبار **يخصم**
   من المراجعة ويضيف إلى التدريب: من بقي له ثلاثةُ أيام لا يبدأ التأسيس. */
const BASE: Record<SessionTaskKind, number> = { review: 0.62, drill: 0.42, errors: 0.34 };

interface Scored { score: number; topFactor?: PriorityFactor }

function scoreCandidate(kind: SessionTaskKind, subject: string | undefined, z: Normalized, isWeakest: boolean): Scored {
  /* كلُّ مساهمةٍ: [العامل، القيمة الموزونة]. الغائبةُ تُسقَط فلا تصير سبباً. */
  const parts: [PriorityFactor, number][] = [];
  const add = (f: PriorityFactor, v: number | null, w: number) => {
    if (v != null && v > 0) parts.push([f, v * w]);
  };

  if (kind === "review") {
    add("remaining-units", z.lessonLoad, 0.35);
    add("score-gap", z.gapOf(subject), 0.45);
    add("readiness", z.lowReadiness, 0.25);
    if (isWeakest) parts.push(["weak-subject", 0.20]);
  } else if (kind === "drill") {
    add("remaining-drills", z.drillLoad, 0.35);
    add("exam-urgency", z.urgency, 0.45);
    add("score-gap", z.gapOf(subject), 0.30);
  } else {
    add("recent-mistakes", z.errorLoad, 0.60);
    add("exam-urgency", z.urgency, 0.25);
    add("commitment", z.lowCommitment, 0.20);
  }

  let score = BASE[kind] + parts.reduce((a, [, v]) => a + v, 0);
  /* خصمُ القرب على المراجعة: كلّما اقترب الاختبار قلّ نفعُ التأسيس. */
  if (kind === "review" && z.urgency != null) score -= z.urgency * 0.30;

  const top = parts.reduce<[PriorityFactor, number] | null>((best, p) => (!best || p[1] > best[1] ? p : best), null);
  return { score, topFactor: top?.[0] };
}

/* ─── ⑦ السبب: من أعلى عاملٍ وحده. وبلا عاملٍ **لا سبب** — لا نخترع. ─── */
function reasonFor(f: PriorityFactor | undefined, i: SessionInputs, subject?: string): string {
  switch (f) {
    case "exam-urgency":
      return i.daysUntilExam == null ? "" : `لأن اختبارك بعد ${daysWord(i.daysUntilExam)}.`;
    case "score-gap": {
      const v = subject && i.scoreBySubject ? i.scoreBySubject[subject] : undefined;
      return v == null ? "" : `لأن درجتك في ${subject} ${n(v)}.`;
    }
    case "weak-subject":
      return subject ? `لأن ${subject} أقل موادك إنجازاً حتى الآن.` : "";
    case "recent-mistakes":
      return `لأن عندك ${errorsWord(i.activeErrors)} في انتظار المراجعة.`;
    case "commitment":
      return "لأن التزامك هذا الأسبوع منخفض.";
    case "readiness":
      return i.readinessPercentage == null ? "" : `لأن جاهزيتك ${n(Math.round(i.readinessPercentage))}٪.`;
    /* الدروسُ/التدريبُ المتبقّيان يراهما الطالبُ في الخطة — لا نعيد وصفَ ما يرى. */
    default:
      return "";
  }
}

function errorsWord(c: number): string {
  if (c === 1) return "خطأ واحد";
  if (c === 2) return "خطأين";
  return `${n(c)} ${c >= 3 && c <= 10 ? "أخطاء" : "خطأً"}`;
}

/* ─── ④ المرشَّحون: كلُّ ما يمكن فعلُه اليوم فعلاً. ─── */
interface Candidate { kind: SessionTaskKind; subject?: string; score: number; topFactor?: PriorityFactor }

function candidates(i: SessionInputs, z: Normalized): Candidate[] {
  const out: Candidate[] = [];
  const subjects = i.subjects.length ? i.subjects : ["الأساسيات"];

  /* اختيارُ V1 نفسُه: المراجعةُ للأضعف (أو الأولى)، والتدريبُ لمادّةٍ أخرى. */
  const first = i.weakestSubject || subjects[0];
  const second = subjects.find((s) => s !== first) || first;

  /* ▓ التوسّعُ **مشروطٌ بوجود ما يفرّق**: بلا `scoreBySubject` تتساوى الموادُّ كلُّها،
     فتوليدُ مرشَّحٍ لكلٍّ منها يقلب الترتيبَ الافتراضيَّ بلا سبب (مراجعة ← مراجعة بدل
     مراجعة ← تدريب). فحين تغيب الدرجاتُ نُبقي مرشَّحاً واحداً لكل نوعٍ كما كان،
     وحين تحضر نفتح البابَ لـ«مراجعة ← مراجعة ← تدريب» عن جدارةٍ لا صدفة. */
  const perSubject = !!i.scoreBySubject;
  const reviewSubjects = perSubject ? subjects : [first];
  const drillSubjects = perSubject ? subjects : [second];

  /* ▓ «الأضعف» إشارةٌ تُعطى لا تُفترض: حين لا يمرّرها القارئُ لا تنال مادّةٌ علاوتَها.
     كنتُ أُسقطها على `subjects[0]` فيفوز ترتيبُ الوصول على درجةٍ حقيقيةٍ أدنى منه. */
  const weakest = i.weakestSubject ?? null;

  for (const s of reviewSubjects) {
    /* المراجعةُ متاحةٌ دائماً: بلا دروسٍ متبقّيةٍ تبقى تثبيتاً — كما كان في V1. */
    out.push({ kind: "review", subject: s, ...scoreCandidate("review", s, z, s === weakest) });
  }
  if (i.remainingDrills > 0) {
    for (const s of drillSubjects) {
      out.push({ kind: "drill", subject: s, ...scoreCandidate("drill", s, z, s === weakest) });
    }
  }
  if (i.activeErrors > 0) out.push({ kind: "errors", ...scoreCandidate("errors", undefined, z, false) });
  return out;
}

/* ─── ⑤ الاختيار: الأعلى أولويةً أوّلاً، بلا تكرارِ (نوع+مادة). ─── */
function select(cands: Candidate[], max: number): Candidate[] {
  const sorted = [...cands].sort((a, b) => b.score - a.score);
  const picked: Candidate[] = [];
  const seen = new Set<string>();
  for (const c of sorted) {
    if (picked.length >= max) break;
    const key = `${c.kind}:${c.subject ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(c);
  }
  return picked;
}

const LABEL: Record<SessionTaskKind, (s?: string) => string> = {
  review: (s) => `مراجعة ${s ?? ""}`.trim(),
  drill: (s) => `تدريب ${s ?? ""}`.trim(),
  errors: () => "",
};

/** يبني خطة جلسة اليوم من المتبقّي الحقيقيّ والوقت المتاح. */
export function buildSessionPlan(i: SessionInputs, cfg = ROADMAP_TUNING.session): SessionPlan {
  const mins = i.availableMinutes;
  if (mins < cfg.minTaskMins) {
    return { available: false, totalMins: 0, tasks: [], motivation: "",
      hint: "اليوم مشغولٌ أو إجازة — خذ راحتك، ونكمل غداً بإذن الله." };
  }

  const z = normalize(i);
  /* ⑥ «قصّرها ولا تحذفها»: عددُ المهامّ محكومٌ بأن تنال كلُّ واحدةٍ حدَّها الأدنى. */
  const room = Math.max(1, Math.floor(mins / cfg.minTaskMins));
  const picked = select(candidates(i, z), Math.min(3, room));

  /* ─── ⑥ الزمن: **بالموضع لا بالنوع** — الأولُ نصفُ الوقت، والثاني ستّون بالمئة
     من الباقي، والثالثُ ما تبقّى (بسقف). هذا توزيعُ V1 نفسُه معمَّماً على أي ترتيب. */
  const tasks: SessionTask[] = [];
  let used = 0;
  picked.forEach((c, pos) => {
    const left = mins - used;
    if (left < cfg.minTaskMins) return;
    let slot: number;
    if (pos === 0) slot = clampInt(mins * 0.5, cfg.minTaskMins, mins);
    else if (pos === 1) slot = Math.max(cfg.minTaskMins, Math.round(left * 0.6));
    else slot = clampInt(left, cfg.minTaskMins, left);
    slot = Math.min(slot, TASK_MAX_MINS, left);

    const reason = reasonFor(c.topFactor, i, c.subject);
    if (c.kind === "drill") {
      const count = clampInt(slot / Math.max(1, cfg.drillPerQuestionMins), 5, Math.max(5, i.remainingDrills));
      tasks.push({ kind: "drill", subject: c.subject, label: LABEL.drill(c.subject), goalCount: count,
        priority: c.score, topFactor: c.topFactor, reason });
      used += count * cfg.drillPerQuestionMins;
    } else if (c.kind === "errors") {
      const errCount = Math.min(i.activeErrors, Math.max(2, Math.round(slot / cfg.minTaskMins)));
      tasks.push({ kind: "errors", label: `مراجعة ${errorsWord(errCount)} من أخطائك السابقة`, goalMins: slot,
        priority: c.score, topFactor: c.topFactor, reason });
      used += slot;
    } else {
      tasks.push({ kind: "review", subject: c.subject, label: LABEL.review(c.subject), goalMins: slot,
        priority: c.score, topFactor: c.topFactor, reason });
      used += slot;
    }
  });

  /* مهمّةٌ رابعة **اختيارية** حين يفيض الوقتُ بعد الثلاث — تحسينٌ لا واجب. */
  const slack = mins - used;
  if (tasks.length === 3 && slack > OPTIONAL_MIN_SLACK) {
    const taken = new Set(tasks.map((t) => `${t.kind}:${t.subject ?? ""}`));
    const extra = [...candidates(i, z)].sort((a, b) => b.score - a.score)
      .find((c) => !taken.has(`${c.kind}:${c.subject ?? ""}`));
    if (extra) {
      const slot = Math.min(slack, OPTIONAL_MAX_MINS);
      const reason = reasonFor(extra.topFactor, i, extra.subject);
      if (extra.kind === "drill") {
        const count = clampInt(slot / Math.max(1, cfg.drillPerQuestionMins), 5, Math.max(5, i.remainingDrills));
        tasks.push({ kind: "drill", subject: extra.subject, label: LABEL.drill(extra.subject), goalCount: count,
          priority: extra.score, topFactor: extra.topFactor, reason, optional: true });
      } else if (extra.kind === "errors") {
        const errCount = Math.min(i.activeErrors, Math.max(2, Math.round(slot / cfg.minTaskMins)));
        tasks.push({ kind: "errors", label: `مراجعة ${errorsWord(errCount)} من أخطائك السابقة`, goalMins: slot,
          priority: extra.score, topFactor: extra.topFactor, reason, optional: true });
      } else {
        tasks.push({ kind: "review", subject: extra.subject, label: LABEL.review(extra.subject), goalMins: slot,
          priority: extra.score, topFactor: extra.topFactor, reason, optional: true });
      }
    }
  }

  const totalMins = tasks.reduce((a, t) => a + (t.goalMins ?? (t.goalCount ?? 0) * cfg.drillPerQuestionMins), 0);
  return { available: true, totalMins, tasks,
    motivation: "⭐ إذا أنهيت الجلسة اليوم سترتفع جاهزيتك.", hint: "" };
}
