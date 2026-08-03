/* ═══════════ المستوى والشارات — محرّكٌ نقيّ ═══════════
   ▓ أربعٌ وعشرون شارة على ثلاث درجات: سهلٌ يبدأ به، ومتوسّطٌ يُلزمه أسبوعاً،
     وصعبٌ يشتري بالشهور. ولكلٍّ **فضّةٌ تُصرف** — لا شارةٌ مُعلّقة على الجدار
     وحدها: الفضةُ تُنفَق في المتجر، فالإنجازُ يصير شيئاً يملكه لا صورةً يراها.

   ▓ مصدرٌ واحد للفتح: `getBadgeCurrent` تُعطي رقمَ الطالب، والشارةُ مفتوحةٌ إن
     بلغ `goal`. كان الفتحُ مكتوباً مرّتين — قائمةٌ للأرقام وقائمةٌ للشروط —
     فمتى غُيّر أحدُهما كذب الآخر. */
import type { DarbStats } from "./storage";

export interface Level {
  name: string;
  minXp: number;
  color: string;
  icon: string;
}

export const LEVELS: Level[] = [
  { name: "مبتدئ",  minXp: 0,    color: "#64748B", icon: "○" },
  { name: "طالب",   minXp: 200,  color: "#2563EB", icon: "◈" },
  { name: "متمكّن", minXp: 600,  color: "#7C3AED", icon: "◉" },
  { name: "محترف",  minXp: 1500, color: "#D97706", icon: "✦" },
  { name: "خبير",   minXp: 3500, color: "#DC2626", icon: "★" },
];

/** درجةُ الصعوبة — تُرتَّب بها الشبكة ويُعاير بها الثمن. */
export type BadgeTier = "easy" | "mid" | "hard";

export const TIER_META: Record<BadgeTier, { label: string; desc: string; color: string }> = {
  easy: { label: "سهلة",   desc: "أوّلُ خطواتك — تُفتح في أيامك الأولى", color: "var(--success)" },
  mid:  { label: "متوسطة", desc: "تحتاج أسبوعاً أو أسبوعين من الانتظام", color: "var(--accent-light)" },
  hard: { label: "صعبة",   desc: "شهورٌ من الالتزام — قليلٌ من يبلغها",  color: "var(--gold)" },
};

export interface BadgeDef {
  id: string;
  label: string;
  icon: string;
  desc: string;   // كيف تحصل عليها
  goal: number;   // الهدف المطلوب
  unit: string;   // وحدة القياس
  tier: BadgeTier;
  silver: number; // ما تُعطيه من فضة عند فتحها — مرّةً واحدة
}

/* ── المعايرة ──
   الطالبُ المجتهد يكسب ~٦٠ فضةً في اليوم من «تركيز». فالسهلةُ ٢٠–٤٠ (لمسةُ
   ترحيب)، والمتوسّطةُ ٧٥–١٥٠ (يومان أو ثلاثة)، والصعبةُ ٢٥٠–٦٠٠ (أسبوعٌ فأكثر).
   مجموعُها ٤٬٤٤٥ — لا يفتح المتجرَ كلَّه، فيبقى للمذاكرة معنى. */
