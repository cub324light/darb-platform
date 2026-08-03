/* ═══════════ قارئ «الآن»/«الجلسة» — طبقة IO للقطة مساري V2 ═══════════
   الوحيد الذي يلمس التخزين لهذه الشاشات. يجمّع المدخلات الحقيقية ويمرّرها للمحرّكات
   النقيّة (buildSessionPlan · remainingSteps · computeStats · groupUpcoming · pickDailyMessage).
   لا حساب هنا سوى العدّ والتجميع — والواجهة تعرض فقط. */
import { loadUser, loadStats, loadList, loadTrackExamDates, localDayKey } from "../storage";
import {
  moduleView, memberView, moduleContent, memberContent, isGroup, groupMembers, visibleModules,
  type Workspace, type EligibilityContext,
} from "../modules";
import { toBoardStage } from "../examEligibility";
import { requirementsOf } from "../recommendedExams";
import { orderByPriority, isOnVacation } from "./model";
import { loadRoadmapConfig } from "./store";
import { daysBetween, addDays } from "./metrics";
import { loadCalendar } from "./calendarStore";
import { loadSessions } from "./sessionStore";
import { eventsOnDay, availableStudyMinutes } from "./calendar";
import { ROADMAP_TUNING } from "./config";
import { buildExamPlan, phaseOn, PLAN_MIN_DAYS, type PlanExamInput, type PlanPace, type StagedPlan } from "./examPlan";

export interface PriorityExam {
  kind: "module" | "member"; id: string; label: string; icon?: string; color: string;
  examKey?: string; subjects: { name: string; color: string }[];
}

/** سياقُ الأهلية للطالب الحالي — مصدرٌ واحد لقائمة «إضافة اختبار».
    كان يُشتقّ في كل مستدعٍ على حدة، فيتفرّق تعريفُ «مستهدَف» بين موضعين. */
export function readEligibilityCtx(today: string): EligibilityContext {
  const u = loadUser();
  const stage = toBoardStage({ studyLevel: u?.studyLevel, grade: u?.grade }) ?? "third";
  return {
    stage,
    isUniGrad: u?.gradStage === "خريج جامعة",
    /* «الفصل الأول» يعني أنه لم يُنهِه بعد — والمبكرُ يُتاح بعده */
    afterFirstTerm: u?.academicTerm ? u.academicTerm !== "first" : false,
    /* مستهدَف = اختار وجهةً تتطلّب اختبار قياس */
    isTargeted: requirementsOf(u?.targets ?? []).size > 0,
    today,
  };
}

/** كلُّ اختبارات الطالب الظاهرة في Workspace — مصدرٌ واحد لمن يحتاج القائمة
    (التقويم يسأل: «أيَّ اختبارٍ هذا اليوم؟»)، ولمن يحتاج الأولَ منها. */
export function readAllExams(ws: Workspace): PriorityExam[] {
  const entries: PriorityExam[] = [];
  for (const m of visibleModules(ws)) {
    if (m.kind === "core") continue;
    if (isGroup(m.id)) {
      groupMembers(ws, m.id).forEach((x) => {
        const v = memberView(x.id); const c = memberContent(x.id);
        entries.push({ kind: "member", id: x.id, label: v.label, color: v.color, examKey: c.examKey, subjects: c.subjects ?? [] });
      });
    } else {
      const v = moduleView(m.id); const c = moduleContent(m.id);
      entries.push({ kind: "module", id: m.id, label: v.label, icon: v.icon, color: v.color, examKey: c.examKey, subjects: c.subjects ?? [] });
    }
  }
  return entries;
}

/** وتيرةُ الطالب الحقيقية — متوسّطُ دقائق التركيز في اليوم خلال آخر أسبوع،
    وعددُ الأيام التي فيها بيانات. لا تقديرَ قبل أن يكتمل الأسبوع. */
export function readPace(today: string = localDayKey()): PlanPace {
  const dm = loadStats().dayMins ?? {};
  let total = 0, days = 0;
  for (let k = 0; k < PLAN_MIN_DAYS; k++) {
    const key = addDays(today, -k);
    const v = dm[key];
    if (v != null) { total += v; days++; }
  }
  return { minsPerDay: days > 0 ? Math.round(total / days) : 0, daysMeasured: days };
}

