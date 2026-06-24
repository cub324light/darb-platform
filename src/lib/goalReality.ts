/* ─── محرّك تقييم واقعية الهدف ───
   نقي وحتمي: نفس المدخلات ⇒ نفس المخرجات.
   يُستهلَك في: Profile / Plan / Goals / Duwairb — مصدر واحد. */

export type GoalVerdict = "واقعي" | "صعب لكنه ممكن" | "غير واقعي";

export interface GoalRealityResult {
  verdict: GoalVerdict;
  icon: "🟢" | "🟡" | "🔴";
  reason: string;
  suggestion: string;
  feasibilityScore: number; // 0–100 (للترتيب الداخلي)
}

export interface GoalRealityInputs {
  currentScore?: number | null;   // أحدث درجة للطالب في نفس الاختبار
  targetScore?: number | null;    // الدرجة المستهدفة
  daysToExam?: number | null;     // الأيام المتبقية
  weeklyHoursTotal?: number | null; // من محرّك الاستراتيجية
  readinessPct?: number | null;   // تقدير الجاهزية الحالية
  attemptCount?: number | null;   // عدد المحاولات السابقة (خبرة)
  examName?: string;              // اسم الاختبار للعرض
}

export function evaluateGoal(inp: GoalRealityInputs): GoalRealityResult {
  const target   = inp.targetScore ?? null;
  const current  = inp.currentScore ?? null;
  const days     = inp.daysToExam ?? null;
  const hours    = inp.weeklyHoursTotal ?? null;
  const readiness = inp.readinessPct ?? null;
  const attempts = inp.attemptCount ?? 0;
  const exam     = inp.examName ?? "الاختبار";

  // بدون هدف → لا تقييم
  if (target == null) {
    return {
      verdict: "واقعي", icon: "🟢",
      reason: "لا يوجد هدف محدد بعد.",
      suggestion: "حدّد درجة مستهدفة في إعداداتك لأحصل على تقييم دقيق.",
      feasibilityScore: 50,
    };
  }

  let score = 50; // نبدأ محايدين

  /* ١) الفجوة بين الدرجة الحالية والهدف */
  let gapNote = "";
  if (current != null) {
    const gap = target - current;
    if (gap <= 0) {
      score += 30;
      gapNote = `درجتك الحالية ${current} تجاوزت هدفك بالفعل.`;
    } else if (gap <= 5) {
      score += 20;
      gapNote = `فجوة صغيرة (${gap} درجات) لإغلاقها.`;
    } else if (gap <= 15) {
      score += 5;
      gapNote = `فجوة معقولة (${gap} درجات).`;
    } else if (gap <= 25) {
      score -= 10;
      gapNote = `فجوة كبيرة (${gap} درجات) تحتاج جهداً.`;
    } else {
      score -= 20;
      gapNote = `فجوة كبيرة جداً (${gap} درجة).`;
    }
  } else {
    // بدون درجة حالية نعتمد على الجاهزية
    if (readiness != null) {
      const implied = readiness; // افتراضياً الجاهزية تعكس الدرجة
      const impliedGap = target - implied;
      if (impliedGap <= 0) { score += 20; gapNote = "جاهزيتك تكفي لبلوغ هدفك."; }
      else if (impliedGap <= 20) { score += 5; gapNote = "جاهزيتك قريبة من الهدف."; }
      else { score -= 10; gapNote = "بين جاهزيتك وهدفك مسافة تحتاج عملاً."; }
    }
  }

  /* ٢) الوقت المتبقي */
  let timeNote = "";
  if (days != null) {
    if (days <= 7) {
      score -= 25;
      timeNote = "أقل من أسبوع — الوقت حرج جداً.";
    } else if (days <= 21) {
      score -= 15;
      timeNote = `${days} يوماً متبقية — وقت ضيّق.`;
    } else if (days <= 60) {
      score += 5;
      timeNote = `${days} يوماً — وقت كافٍ بانضباط.`;
    } else if (days <= 120) {
      score += 15;
      timeNote = `${Math.round(days / 7)} أسبوعاً — وقت مريح.`;
    } else {
      score += 20;
      timeNote = "وقت وافر أمامك.";
    }
  }

  /* ٣) الطاقة الأسبوعية */
  let hoursNote = "";
  if (hours != null) {
    if (hours >= 20) { score += 20; hoursNote = `${hours} ساعة/أسبوع — طاقة ممتازة.`; }
    else if (hours >= 12) { score += 10; hoursNote = `${hours} ساعة/أسبوع — طاقة جيدة.`; }
    else if (hours >= 6)  { score += 0;  hoursNote = `${hours} ساعة/أسبوع — مقبول.`; }
    else { score -= 10; hoursNote = `${hours} ساعة/أسبوع — ساعات قليلة.`; }
  }

  /* ٤) مكافأة التجربة */
  if (attempts >= 2) score += 8;
  else if (attempts === 1) score += 4;

  /* ٥) الجاهزية مستقلة (إن لم تُستخدم في الفجوة) */
  if (readiness != null && current == null) {
    if (readiness >= 75) score += 10;
    else if (readiness >= 50) score += 3;
    else score -= 5;
  }

  score = Math.max(0, Math.min(100, score));

  /* الحكم */
  let verdict: GoalVerdict;
  let icon: "🟢" | "🟡" | "🔴";
  if (score >= 65) { verdict = "واقعي"; icon = "🟢"; }
  else if (score >= 35) { verdict = "صعب لكنه ممكن"; icon = "🟡"; }
  else { verdict = "غير واقعي"; icon = "🔴"; }

  /* سبب + اقتراح */
  const reasonParts = [gapNote, timeNote, hoursNote].filter(Boolean);
  const reason = reasonParts.length
    ? reasonParts.join(" ")
    : `هدفك ${target} في ${exam}.`;

  let suggestion: string;
  if (verdict === "واقعي") {
    suggestion = attempts >= 1
      ? "أنت على المسار الصحيح — حافظ على إيقاعك وراجع نقاط ضعفك قبل الاختبار."
      : "الهدف واقعي — ابنِ خطة منتظمة وراجع أخطاءك أسبوعياً.";
  } else if (verdict === "صعب لكنه ممكن") {
    if (days != null && days <= 30) {
      suggestion = "الوقت ضيّق — ركّز على نقاط ضعفك الرئيسية فقط ولا تتشعّب.";
    } else if (hours != null && hours < 8) {
      suggestion = "زِد ساعات المذاكرة الأسبوعية وركّز على أحوج المواد — الهدف بعيد بالإيقاع الحالي.";
    } else {
      suggestion = "ممكن لو أضفت جلسات مراجعة إضافية وركّزت على أحوج المواد باستمرار.";
    }
  } else {
    if (days != null && days <= 14) {
      suggestion = "أعِد تقييم هدفك للاختبار القادم — ورمّز على ما تستطيع تحقيقه الآن.";
    } else if (current != null && target - current > 25) {
      suggestion = `تحريك الهدف للأسفل مؤقتاً (مثلاً ${Math.round(current + 15)}) أو إعادة الجدولة لاختبار لاحق سيمنحك وقتاً أكثر.`;
    } else {
      suggestion = "هذا الهدف يحتاج وقتاً أطول أو ساعات أكثر — عدّل الهدف أو الموعد.";
    }
  }

  return { verdict, icon, reason, suggestion, feasibilityScore: score };
}

/* جملة مختصرة للحقن في برومبت دويرب */
export function goalRealityLine(r: GoalRealityResult): string {
  return `تقييم واقعية الهدف: ${r.icon} ${r.verdict} — ${r.reason.slice(0, 80)}`;
}
