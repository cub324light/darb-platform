/* ═══════════════ بوابة سند — ملخّص الوالد (Parent Digest) ═══════════════
   الوالد لا يحتاج أن يرى كل شيء، بل أن يعرف: هل ابني بخير؟ هل يتقدّم؟ هل يحتاج
   دعماً؟ ماذا أفعل اليوم؟ هذا الملفّ يجيب هذه الأسئلة الأربعة فقط.

   ▓ مبدأ: لا نظام جديد. نقرأ إشاراتٍ محسوبةً أصلاً في درب (Darb Stats · Duwairb
   Score · Life Engine · Goals · Exam Sessions) ونؤطّرها للوالد. الملخّص إسقاطٌ
   للطالب: لا محادثات، لا أخطاء مفصّلة، لا حلول — أرقامٌ عامة فقط.

   ▓ دالّة نقيّة حتمية (buildParentDigest) قابلة للاختبار، وassembler منفصل
   (readParentDigest) يقرأ التخزين — كنمط Life Engine تماماً. */
import { loadUser, loadStats, loadGoals, loadList, computeStreak, localDayKey, currentScoreMap } from "./storage";
import { buildDuwairbProfile } from "./duwairb";
import { computeDuwairbScore } from "./coachScore";
import { longestStreak, activeDaysWithin } from "./insights";
import { phaseExperience } from "./experience";
import { getTrack, type TrackId } from "./tracks";
import { targetsFor } from "./targets";

/* ── مدخلات الملخّص — كلّها من إشاراتٍ قائمة ── */
export interface ParentDigestInput {
  name: string | null;
  stageLabel: string | null;
  goalLabel: string | null;
  /* التقدّم — مقارنةً بالأسبوع الماضي */
  hoursThisWeek: number;
  hoursLastWeek: number;
  sessionsThisWeek: number;
  sessionsLastWeek: number;
  commitmentPct: number;              // Duwairb Score (٠–١٠٠)
  /* النشاط */
  daysSinceLastSession: number | null; // null = لم يدرس بعد
  currentStreak: number;
  longestStreakDays: number;
  totalHours: number;
  activeDaysLast14: number;
  returnedAfterGap: boolean;
  /* الدعم والاختبار */
  weakestSubject: string | null;
  supportReason: string | null;
  nextExam: { name: string; days: number } | null;
  /* الإنجازات */
  doneLessons: number;
  trackProgressPct: number;
  bestScore: { exam: string; score: number } | null;
  /* بذرة الاقتراح من Life Engine (أولوية الطالب الأولى) — تُعاد صياغتها للوالد */
  lifeTopTitle: string | null;
}