/** خطّةُ الأشهر — تُبنى من اختباراتك ومواعيدها ووتيرتك المقيسة، بحسب النمط
    الذي اخترتَه. تظهر للأنماط الثلاثة: لكلٍّ شكلُ فتراته. */
export function readStagedPlan(ws: Workspace, today: string = localDayKey()): StagedPlan {
  const cfg = loadRoadmapConfig();
  const dates = loadTrackExamDates();
  const ordered = orderByPriority(cfg, readAllExams(ws).map((e) => e.id));
  const byId = new Map(readAllExams(ws).map((e) => [e.id, e]));
  const exams: PlanExamInput[] = ordered.map((id) => {
    const e = byId.get(id)!;
    const c = countRemaining(e.subjects);
    return {
      id: e.id, label: e.label,
      examDate: e.examKey ? (dates[e.examKey] ?? null) : null,
      remainingItems: c.remainingLessons + c.remainingDrills,
    };
  });
  return buildExamPlan({
    mode: cfg.examPlanMode ?? "sequential",
    exams, pace: readPace(today),
    split: cfg.overlapSplit ?? "priority",
    today,
  });
}

/** اختباراتُ الجدول اليوم — يقودها نمطُ التوزيع الذي اختاره الطالب:
    «بالتتابع» ⇒ صاحبُ الأولوية وحده، و«معاً» ⇒ كلُّها مرتّبةً بالأولوية.
    مصدرٌ واحد لكل من يبني جلسةً، فلا تتفرّق قراءةُ النمط بين صفحتين. */
export function readPlanExams(ws: Workspace, today: string = localDayKey()): PriorityExam[] {
  const cfg = loadRoadmapConfig();
  const entries = readAllExams(ws);
  if (entries.length === 0) return [];
  const ordered = orderByPriority(cfg, entries.map((e) => e.id));
  const sorted = ordered.map((id) => entries.find((e) => e.id === id)!).filter(Boolean);
  const mode = cfg.examPlanMode ?? "sequential";
  if (mode === "together") return sorted;
  if (mode === "staged") {
    /* المتداخل: اليومُ يتبع فترتَه — وحده في المنفردة، واثنان في المشتركة.
       وقبل اكتمال أسبوع القياس لا خطّةَ بعد، فنتصرّف كالتتابع. */
    const ph = phaseOn(readStagedPlan(ws, today), today);
    if (!ph) return sorted.slice(0, 1);
    return sorted.filter((e) => ph.examIds.includes(e.id));
  }
  return sorted.slice(0, 1);
}

/** موادُّ الجدول بلا تكرار — اتّحادُ مواد اختبارات النمط الحاليّ. */
export function readPlanSubjects(ws: Workspace): { name: string; color: string }[] {
  const seen = new Map<string, { name: string; color: string }>();
  for (const e of readPlanExams(ws)) for (const s of e.subjects) if (!seen.has(s.name)) seen.set(s.name, s);
  return [...seen.values()];
}

/** الاختبار صاحب الأولوية #1 من Workspace + ترتيب الأولوية المخزّن. */
export function readPriorityExam(ws: Workspace): PriorityExam | null {
  const cfg = loadRoadmapConfig();
  const entries = readAllExams(ws);
  if (entries.length === 0) return null;
  const ordered = orderByPriority(cfg, entries.map((e) => e.id));
  return entries.find((e) => e.id === ordered[0]) ?? entries[0];
}

