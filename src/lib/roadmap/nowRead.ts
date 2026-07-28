/* ═══════════ قارئ «الآن»/«الجلسة» — طبقة IO للقطة مساري V2 ═══════════
   الوحيد الذي يلمس التخزين لهذه الشاشات. يجمّع المدخلات الحقيقية ويمرّرها للمحرّكات
   النقيّة (buildSessionPlan · remainingSteps · computeStats · groupUpcoming · pickDailyMessage).
   لا حساب هنا سوى العدّ والتجميع — والواجهة تعرض فقط. */
import { loadUser, loadStats, loadList, loadTrackExamDates, localDayKey } from "../storage";
import {
  moduleView, memberView, moduleContent, memberContent, isGroup, groupMembers, visibleModules,
  type Workspace,
} from "../modules";
import { orderByPriority, isOnVacation } from "./model";
import { loadRoadmapConfig } from "./store";
import { daysBetween, addDays } from "./metrics";
import { loadCalendar } from "./calendarStore";
import { loadSessions } from "./sessionStore";
import { eventsOnDay, availableStudyMinutes } from "./calendar";
import { ROADMAP_TUNING } from "./config";

export interface PriorityExam {
  kind: "module" | "member"; id: string; label: string; icon?: string; color: string;
  examKey?: string; subjects: { name: string; color: string }[];
}

/** الاختبار صاحب الأولوية #1 من Workspace + ترتيب الأولوية المخزّن. */
export function readPriorityExam(ws: Workspace): PriorityExam | null {
  const cfg = loadRoadmapConfig();
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
  name?: string; everStarted: boolean; yesterdayMins: number; streakDays: number; daysToExam: number | null;
} {
  const today = localDayKey();
  const dm = loadStats().dayMins ?? {};
  const everStarted = Object.values(dm).some((v) => v > 0) || ws.modules.some((m) => (m.progress ?? 0) > 0);
  let streakDays = 0;
  for (let k = 0; ; k++) { if ((dm[addDays(today, -k)] ?? 0) > 0) streakDays++; else break; }
  const p = readPriorityExam(ws);
  const examDate = p?.examKey ? (loadTrackExamDates()[p.examKey] ?? null) : null;
  const d = examDate ? daysBetween(today, examDate) : null;
  return { name: loadUser()?.name, everStarted, yesterdayMins: dm[addDays(today, -1)] ?? 0, streakDays, daysToExam: d != null && d >= 0 ? d : null };
}
