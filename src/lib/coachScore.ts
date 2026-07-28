/* ─── تقييم دويرب (Coach Score) ───
   مؤشر مركّب 0–100 مبني حصرياً على بيانات الطالب المخزّنة.
   كل مكوّن موثّق بوزنه وصيغة حسابه — النتيجة قابلة للتحقق.

   الأوزان:
     جاهزية        30  (من estimateReadiness)
     انتظام        20  (ستريك حالي / 7، حد 100٪)
     استمرارية     20  (أيام نشطة من 30)
     حجم المذاكرة  15  (ساعات آخر 30 يوم، حد 60 ساعة)
     تقدّم الخريطة 10  (trackProgress)
     مراجعة        5   (بطاقات + دروس منجزة، حد 50)
     ──────────────
     المجموع       100
*/
import { computeStreak, loadList, type DarbStats } from "./storage";
import { activeDaysWithin } from "./insights";
import { localDayKey } from "./storage";
import type { ReviewCard } from "./types";

export interface ScoreComponent {
  label: string;
  score: number;
  max: number;
  note: string;
}

export interface DuwairbScoreBreakdown {
  total: number;
  components: Record<"readiness" | "streak" | "consistency" | "volume" | "roadmap" | "review", ScoreComponent>;
  strengths: string[];
  gaps: string[];
}

function dayKeysBack30(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return localDayKey(d);
  });
}

export function computeDuwairbScore(
  stats: DarbStats,
  readinessPct: number,
): DuwairbScoreBreakdown {
  /* ── مكوّنات ── */
  // 1) جاهزية → /30
  const readinessScore = Math.round((Math.min(100, readinessPct) / 100) * 30);

  // 2) انتظام (ستريك) → /20 (7 أيام = كامل)
  const streak = computeStreak(stats);
  const streakScore = Math.min(20, Math.round((streak / 7) * 20));

  // 3) استمرارية (أيام نشطة من 30) → /20
  const active30 = activeDaysWithin(stats, 30);
  const consistencyScore = Math.round((active30 / 30) * 20);

  // 4) حجم المذاكرة (ساعات آخر 30 يوم، حد 60 ساعة) → /15
  const dayMins = stats.dayMins ?? {};
  const volumeMins = dayKeysBack30().reduce((sum, k) => sum + (dayMins[k] ?? 0), 0);
  const volumeHours = volumeMins / 60;
  const volumeScore = Math.min(15, Math.round((volumeHours / 60) * 15));

  // 5) تقدّم الخريطة → /10
  const roadmapScore = Math.round(((stats.trackProgress ?? 0) / 100) * 10);

  // 6) مراجعة (بطاقات راجعها + دروس منجزة، حد 50) → /5
  const reviewedCards = (() => {
    try {
      return loadList<ReviewCard>("darb_cards").filter((c) => (c.repetitions ?? 0) > 0).length;
    } catch { return 0; }
  })();
  const doneLessons = (() => {
    try { return loadList<string>("darb_done_lessons").length; } catch { return 0; }
  })();
  const totalReview = reviewedCards + doneLessons;
  const reviewScore = Math.min(5, Math.round((totalReview / 50) * 5));

  const total = readinessScore + streakScore + consistencyScore + volumeScore + roadmapScore + reviewScore;

  /* ── نقاط القوة والفجوات ── */
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (readinessScore >= 22) strengths.push("مستوى جاهزية ممتاز");
  else if (readinessScore < 10) gaps.push("الجاهزية منخفضة — قيّم مهاراتك في صفحة المهارات");

  if (streakScore >= 14) strengths.push(`انتظام رائع — ستريك ${streak} يوم`);
  else if (streakScore < 6) gaps.push("الانتظام ضعيف — حاول مذاكرة يومية ولو 20 دقيقة");

  if (consistencyScore >= 13) strengths.push(`${active30} يوم نشطاً هذا الشهر`);
  else if (consistencyScore < 7) gaps.push(`نشطت ${active30} يوماً فقط من 30 — زِد أيامك`);

  if (volumeScore >= 10) strengths.push("ساعات دراسة وافية هذا الشهر");
  else if (volumeScore < 4) gaps.push("ساعات المذاكرة قليلة — استهدف ساعتين يومياً على الأقل");

  if (roadmapScore >= 7) strengths.push("تقدّم جيد في خريطة المسار");
  else if (roadmapScore < 3) gaps.push("الخريطة تحتاج اهتماماً — أكمل وحدات مسارك");

  if (reviewScore >= 3) strengths.push("عادة مراجعة منتظمة جيدة");
  else if (reviewScore === 0) gaps.push("لم تراجع بطاقات أو دروس بعد — افتح المراجعة اليومية");

  return {
    total,
    components: {
      readiness:   { label: "الجاهزية",      score: readinessScore,   max: 30, note: `${readinessPct}٪ جاهزية مقدّرة` },
      streak:      { label: "الانتظام",      score: streakScore,      max: 20, note: `ستريك ${streak} يوم` },
      consistency: { label: "الاستمرارية",   score: consistencyScore, max: 20, note: `${active30} يوم نشط من 30` },
      volume:      { label: "حجم الدراسة",   score: volumeScore,      max: 15, note: `${Math.round(volumeHours * 10) / 10} ساعة هذا الشهر` },
      roadmap:     { label: "الخريطة",       score: roadmapScore,     max: 10, note: `${stats.trackProgress ?? 0}٪ مكتمل` },
      review:      { label: "المراجعة",      score: reviewScore,      max: 5,  note: `${totalReview} بطاقة ودرس` },
    },
    strengths,
    gaps,
  };
}