/* ── عدّ المتبقّي لمواد اختبارٍ (نفس مصادر StudyBody) ── */
interface Counted { remainingLessons: number; remainingDrills: number; weakestSubject: string | null; totalItems: number; doneItems: number; }
export function countRemaining(subjects: { name: string }[]): Counted {
  if (typeof window === "undefined" || !subjects.length)
    return { remainingLessons: 0, remainingDrills: 0, weakestSubject: null, totalItems: 0, doneItems: 0 };
  const done = new Set(loadList<string>("darb_done_lessons"));
  const custom = loadList<{ subject: string; id: string }>("darb_lessons");
  const tItems = loadList<{ subject: string; id: string }>("darb_tadreeb_items");
  const tDone = new Set(loadList<string>("darb_tadreeb_done"));
  let remL = 0, remD = 0, total = 0, hit = 0;
  let weakest: string | null = null, weakestPct = 2;
  for (const s of subjects) {
    const keys = custom.filter((c) => c.subject === s.name).map((c) => `custom-${c.id}`);
    const tr = tItems.filter((t) => t.subject === s.name).map((t) => t.id);
    const sTotal = keys.length + tr.length;
    const sHit = keys.filter((k) => done.has(k)).length + tr.filter((k) => tDone.has(k)).length;
    remL += keys.filter((k) => !done.has(k)).length;
    remD += tr.filter((k) => !tDone.has(k)).length;
    total += sTotal; hit += sHit;
    const pct = sTotal === 0 ? 1 : sHit / sTotal;
    if (pct < weakestPct) { weakestPct = pct; weakest = s.name; }
  }
  return { remainingLessons: remL, remainingDrills: remD, weakestSubject: weakest, totalItems: total, doneItems: hit };
}

/** عدد مهامّ الجلسة المُنجَزة اليوم (من سجلّ الجلسات) — لبطاقة «هدف اليوم». */
export function tasksDoneToday(): number {
  if (typeof window === "undefined") return 0;
  const today = localDayKey();
  return loadSessions().filter((s) => new Date(s.startedAt).toISOString().slice(0, 10) === today).length;
}

/** عدد الأسئلة/التدريبات المُنجَزة فعلاً (مصدرها darb_tadreeb_done) — رقمٌ حقيقيّ لا تقدير. */
export function solvedQuestions(): number {
  if (typeof window === "undefined") return 0;
  return loadList<string>("darb_tadreeb_done").length;
}

export function vaultCount(): number {
  if (typeof window === "undefined") return 0;
  try { const v = JSON.parse(localStorage.getItem("darb_vault") ?? "[]"); return Array.isArray(v) ? v.length : 0; } catch { return 0; }
}

/* ── الوقت المتاح اليوم: ساعات الطالب − أحداث التقويم (block/reduce/busy) ── */
export interface TodayAvailability { minutes: number; adjusted: boolean; blocked: boolean; onVacation: boolean; }
export function readTodayAvailability(): TodayAvailability {
  const today = localDayKey();
  const base = ((loadUser()?.studyHours ?? 0) * 60) || ROADMAP_TUNING.session.fallbackMins;
  const dayEvents = eventsOnDay(loadCalendar(), today);
  const a = availableStudyMinutes({ baseMinutes: base, dayEvents });
  return { minutes: a.availableMinutes, adjusted: a.adjusted, blocked: a.blocked, onVacation: isOnVacation(loadRoadmapConfig(), today) };
}

/* ── إشارات رسالة دويرب اليومية (حقيقية فقط) ── */
export function readDailySignals(ws: Workspace): {
  name?: string; hour: number; rand: number; everStarted: boolean; yesterdayMins: number; streakDays: number; daysToExam: number | null;
} {
  const today = localDayKey();
  const dm = loadStats().dayMins ?? {};
  const everStarted = Object.values(dm).some((v) => v > 0) || ws.modules.some((m) => (m.progress ?? 0) > 0);
  let streakDays = 0;
  for (let k = 0; ; k++) { if ((dm[addDays(today, -k)] ?? 0) > 0) streakDays++; else break; }
  const p = readPriorityExam(ws);
  const examDate = p?.examKey ? (loadTrackExamDates()[p.examKey] ?? null) : null;
  const d = examDate ? daysBetween(today, examDate) : null;
  /* الساعةُ والعشوائيُّ من هنا لا من المحرّك — يبقى نقيّاً يُختبَر */
  return { name: loadUser()?.name, hour: new Date().getHours(), rand: Math.random(), everStarted, yesterdayMins: dm[addDays(today, -1)] ?? 0, streakDays, daysToExam: d != null && d >= 0 ? d : null };
}
