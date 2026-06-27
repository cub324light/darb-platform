/* ═══════════════════════════════════════════════════════════════════════
   Recommendation Engine — محرّك التوصيات المركزي
   ───────────────────────────────────────────────────────────────────────
   مصدر القرار الواحد لـ«ماذا يرى الطالب الآن؟». لا تقرّر أي صفحة بنفسها ما
   تعرضه؛ بل تسأل هذا المحرّك:
     • ما أهمّ أولوية اليوم؟         (topRecommendation)
     • ماذا يرى الطالب أولاً؟         (feedRecommendations — مرتّبة)
     • أي بطاقات تُخفى/تُرفع/تنتهي/تؤجَّل؟ (hiddenCards / promotedCards / expiry)

   التصميم: تركيب لا شروط (composition over conditionals).
   كل إشارة = «منتِج» (producer) نقي يستهلك السياق ويُرجِع Recommendation[].
   إضافة نظام مستقبلي (الجامعة/المهن/الدورات/الشهادات/الوظائف) = إضافة منتِج،
   دون لمس بقية المحرّك. لا يكرّر المحرّك أي قاعدة تعليمية — بل يُنسّق المحرّكات
   الموجودة (المسار الذهبي + معرفة درب + مزوّد الاختبارات + المراحل).

   نقيّ وقابل للاختبار باستقلال: computeRecommendations(ctx) دالة خالصة.
   البانيان (gather/load) يقرآن التخزين ويفوّضان للمحرّك النقي.
   ═══════════════════════════════════════════════════════════════════════ */

import type { DarbUser } from "./storage";
import type { TrackId } from "./tracks";
import type { GoldenPathState } from "./goldenPath";
import type { StudentPhase } from "./phase";
import type { ExamAlert } from "./examProvider";
import type { DashSectionId } from "./storage";

/* ════════════════════════════════════════════════════════════
   الأنواع — عقد التوصية (Recommendation Contract)
   ════════════════════════════════════════════════════════════ */

export type RecSource =
  | "goldenPath" | "review" | "streak" | "exam"
  | "orbit" | "university" | "vault" | "onboarding";

export type RecKind = "priority" | "alert" | "nudge" | "promote" | "hide";

export type RecTone = "urgent" | "info" | "success" | "gold" | "accent";

export type RecActionKind =
  | "navigate" | "openDuwairb" | "activateTrack" | "external" | "none";

export interface RecAction {
  kind: RecActionKind;
  label: string;
  href?: string;            // navigate / external
  trackIds?: TrackId[];     // activateTrack
  event?: string;           // openDuwairb أو حدث مخصّص
}

export interface Recommendation {
  id: string;               // معرّف ثابت (للتجاهل/القبول/إزالة التكرار)
  kind: RecKind;
  priority: number;         // 0–100، الأعلى يُعرض أولاً
  confidence: number;       // 0–1، ثقة المحرّك في هذه التوصية
  reason: string;           // «لماذا» — قابلة للشرح دائماً
  source: RecSource;        // أي إشارة/محرّك ولّدها
  expiresAt: number | null; // epoch ms؛ null = بلا انتهاء
  action: RecAction;
  targetPage: string;       // وجهة الإجراء
  title: string;
  subtitle?: string;
  tone: RecTone;
  cardId?: DashSectionId;   // لـ promote/hide: أي قسم لوحة يخصّ
}

/* ════════════════════════════════════════════════════════════
   السياق — كل الإشارات التي يحتاجها المحرّك (يُجمَع مرة واحدة)
   ════════════════════════════════════════════════════════════ */

export interface RecContext {
  now: number;
  hour: number;                 // ساعة اليوم المحلية 0–23
  user: DarbUser | null;
  phase: StudentPhase;
  goldenPath: GoldenPathState | null;
  stats: {
    streak: number;
    todayMins: number;
    dueCards: number;
    unreviewedErrors: number;
    totalFocusMins: number;
    sessionsCount: number;
  };
  examAlerts: ExamAlert[];
  canApplyUniversity: boolean;
  dismissed: Record<string, number>; // id → حتى متى (epoch ms)
}

/* مهايئ صغير */
const endOfDay = (now: number): number => {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
};
const ar = (n: number) => n.toLocaleString("ar-SA");

/* ════════════════════════════════════════════════════════════
   المنتِجون — كل إشارة دالة نقيّة (تركيب لا شروط متناثرة)
   ════════════════════════════════════════════════════════════ */

type Producer = (ctx: RecContext) => Recommendation[];

/* ١) المسار الذهبي — أولوية الطالب الحالية (تُعرض كبطاقة غنية) */
const goldenPathProducer: Producer = (ctx) => {
  const gp = ctx.goldenPath;
  if (!gp || !gp.show) return [];
  const activate = gp.suggestedActivate ?? [];
  return [{
    id: `golden-path:${gp.phaseId}`,
    kind: "priority",
    priority: 88,
    confidence: 0.9,
    reason: gp.reason,
    source: "goldenPath",
    expiresAt: endOfDay(ctx.now),
    action: activate.length
      ? { kind: "activateTrack", label: "فعّل المرحلة", trackIds: activate }
      : { kind: "navigate", label: "افتح", href: "/roadmap" },
    targetPage: "/dashboard",
    title: gp.primary.label,
    subtitle: gp.phaseLabel,
    tone: "gold",
  }];
};

