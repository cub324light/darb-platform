/* ─── باني سياق التوصيات (عميل) ───
   يجمع الإشارات من التخزين والمحرّكات الموجودة ويفوّض للمحرّك النقي.
   مفصول عن recommendation.ts ليبقى المحرّك قابلاً للاختبار باستقلال (بلا تخزين). */
"use client";
import {
  computeRecommendations,
  loadDismissed,
  type RecContext,
  type Recommendation,
} from "./recommendation";
import { loadUser, loadStats, computeStreak, activeExamTrackIds } from "./storage";
import { computeStudentPhase } from "./phase";
import { canApplyUniversity } from "./darbKnowledge";
import { loadGoldenPath } from "./goldenPath";
import { buildExamAlerts } from "./examProvider";
import { memory, maintainMemory } from "./memory";
import { events } from "./events";
import { seedStudentMemory } from "./events/bootstrap";
import type { TrackId } from "./tracks";

const pad = (n: number) => String(n).padStart(2, "0");
const localDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function readDueCards(now: number): number {
  try {
    const c = JSON.parse(localStorage.getItem("darb_cards") ?? "[]");
    return Array.isArray(c) ? c.filter((x: { dueDate: number }) => x.dueDate <= now).length : 0;
  } catch { return 0; }
}

function readUnreviewedErrors(): number {
  try {
    const v = JSON.parse(localStorage.getItem("darb_vault") ?? "[]");
    return Array.isArray(v) ? v.filter((e: { reviewCount?: number }) => (e.reviewCount ?? 0) === 0).length : 0;
  } catch { return 0; }
}

/** يجمع كل إشارات الطالب في سياق واحد للمحرّك. */
export function gatherRecommendationContext(now: number = Date.now()): RecContext {
  /* امنح المستخدمين الحاليين «دماغاً» عبر حدث StudentRegistered (event-sourcing)،
     ثم ابنِ السياق الشخصي. events() يُسجّل المُتفاعلات الأساسية أول استدعاء. */
  events();
  seedStudentMemory();
  maintainMemory(now);   // صيانة مُخنوقة تُبقي التخزين محدوداً
  const studentContext = memory().buildStudentContext();

  const user = loadUser();
  const stats = loadStats();
  const phase = computeStudentPhase(user);
  const d = new Date(now);

  /* المصدر الواحد: اختبارات الطالب من Workspace (لا activeTracks) */
  const ids = activeExamTrackIds() as TrackId[];

  return {
    now,
    hour: d.getHours(),
    user,
    phase,
    goldenPath: loadGoldenPath(d),
    stats: {
      streak: computeStreak(stats),
      todayMins: stats.todayFocusMins ?? 0,
      dueCards: readDueCards(now),
      unreviewedErrors: readUnreviewedErrors(),
      totalFocusMins: stats.totalFocusMins ?? 0,
      sessionsCount: stats.sessionsCount ?? 0,
    },
    examAlerts: ids.length ? buildExamAlerts(ids, localDateStr(d)) : [],
    canApplyUniversity: canApplyUniversity(user),
    dismissed: loadDismissed(),
    memory: studentContext,
  };
}

/** نقطة الدخول للصفحات: التوصيات المرتّبة الجاهزة للعرض. */
export function loadRecommendations(now: number = Date.now()): Recommendation[] {
  if (typeof window === "undefined") return [];
  return computeRecommendations(gatherRecommendationContext(now));
}
