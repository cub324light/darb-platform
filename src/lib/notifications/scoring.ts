/* ═══════════════════════════════════════════════════════════════════════
   Notification Scoring — نماذج حتمية نقيّة (لا حالة، لا مزوّد)
   التوقيت التكيّفي والإرهاق والدرجة والقرار — كلها دوال خالصة من
   (سجلّ الأحداث، السياق، الإعدادات، الساعة). قابلة للاختبار بالكامل.
   ═══════════════════════════════════════════════════════════════════════ */
import type { AnyEvent } from "../events/types";
import type { StudyWindow } from "../memory/types";
import {
  type NotificationCandidate, type NotificationType, type DeliveryContext,
  type NotificationScore, type NotificationDecision, type NotificationConfig,
  type QuietWindow,
} from "./types";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const SMOOTH = 1; // تنعيم لابلاس (α)

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/* ─────────── نوافذ الهدوء ─────────── */
function hourInWindow(h: number, w: QuietWindow): boolean {
  return w.startHour <= w.endHour
    ? h >= w.startHour && h < w.endHour
    : h >= w.startHour || h < w.endHour; // التفاف حول منتصف الليل
}
export function inQuietWindow(hour: number, windows: QuietWindow[]): QuietWindow | null {
  for (const w of windows) if (hourInWindow(hour, w)) return w;
  return null;
}

/* ─────────── التوقيت التكيّفي ─────────── */
/** يبني دلاء التوقيت من سجلّ الأحداث (معدّل فتح الإشعار + نشاط المذاكرة حسب الساعة). */
export function buildTimingBuckets(events: AnyEvent[]): {
  openRateByHour: number[]; studyActivityByHour: number[];
} {
  const sent = new Array(24).fill(0);
  const opened = new Array(24).fill(0);
  const study = new Array(24).fill(0);
  const sentHourById = new Map<string, number>();

  for (const e of events) {
    const h = new Date(e.timestamp).getHours();
    if (e.eventType === "NotificationSent") {
      sent[h]++;
      sentHourById.set(e.metadata.notificationId, h);
    } else if (e.eventType === "StudentFinishedSession" || e.eventType === "StudentStartedSession") {
      study[h]++;
    }
  }
  // اربط الفتح بساعة الإرسال (حتى تعكس «متى يُفتح ما يُرسل في هذه الساعة»)
  for (const e of events) {
    if (e.eventType === "NotificationOpened") {
      const h = sentHourById.get(e.metadata.notificationId);
      if (h != null) opened[h]++;
    }
  }

  const openRateByHour = sent.map((s, h) => (opened[h] + SMOOTH) / (s + 2 * SMOOTH));
  const maxStudy = Math.max(1, ...study);
  const studyActivityByHour = study.map((c) => c / maxStudy);
  return { openRateByHour, studyActivityByHour };
}

/* ─────────── الإرهاق ─────────── */
export function computeFatigue(events: AnyEvent[], now: number, cfg: NotificationConfig): {
  fatigue: number; sentLast24h: number; lastSentAt: number | null;
} {
  const sent = events.filter((e) => e.eventType === "NotificationSent");
  const sentLast24h = sent.filter((e) => now - e.timestamp <= DAY_MS).length;
  const lastSentAt = sent.length ? Math.max(...sent.map((e) => e.timestamp)) : null;

  const openedIds = new Set(events.filter((e) => e.eventType === "NotificationOpened").map((e) => e.metadata.notificationId));
  const dismissed = events.filter((e) => e.eventType === "NotificationDismissed").length;

  // سلسلة التجاهل: أحدث الإشعارات المُرسَلة بلا فتح
  const recentSent = [...sent].sort((a, b) => b.timestamp - a.timestamp);
  let ignoreStreak = 0;
  for (const e of recentSent) {
    if (openedIds.has(e.metadata.notificationId)) break;
    ignoreStreak++;
    if (ignoreStreak >= 6) break;
  }

  const volumeNorm = Math.min(1, sentLast24h / Math.max(1, cfg.dailyCap));
  const ignoreNorm = Math.min(1, ignoreStreak / 3);
  const dismissRate = sent.length ? dismissed / sent.length : 0;
  const recencySpike = lastSentAt != null && now - lastSentAt < cfg.cooldownMs
    ? 1 - (now - lastSentAt) / cfg.cooldownMs : 0;

  const fatigue = clamp01(0.35 * volumeNorm + 0.30 * ignoreNorm + 0.20 * dismissRate + 0.15 * recencySpike);
  return { fatigue, sentLast24h, lastSentAt };
}

/* ─────────── أوزان النوع ─────────── */
function typeUrgencyBoost(t: NotificationType): number {
  switch (t) {
    case "streakRecovery": return 0.30;
    case "examCountdown": return 0.20;
    case "universityDeadline": return 0.18;
    case "stepReminder": return 0.12;
    case "reviewReminder": return 0.10;
    case "achievement": return -0.10;
    default: return 0;
  }
}
function typeImportanceWeight(t: NotificationType): number {
  switch (t) {
    case "goalProgress": case "universityDeadline": return 1.0;
    case "examCountdown": return 0.95;
    case "streakRecovery": case "stepReminder": return 0.8;
    case "studyReminder": case "reviewReminder": case "duwairbAdvice": return 0.7;
    case "parentSummary": return 0.6;
    case "achievement": return 0.5;
  }
}
function windowOfHour(h: number): StudyWindow {
  if (h >= 5 && h < 11) return "صباح";
  if (h >= 11 && h < 16) return "ظهر";
  if (h >= 16 && h < 21) return "مساء";
  return "ليل";
}