/* ٢) بطاقات المراجعة المستحقّة — حسّاسة للوقت (التكرار المتباعد) */
const dueReviewProducer: Producer = (ctx) => {
  const n = ctx.stats.dueCards;
  if (n <= 0) return [];
  return [{
    id: "due-review",
    kind: "nudge",
    priority: Math.min(94, 62 + n * 3),
    confidence: 1,
    reason: `لديك ${ar(n)} بطاقة وصلت موعد مراجعتها — المراجعة في وقتها تثبّت المعلومة قبل النسيان.`,
    source: "review",
    expiresAt: endOfDay(ctx.now),
    action: { kind: "navigate", label: "راجع الآن", href: "/review" },
    targetPage: "/review",
    title: `${ar(n)} بطاقة مراجعة مستحقّة`,
    tone: "success",
  }];
};

/* ٣) ستريك بخطر — مساءً بلا جلسة (أعلى إلحاح) */
const streakRiskProducer: Producer = (ctx) => {
  const { streak, todayMins } = ctx.stats;
  if (!(streak > 0 && todayMins === 0 && ctx.hour >= 17)) return [];
  return [{
    id: "streak-risk",
    kind: "nudge",
    priority: 96,
    confidence: 0.85,
    reason: `ستريكك ${ar(streak)} يوم بخطر — جلسة تركيز واحدة قبل منتصف الليل تحفظه.`,
    source: "streak",
    expiresAt: endOfDay(ctx.now),
    action: { kind: "navigate", label: "أنقذ ستريكك", href: "/orbit" },
    targetPage: "/orbit",
    title: `ستريك ${ar(streak)} يوم بخطر 🔥`,
    tone: "urgent",
  }];
};

/* ٤) نوافذ تسجيل الاختبارات الرسمية — للثانوي/الخريج فقط (انتهت للجامعي) */
const examWindowProducer: Producer = (ctx) => {
  if (ctx.phase === "university") return [];
  return ctx.examAlerts
    .filter((a) => a.status === "open" || a.status === "upcoming")
    .map((a) => {
      const open = a.status === "open";
      const exp = a.registrationEnd
        ? new Date(a.registrationEnd + "T23:59:59").getTime()
        : endOfDay(ctx.now);
      return {
        id: `exam:${a.trackId}:${a.windowLabel}`,
        kind: "alert" as const,
        priority: open ? 90 : 76,
        confidence: 0.9,
        reason: open
          ? `التسجيل مفتوح الآن لاختبار ${a.trackTitle} (${a.windowLabel}) — لا تفوّت الموعد.`
          : `التسجيل يفتح خلال ${ar(a.daysUntilOpen ?? 0)} يوم لاختبار ${a.trackTitle}.`,
        source: "exam" as const,
        expiresAt: exp,
        action: { kind: "navigate" as const, label: "تفاصيل القبول", href: "/university" },
        targetPage: "/university",
        title: open
          ? `🟢 التسجيل مفتوح — ${a.trackTitle}`
          : `🔔 يفتح خلال ${ar(a.daysUntilOpen ?? 0)} يوم — ${a.trackTitle}`,
        subtitle: a.windowLabel,
        tone: (open ? "success" : "gold") as RecTone,
      };
    });
};

/* ٥) ابدأ اليوم — لم يذاكر بعد (ولا ينطبق خطر الستريك) */
const startSessionProducer: Producer = (ctx) => {
  const { streak, todayMins } = ctx.stats;
  if (todayMins > 0) return [];
  if (streak > 0 && ctx.hour >= 17) return []; // يغطّيه منتِج خطر الستريك
  return [{
    id: "start-session",
    kind: "nudge",
    priority: 44,
    confidence: 0.7,
    reason: "ما بدأت اليوم بعد — جلسة أوربت واحدة تكسر الصفر وتبني عادتك.",
    source: "orbit",
    expiresAt: endOfDay(ctx.now),
    action: { kind: "navigate", label: "ابدأ جلسة", href: "/orbit" },
    targetPage: "/orbit",
    title: "ابدأ يومك بجلسة تركيز",
    tone: "accent",
  }];
};

/* ٦) أخطاء غير مُراجَعة في الخزنة */
const vaultReviewProducer: Producer = (ctx) => {
  const n = ctx.stats.unreviewedErrors;
  if (n <= 0) return [];
  return [{
    id: "vault-review",
    kind: "nudge",
    priority: 48,
    confidence: 0.75,
    reason: `عندك ${ar(n)} خطأ في خزنتك ما راجعته — مراجعة الأخطاء أسرع طريق لرفع درجتك.`,
    source: "vault",
    expiresAt: endOfDay(ctx.now),
    action: { kind: "navigate", label: "راجع أخطاءك", href: "/vault" },
    targetPage: "/vault",
    title: `${ar(n)} خطأ بانتظار المراجعة`,
    tone: "accent",
  }];
};