export const BADGE_DEFS: BadgeDef[] = [
  /* ── سهلة: ثماني شاراتٍ يبلغها في أيامه الأولى ── */
  { id: "first_session", label: "الشعلة الأولى", icon: "🔥", desc: "أتمم أول جلسة تركيز",       goal: 1,   unit: "جلسة", tier: "easy", silver: 20 },
  { id: "sessions_5",    label: "خمس جلسات",     icon: "✋", desc: "أكمل خمس جلسات تركيز",       goal: 5,   unit: "جلسة", tier: "easy", silver: 25 },
  { id: "streak_3",      label: "ثلاثة أيام",    icon: "📆", desc: "ذاكر ثلاثة أيام متتالية",    goal: 3,   unit: "يوم",  tier: "easy", silver: 30 },
  { id: "hours_1",       label: "ساعةٌ كاملة",   icon: "⏳", desc: "اجمع ساعة تركيز",            goal: 60,  unit: "دقيقة", tier: "easy", silver: 20 },
  { id: "vault_1",       label: "أوّل خطأ",      icon: "📝", desc: "سجّل أول خطأ في خزنتك",      goal: 1,   unit: "خطأ",  tier: "easy", silver: 25 },
  { id: "first_plan",    label: "أول خطة",       icon: "📋", desc: "طبّق خطة دويرب على جدولك",   goal: 1,   unit: "خطة",  tier: "easy", silver: 30 },
  { id: "first_chat",    label: "سألتَ دويرب",   icon: "💬", desc: "افتح أول محادثة مع دويرب",   goal: 1,   unit: "محادثة", tier: "easy", silver: 20 },
  { id: "silver_100",    label: "مئويّ",         icon: "🥈", desc: "اجمع مئة فضة",               goal: 100, unit: "فضة",  tier: "easy", silver: 40 },

  /* ── متوسطة: ثماني شاراتٍ تحتاج انتظاماً لا حماساً ── */
  { id: "streak_7",      label: "أسبوع منتظم",   icon: "📅", desc: "ذاكر سبعة أيام متتالية",     goal: 7,    unit: "يوم",  tier: "mid", silver: 100 },
  { id: "sessions_20",   label: "مثابر",         icon: "💪", desc: "أكمل عشرين جلسة تركيز",      goal: 20,   unit: "جلسة", tier: "mid", silver: 90 },
  { id: "hours_10",      label: "عشر ساعات",     icon: "⏱",  desc: "اجمع عشر ساعات تركيز",       goal: 600,  unit: "دقيقة", tier: "mid", silver: 100 },
  { id: "vault_10",      label: "صيّاد الأخطاء", icon: "🔍", desc: "سجّل عشرة أخطاء في خزنتك",   goal: 10,   unit: "خطأ",  tier: "mid", silver: 80 },
  { id: "plans_5",       label: "صاحبُ خطط",     icon: "🗺️", desc: "طبّق خمس خطط على جدولك",     goal: 5,    unit: "خطة",  tier: "mid", silver: 90 },
  { id: "quiz_10",       label: "مُختبِرُ نفسه", icon: "❓", desc: "ولّد عشرة اختبارات قصيرة",   goal: 10,   unit: "اختبار", tier: "mid", silver: 90 },
  { id: "analyzed_5",    label: "قارئُ ملفّات",  icon: "📄", desc: "حلّل خمسة ملفات بالذكاء",    goal: 5,    unit: "ملف",  tier: "mid", silver: 75 },
  { id: "days_30",       label: "شهرٌ في درب",   icon: "🌙", desc: "ذاكر ثلاثين يوماً (ولو متفرّقة)", goal: 30, unit: "يوم", tier: "mid", silver: 150 },

  /* ── صعبة: ثماني شاراتٍ لا تُشترى إلا بالشهور ── */
  { id: "streak_30",     label: "الأسطورة",      icon: "🏆", desc: "ذاكر ثلاثين يوماً متتالياً",  goal: 30,   unit: "يوم",  tier: "hard", silver: 500 },
  { id: "streak_100",    label: "مئةُ يوم",      icon: "💯", desc: "ذاكر مئة يوم متتالٍ",         goal: 100,  unit: "يوم",  tier: "hard", silver: 600 },
  { id: "hours_50",      label: "خمسون ساعة",    icon: "💎", desc: "اجمع خمسين ساعة تركيز",       goal: 3000, unit: "دقيقة", tier: "hard", silver: 300 },
  { id: "hours_100",     label: "مئة ساعة",      icon: "🏅", desc: "اجمع مئة ساعة تركيز",         goal: 6000, unit: "دقيقة", tier: "hard", silver: 450 },
  { id: "sessions_100",  label: "مئةُ جلسة",     icon: "🎯", desc: "أكمل مئة جلسة تركيز",         goal: 100,  unit: "جلسة", tier: "hard", silver: 400 },
  { id: "vault_50",      label: "خزنةٌ ممتلئة",  icon: "🗄️", desc: "سجّل خمسين خطأ في خزنتك",     goal: 50,   unit: "خطأ",  tier: "hard", silver: 300 },
  { id: "silver_1000",   label: "ملكُ الفضة",    icon: "👑", desc: "اجمع ألف فضة",                goal: 1000, unit: "فضة",  tier: "hard", silver: 250 },
  { id: "track_complete",label: "أتممتَ المسار", icon: "🎓", desc: "أكمل ثمانين بالمئة من مسارك", goal: 80,   unit: "٪",    tier: "hard", silver: 550 },
];