export type ParentStatus = "great" | "watch" | "act";
export interface ParentDigest {
  student: { name: string; stage: string | null; goal: string | null };
  status: { level: ParentStatus; emoji: string; label: string; line: string };
  progress: {
    hours: { value: number; deltaPct: number | null };
    sessions: { value: number; delta: number };
    commitmentPct: number;
  };
  support: { subject: string; reason: string } | null;
  nextExam: { name: string; days: number } | null;
  achievements: { icon: string; text: string }[];
  suggestion: string | null;                 // اقتراحٌ واحد فقط
  moments: { icon: string; text: string }[];  // لحظات تستحق أن تعرفها
  alert: { urgent: boolean; title: string; body: string } | null; // تنبيهٌ واحد على الأكثر
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const deltaPct = (now: number, prev: number): number | null =>
  prev >= 1 ? Math.max(-200, Math.min(200, Math.round(((now - prev) / prev) * 100))) : null;

/* القرار الوحيد — نقيّ وحتمي (نراجع القاعدة لا الصفحة) */
export function buildParentDigest(i: ParentDigestInput): ParentDigest {
  const name = i.name?.trim() || "الطالب";

  /* ── الحالة العامة: واحدة فقط + جملة قصيرة جداً ── */
  const inactive = i.daysSinceLastSession != null && i.daysSinceLastSession > 4;
  let status: ParentDigest["status"];
  if (inactive) {
    status = { level: "act", emoji: "🔴", label: "يحتاج تدخلاً",
      line: `انقطع عن الدراسة ${i.daysSinceLastSession} أيام — يحتاج تشجيعاً للعودة.` };
  } else if (i.commitmentPct < 35 || i.daysSinceLastSession == null) {
    status = { level: "act", emoji: "🔴", label: "يحتاج تدخلاً",
      line: i.daysSinceLastSession == null ? `${name} لم يبدأ الدراسة بعد.` : `نشاط ${name} منخفض هذا الأسبوع.` };
  } else if (i.commitmentPct >= 65 && i.hoursThisWeek >= i.hoursLastWeek && i.daysSinceLastSession <= 2) {
    status = { level: "great", emoji: "🟢", label: "ممتاز", line: `${name} ملتزم هذا الأسبوع.` };
  } else {
    const dropped = i.hoursLastWeek > 0 && i.hoursThisWeek < i.hoursLastWeek;
    status = { level: "watch", emoji: "🟡", label: "يحتاج متابعة",
      line: dropped ? "انخفض نشاطه قليلاً هذا الأسبوع." : "بدايةٌ جيدة، ويحتاج مزيداً من الانتظام." };
  }

  /* ── التقدّم ── */
  const progress = {
    hours: { value: round1(i.hoursThisWeek), deltaPct: deltaPct(i.hoursThisWeek, i.hoursLastWeek) },
    sessions: { value: i.sessionsThisWeek, delta: i.sessionsThisWeek - i.sessionsLastWeek },
    commitmentPct: Math.round(i.commitmentPct),
  };

  /* ── يحتاج دعم: مادة واحدة فقط ── */
  const support = i.weakestSubject
    ? { subject: i.weakestSubject, reason: i.supportReason ?? "أضعف مادة حسب تقدّم مهاراته هذا الأسبوع." }
    : null;

  /* ── الإنجازات: آخرها فقط (نختار الأعلى عتبةً في كل نوع) ── */
  const achievements: { icon: string; text: string }[] = [];
  if (i.totalHours >= 50) achievements.push({ icon: "⏱️", text: "أكمل ٥٠ ساعة دراسة" });
  else if (i.totalHours >= 30) achievements.push({ icon: "⏱️", text: "أكمل ٣٠ ساعة دراسة" });
  else if (i.totalHours >= 20) achievements.push({ icon: "⏱️", text: "أكمل أول ٢٠ ساعة" });
  else if (i.totalHours >= 10) achievements.push({ icon: "⏱️", text: "أكمل ١٠ ساعات دراسة" });
  if (i.longestStreakDays >= 10) achievements.push({ icon: "🔥", text: "حافظ على الدراسة ١٠ أيام" });
  else if (i.longestStreakDays >= 7) achievements.push({ icon: "🔥", text: "٧ أيام دراسةٍ متتالية" });
  if (i.trackProgressPct >= 100) achievements.push({ icon: "📚", text: "أنهى وحدة كاملة" });
  else if (i.doneLessons >= 1) achievements.push({ icon: "📗", text: "أنهى أول درس" });

  /* ── لحظات تستحق أن تعرفها (إنجازاتٌ يراها الوالد، ليست إشعارات) ── */
  const moments: { icon: string; text: string }[] = [];
  if (i.returnedAfterGap) moments.push({ icon: "🎉", text: "بدأ يدرس بعد انقطاع" });
  if (i.bestScore) moments.push({ icon: "🏆", text: `حقّق أعلى نتيجة له: ${i.bestScore.score} في ${i.bestScore.exam}` });
  if (i.totalHours >= 30) moments.push({ icon: "🔥", text: "تجاوز ٣٠ ساعة دراسة" });
  if (i.doneLessons >= 1 && i.trackProgressPct < 100) moments.push({ icon: "📚", text: "أنهى أول درس في مساره" });

  /* ── اقتراح واحد للوالد (بصيغته لا صيغة الطالب) ── */
  let suggestion: string | null;
  if (inactive || i.daysSinceLastSession == null) {
    suggestion = `شجّعه على العودة بجلسةٍ قصيرة اليوم — ولو ٢٠ دقيقة تكسر الانقطاع.`;
  } else if (i.nextExam && i.nextExam.days <= 14) {
    suggestion = `اختبار ${i.nextExam.name} قريب — شجّعه على الالتزام بخطته اليومية هذه الأيام.`;
  } else if (support) {
    suggestion = `شجّعه على تخصيص وقتٍ إضافي لـ${support.subject} هذا الأسبوع — هي أحوج نقاطه.`;
  } else if (i.lifeTopTitle) {
    suggestion = `شجّعه على: ${i.lifeTopTitle}.`;
  } else {
    suggestion = `استمرّ في تشجيعه — أداؤه في الطريق الصحيح.`;
  }

  /* ── تنبيهٌ واحد على الأكثر (الأعجل أولاً) ── */
  let alert: ParentDigest["alert"] = null;
  if (i.nextExam && i.nextExam.days >= 0 && i.nextExam.days <= 14) {
    alert = { urgent: true, title: `اختبار ${i.nextExam.name} بعد ${i.nextExam.days} يوماً`,
      body: "فترةٌ حاسمة — تشجيعه على الانتظام هذه الأيام يصنع فرقاً في نتيجته." };
  } else if (inactive) {
    alert = { urgent: true, title: `توقّف عن الدراسة ${i.daysSinceLastSession} أيام`,
      body: "الانقطاع يُعيد الضعف في المواد — جلسةٌ واحدة تعيد الاستمرارية." };
  }

  return {
    student: { name, stage: i.stageLabel, goal: i.goalLabel },
    status, progress, support, nextExam: i.nextExam, achievements, suggestion, moments, alert,
  };
}

/* ═══════════ Assembler — يقرأ التخزين (عميل) ويجمّع المدخلات ═══════════
   يستخدم فقط ما هو موجود: loadStats · buildDuwairbProfile · computeDuwairbScore ·
   insights · goals · currentScoreMap. null إن لا بياناتٍ كافية (لا نختلق أرقاماً). */
export function readParentDigest(): ParentDigest | null {
  if (typeof window === "undefined") return null;
  const user = loadUser();
  const stats = loadStats();
  const hasData = (stats.totalFocusMins ?? 0) > 0 || (stats.sessionsCount ?? 0) > 0 || (stats.trackProgress ?? 0) > 0;
  if (!user && !hasData) return null;

  const { profile } = buildDuwairbProfile();
  const readinessPct = profile.readinessPct ?? 0;
  const score = computeDuwairbScore(stats, readinessPct);

  /* نوافذ أسبوعية من dayMins (تاريخٌ محفوظ أصلاً) — لا نظام جديد */
  const dayMins = stats.dayMins ?? {};
  const key = (offset: number) => { const d = new Date(); d.setDate(d.getDate() - offset); return localDayKey(d); };
  const sumMins = (from: number, to: number) => { let s = 0; for (let o = from; o < to; o++) s += dayMins[key(o)] ?? 0; return s; };
  const activeDays = (from: number, to: number) => { let c = 0; for (let o = from; o < to; o++) if ((dayMins[key(o)] ?? 0) > 0) c++; return c; };

  const hoursThisWeek = sumMins(0, 7) / 60;
  const hoursLastWeek = sumMins(7, 14) / 60;
  const sessionsThisWeek = activeDays(0, 7);
  const sessionsLastWeek = activeDays(7, 14);

  /* أيام منذ آخر جلسة */
  let daysSinceLastSession: number | null = null;
  for (let o = 0; o <= 60; o++) { if ((dayMins[key(o)] ?? 0) > 0) { daysSinceLastSession = o; break; } }

  /* عاد بعد انقطاع: نشِط اليوم/أمس، لكن آخر أسبوعين شبه خاملة */
  const returnedAfterGap = daysSinceLastSession != null && daysSinceLastSession <= 1
    && activeDaysWithin(stats, 14) <= 3 && (stats.totalFocusMins ?? 0) > 0;

  /* أعلى نتيجة سابقة من محاولات الاختبارات (Exam Sessions) */
  const scoreMap = currentScoreMap();
  let bestScore: { exam: string; score: number } | null = null;
  for (const [track, v] of Object.entries(scoreMap)) {
    if (!bestScore || v.score > bestScore.score) {
      let label = track;
      try { label = getTrack(track as TrackId).title; } catch { /* مفتاحٌ غير قياسي */ }
      bestScore = { exam: label, score: v.score };
    }
  }

  const doneLessons = (() => { try { return loadList<string>("darb_done_lessons").length; } catch { return 0; } })();
  const goals = loadGoals();
  /* المصدر الواحد: عنوان الوجهة من targets (لا goal) */
  const destLabel = targetsFor(user?.targets)[0]?.label ?? null;
  const primaryExam = profile.exams?.[0];

  const input: ParentDigestInput = {
    name: profile.name ?? user?.name ?? null,
    stageLabel: phaseExperience(user).stageLabel ?? null,
    goalLabel: destLabel ?? (goals.major ? `تخصص ${goals.major}` : null),
    hoursThisWeek, hoursLastWeek, sessionsThisWeek, sessionsLastWeek,
    commitmentPct: score.total,
    daysSinceLastSession,
    currentStreak: computeStreak(stats),
    longestStreakDays: longestStreak(stats),
    totalHours: (stats.totalFocusMins ?? 0) / 60,
    activeDaysLast14: activeDaysWithin(stats, 14),
    returnedAfterGap,
    weakestSubject: profile.weakest ?? null,
    supportReason: score.gaps[0] ?? null,
    nextExam: primaryExam && primaryExam.days != null ? { name: primaryExam.name, days: primaryExam.days } : null,
    doneLessons,
    trackProgressPct: stats.trackProgress ?? 0,
    bestScore,
    lifeTopTitle: null,
  };

  return buildParentDigest(input);
}