/* ─── كشف الفرص الضائعة ─── */
export interface MissedOpportunity {
  severity: "critical" | "warning";
  message: string;
  solution: string;
}

export function detectMissedOpportunities(
  stats: DarbStats,
  readinessPct: number,
  opts?: {
    targetScore?: number;
    examName?: string;
    daysRemaining?: number;
    weeklyStudyMins?: number;  // دقائق المذاكرة في آخر 7 أيام
    reviewedCardsCount?: number;
  },
): MissedOpportunity[] {
  const opps: MissedOpportunity[] = [];
  const { targetScore, examName, daysRemaining, weeklyStudyMins, reviewedCardsCount } = opts ?? {};

  // Case A: هدف مرتفع + جاهزية منخفضة + وقت قليل
  if (targetScore != null && daysRemaining != null && daysRemaining < 60 && readinessPct < 55) {
    opps.push({
      severity: "critical",
      message: `وفق بياناتك، الوصول إلى ${targetScore} في ${examName ?? "الاختبار"} خلال ${daysRemaining} يوماً يحتاج جهداً إضافياً كبيراً — جاهزيتك الآن ${readinessPct}٪.`,
      solution: "يُوصى برفع ساعات المذاكرة اليومية والتركيز على أضعف موادك أولاً. اطلب من دويرب خطة مكثّفة الآن.",
    });
  }

  // Case B: جاهزية جيدة لكن مراجعة ضعيفة
  if (readinessPct >= 55 && (reviewedCardsCount ?? 0) < 5) {
    opps.push({
      severity: "warning",
      message: "أداؤك جيد لكن مراجعة الأخطاء شبه منعدمة — الأخطاء المتكررة تأخذ نقاطاً ثمينة في الاختبار.",
      solution: "افتح خزنة الأخطاء وراجع بطاقاتك — عشر دقائق يومياً تكفي لسد هذه الثغرة.",
    });
  }

  // Case C: هدف مرتفع + ساعات أسبوعية قليلة
  if (targetScore != null && targetScore >= 90 && weeklyStudyMins != null && weeklyStudyMins < 180) {
    const hrs = Math.round(weeklyStudyMins / 6) / 10;
    opps.push({
      severity: "warning",
      message: `هدفك ${targetScore} مرتفع لكن مذاكرتك الأسبوعية الأخيرة ${hrs} ساعة فقط.`,
      solution: "استهدف 8 ساعات على الأقل أسبوعياً — فعّل تذكيرات دويرب اليومية لتنظيم وقتك.",
    });
  }

  // Case D: انتظام ضعيف مع ستريك منكسر
  if (activeDaysWithin(stats, 14) <= 2 && stats.sessionsCount > 0) {
    opps.push({
      severity: "warning",
      message: "لاحظنا غياباً طويلاً في الأسبوعين الأخيرين — الانقطاع يُعيد تشغيل الضعف في المواد.",
      solution: "عُد إلى روتينك تدريجياً: جلسة واحدة يومياً لمدة أسبوع تعيد الاستمرارية.",
    });
  }

  return opps;
}