/* ─────────── الدرجة ─────────── */
export function scoreCandidate(c: NotificationCandidate, ctx: DeliveryContext, cfg: NotificationConfig): NotificationScore {
  // الإلحاح
  const deadlineBoost = c.deadlineDays != null ? 0.4 * (1 - clamp01(c.deadlineDays / 30)) : 0;
  const urgency = clamp01(0.6 * (c.priority / 100) + deadlineBoost + typeUrgencyBoost(c.type));

  // الأهمية (الثقة من التوصية تعكس الذاكرة أصلاً × وزن النوع)
  const importance = clamp01(c.confidence * typeImportanceWeight(c.type));

  // ملاءمة التوقيت
  let timingFit = 0.5 * ctx.openRateByHour[ctx.hour] + 0.5 * ctx.studyActivityByHour[ctx.hour];
  if (ctx.preferredWindow && windowOfHour(ctx.hour) === ctx.preferredWindow) timingFit = Math.max(timingFit, 0.7);
  timingFit = clamp01(timingFit);

  // الثقة أن «الآن» مناسب — تنخفض مع الإرهاق وسوء التوقيت
  const confidence = clamp01(c.confidence * (0.5 + 0.5 * timingFit) * (1 - 0.6 * ctx.fatigue));

  let composite = 0.45 * urgency + 0.25 * importance + 0.30 * confidence;
  if (urgency >= cfg.urgencyOverride) composite = Math.max(composite, 0.8); // تجاوز الإلحاح
  composite = clamp01(composite);

  return { urgency, importance, confidence, composite, bestDeliveryTime: bestDeliveryTime(ctx) };
}

/* ─────────── أفضل وقت تسليم ─────────── */
export function bestDeliveryTime(ctx: DeliveryContext): number {
  let bestH = -1, best = -1;
  for (let h = 0; h < 24; h++) {
    if (inQuietWindow(h, ctx.quietWindows)) continue;
    const s = 0.5 * ctx.openRateByHour[h] + 0.5 * ctx.studyActivityByHour[h];
    if (s > best) { best = s; bestH = h; }
  }
  if (bestH < 0) bestH = (ctx.hour + 1) % 24;
  // أقرب وقوع تالٍ للساعة bestH
  const at = new Date(ctx.now);
  at.setHours(bestH, 0, 0, 0);
  let t = at.getTime();
  if (t <= ctx.now) t += DAY_MS;
  return t;
}

/* ─────────── القرار ─────────── */
export function decide(score: NotificationScore, c: NotificationCandidate, ctx: DeliveryContext, cfg: NotificationConfig): NotificationDecision {
  const urgent = score.urgency >= cfg.urgencyOverride;

  // 1) داخل درب الآن → لا دفع (يُعرَض داخلياً)
  if (ctx.inApp) return { action: "cancel", reason: "الطالب نشِط داخل درب — يُعرَض داخلياً بلا مقاطعة" };

  // 2) دمج المشابه المعلّق
  if (ctx.pendingTypes.has(c.type)) return { action: "merge", reason: "دمج مع إشعار مشابه معلّق", mergeInto: c.type };

  // 3) نافذة هدوء (صلاة/نوم) — تُؤجَّل إلا للإلحاح الأقصى
  const quiet = inQuietWindow(ctx.hour, ctx.quietWindows);
  if (quiet && !urgent) return { action: "delay", reason: `وقت هدوء (${quiet.label}) — يُؤجَّل لوقت مناسب`, deliverAt: score.bestDeliveryTime };

  // 4) مهلة الإشعارات عالية الأولوية
  if (!urgent && ctx.lastSentAt != null && ctx.now - ctx.lastSentAt < cfg.cooldownMs)
    return { action: "delay", reason: "ضمن مهلة التهدئة — يُؤجَّل", deliverAt: score.bestDeliveryTime };

  // 5) السقف اليومي
  if (!urgent && ctx.sentLast24h >= cfg.dailyCap)
    return { action: "cancel", reason: "تجاوز سقف الإشعارات اليومي — لا نُرهِق الطالب" };

  // 6) القيمة كافية → أرسل
  if (score.composite >= cfg.sendThreshold) return { action: "send", reason: "القيمة تفوق كلفة المقاطعة" };

  // 7) قيمة متوسطة → أجّل لوقت أفضل
  if (score.composite >= cfg.cancelThreshold) return { action: "delay", reason: "وقت أفضل لاحقاً", deliverAt: score.bestDeliveryTime };

  // 8) قيمة منخفضة → إلغاء
  return { action: "cancel", reason: "القيمة أقل من كلفة المقاطعة" };
}

export { HOUR_MS, DAY_MS };