export const badgesInTier = (tier: BadgeTier): BadgeDef[] => BADGE_DEFS.filter((b) => b.tier === tier);

/** القيمة الحالية للطالب تجاه كل شارة (للشريط ولقرار الفتح معاً). */
export function getBadgeCurrent(id: string, stats: DarbStats, vaultCount: number): number {
  const streak = computeStreakDays(stats);
  switch (id) {
    case "first_session":
    case "sessions_5":
    case "sessions_20":
    case "sessions_100":  return stats.sessionsCount ?? 0;
    case "streak_3":
    case "streak_7":
    case "streak_30":
    case "streak_100":    return streak;
    case "hours_1":
    case "hours_10":
    case "hours_50":
    case "hours_100":     return stats.totalFocusMins ?? 0;
    case "silver_100":
    case "silver_1000":   return stats.silver ?? 0;
    case "vault_1":
    case "vault_10":
    case "vault_50":      return vaultCount;
    case "first_plan":
    case "plans_5":       return stats.plansCount ?? 0;
    case "first_chat":    return stats.aiChats ?? 0;
    case "quiz_10":       return stats.quizCount ?? 0;
    case "analyzed_5":    return stats.analyzedCount ?? 0;
    case "days_30":       return (stats.sessionDays ?? []).length;
    case "track_complete":return stats.trackProgress ?? 0;
    default:              return 0;
  }
}

export function computeXP(stats: DarbStats): number {
  return (
    Math.floor(stats.totalFocusMins * 2) +
    stats.sessionsCount * 15 +
    stats.silver * 3
  );
}

function computeStreakDays(stats: DarbStats): number {
  const days = new Set(stats.sessionDays);
  if (!days.size) return 0;
  const d = new Date();
  const key = (dt: Date) => dt.toISOString().slice(0, 10);
  if (!days.has(key(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(key(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

export function getLevel(xp: number): Level & { next?: Level; progress: number } {
  let current = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.minXp) current = l; }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1];
  const progress = next
    ? Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)
    : 100;
  return { ...current, next, progress };
}

/** المفتوحُ = مَن بلغ هدفَه. مصدرٌ واحد، فلا يفترق الشريطُ عن الحالة. */
export function getUnlockedBadgeIds(stats: DarbStats, vaultCount: number): string[] {
  return BADGE_DEFS.filter((b) => getBadgeCurrent(b.id, stats, vaultCount) >= b.goal).map((b) => b.id);
}

/** فضّةُ ما فُتح ولم يُصرف بعد — تُصرف مرّةً واحدة لكلّ شارة. */
export function pendingBadgeSilver(unlocked: string[], claimed: string[]): { ids: string[]; silver: number } {
  const done = new Set(claimed);
  const ids = unlocked.filter((id) => !done.has(id) && BADGE_DEFS.some((b) => b.id === id));
  const silver = ids.reduce((sum, id) => sum + (BADGE_DEFS.find((b) => b.id === id)?.silver ?? 0), 0);
  return { ids, silver };
}