/* ٧) ترقية القبول الجامعي — لمن هو على أعتابه (ثالث ثانوي/خريج) */
const universityPromoteProducer: Producer = (ctx) => {
  if (!ctx.canApplyUniversity) return [];
  return [{
    id: "university-admission",
    kind: "promote",
    priority: 52,
    confidence: 0.8,
    reason: "أنت على أعتاب القبول الجامعي — احسب موزونتك وقارن الجامعات والتخصصات المناسبة.",
    source: "university",
    expiresAt: null,
    action: { kind: "navigate", label: "حاسبة القبول", href: "/university" },
    targetPage: "/university",
    title: "🎓 القبول الجامعي",
    subtitle: "حساب الموزونة ومقارنة الجامعات",
    tone: "gold",
  }];
};

/* سجلّ المنتِجين — أضِف منتِجاً جديداً هنا ليدخل المحرّك تلقائياً */
const PRODUCERS: Producer[] = [
  goldenPathProducer,
  streakRiskProducer,
  examWindowProducer,
  dueReviewProducer,
  vaultReviewProducer,
  universityPromoteProducer,
  startSessionProducer,
];

/* ════════════════════════════════════════════════════════════
   المحرّك النقي — يجمع، يصفّي المنتهي/المتجاهَل، يرتّب
   ════════════════════════════════════════════════════════════ */
export function computeRecommendations(ctx: RecContext): Recommendation[] {
  const seen = new Set<string>();
  return PRODUCERS
    .flatMap((p) => {
      try { return p(ctx); } catch { return []; }
    })
    // إزالة التكرار حسب id (أول ظهور يفوز)
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    // إسقاط المنتهية والمتجاهَلة (حتى وقتها)
    .filter((r) => r.expiresAt == null || r.expiresAt > ctx.now)
    .filter((r) => !(ctx.dismissed[r.id] && ctx.dismissed[r.id] > ctx.now))
    // الترتيب: الأولوية ثم الثقة
    .sort((a, b) => b.priority - a.priority || b.confidence - a.confidence);
}

/* ════════════════════════════════════════════════════════════
   استعلامات — تستهلكها الصفحات بدل أن تقرّر بنفسها
   ════════════════════════════════════════════════════════════ */

/** التوصيات المعروضة (أولوية/تنبيه/تلميح) مرتّبة، باستثناء توجيهات الإخفاء/الرفع. */
export function feedRecommendations(recs: Recommendation[]): Recommendation[] {
  return recs.filter((r) => r.kind === "priority" || r.kind === "alert" || r.kind === "nudge");
}

/** أهمّ توصية واحدة الآن — «ماذا يرى الطالب أولاً». */
export function topRecommendation(recs: Recommendation[]): Recommendation | null {
  return feedRecommendations(recs)[0] ?? null;
}

/** توصيات تخصّ صفحة بعينها (لحقنها في رؤوس الصفحات لاحقاً). */
export function recommendationsForPage(recs: Recommendation[], page: string): Recommendation[] {
  return recs.filter((r) => r.targetPage === page);
}

/** أقسام لوحة يُوصى بإخفائها. */
export function hiddenCards(recs: Recommendation[]): DashSectionId[] {
  return recs.filter((r) => r.kind === "hide" && r.cardId).map((r) => r.cardId!) as DashSectionId[];
}

/** أقسام لوحة يُوصى برفعها للأعلى. */
export function promotedCards(recs: Recommendation[]): DashSectionId[] {
  return recs.filter((r) => r.kind === "promote" && r.cardId).map((r) => r.cardId!) as DashSectionId[];
}

/* ════════════════════════════════════════════════════════════
   التجاهل/القبول — جسر مبكر نحو محرّك الأحداث (المرحلة ٣)
   ════════════════════════════════════════════════════════════ */
const DISMISS_KEY = "darb_rec_dismissed";

export function loadDismissed(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    // تنظيف المنتهية
    const now = Date.now();
    let changed = false;
    for (const k of Object.keys(obj)) if (obj[k] <= now) { delete obj[k]; changed = true; }
    if (changed) localStorage.setItem(DISMISS_KEY, JSON.stringify(obj));
    return obj;
  } catch { return {}; }
}

/** تجاهل توصية حتى وقت معيّن (افتراضياً نهاية اليوم). */
export function dismissRecommendation(id: string, until?: number): void {
  if (typeof window === "undefined") return;
  try {
    const obj = loadDismissed();
    obj[id] = until ?? endOfDay(Date.now());
    localStorage.setItem(DISMISS_KEY, JSON.stringify(obj));
  } catch { /* */ }
}
