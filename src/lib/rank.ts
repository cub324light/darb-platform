/* ─── نظام الرتب التنافسي (Ranked / MMR) — وحدة نقية ───
   مصدر الحقيقة الوحيد لتحويل RP إلى رتبة، وحساب تغيّر النقاط بعد كل مباراة،
   وكشف الترقية/الخفض. حتمية تماماً، صفر اعتماد على المتصفح أو الوقت.
   لا يكتب RP إلا الخادم (مقاومة للتلاعب) — هذه الوحدة تحسب فقط. */

export type TierId =
  | "bronze" | "silver" | "gold" | "platinum"
  | "diamond" | "master" | "grandmaster" | "legendary";

export interface TierDef {
  id: TierId;
  name: string;
  emoji: string;
  color: string;
  floor: number;     // أدنى RP يدخل هذه الرتبة
  divisions: number; // 3 (III/II/I) أو 1 (بلا تقسيم)
}

/* كل تقسيم = 100 RP؛ كل رتبة بثلاثة تقسيمات = 300 RP. ترتيب تصاعدي. */
export const DIVISION_SPAN = 100;

export const TIERS: TierDef[] = [
  { id: "bronze",      name: "برونزي",      emoji: "🟫", color: "#A97142", floor: 0,    divisions: 3 },
  { id: "silver",      name: "فضي",         emoji: "⬜", color: "#9CA3AF", floor: 300,  divisions: 3 },
  { id: "gold",        name: "ذهبي",        emoji: "🟨", color: "#F5B40A", floor: 600,  divisions: 3 },
  { id: "platinum",    name: "بلاتيني",     emoji: "🟦", color: "#22D3EE", floor: 900,  divisions: 3 },
  { id: "diamond",     name: "ألماسي",      emoji: "🟪", color: "#A78BFA", floor: 1200, divisions: 3 },
  { id: "master",      name: "ماستر",       emoji: "🟥", color: "#EF4444", floor: 1500, divisions: 3 },
  { id: "grandmaster", name: "جراند ماستر", emoji: "👑", color: "#F472B6", floor: 1800, divisions: 1 },
  { id: "legendary",   name: "أسطوري",      emoji: "💎", color: "#38BDF8", floor: 2400, divisions: 1 },
];

const ROMAN = ["III", "II", "I"]; // divIndex 0→III (الأدنى) ... 2→I (الأعلى)

/* RP بداية اللاعب الجديد (برونزي II) — أرحم من الصفر على أول خسارة */
export const START_RP = 100;

export interface RankInfo {
  tierId: TierId;
  tierName: string;
  emoji: string;
  color: string;
  division: number | null;   // 3 | 2 | 1 أو null للرتب أحادية التقسيم
  divisionRoman: string;     // "III" | "II" | "I" | ""
  label: string;             // "ذهبي II" أو "جراند ماستر"
  rp: number;
  floor: number;             // أدنى RP للتقسيم الحالي
  ceil: number | null;       // أعلى RP (حصري) للتقسيم الحالي، null للقمة
  toNext: number;            // RP المتبقي للترقية التالية (0 في القمة)
  progressPct: number;       // التقدّم داخل التقسيم الحالي (0–100)
  rung: number;              // فهرس عالمي للرتبة (للمقارنة: أعلى = أقوى)
}

/* مجموع التقسيمات تحت رتبة معيّنة — لحساب الفهرس العالمي للرتبة (rung) */
function rungBase(tierIndex: number): number {
  let n = 0;
  for (let i = 0; i < tierIndex; i++) n += TIERS[i].divisions;
  return n;
}

/* تحويل RP إلى رتبة كاملة — حتمي ونقي */
export function rankFromRP(rpRaw: number): RankInfo {
  const rp = Math.max(0, Math.floor(rpRaw || 0));

  let ti = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (rp >= TIERS[i].floor) ti = i;
    else break;
  }
  const tier = TIERS[ti];
  const next = TIERS[ti + 1];

  if (tier.divisions === 1) {
    const floor = tier.floor;
    const ceil = next ? next.floor : null;
    const toNext = ceil != null ? ceil - rp : 0;
    const progressPct = ceil != null ? Math.min(100, Math.round(((rp - floor) / (ceil - floor)) * 100)) : 100;
    return {
      tierId: tier.id, tierName: tier.name, emoji: tier.emoji, color: tier.color,
      division: null, divisionRoman: "", label: tier.name,
      rp, floor, ceil, toNext, progressPct, rung: rungBase(ti),
    };
  }

  const offset = rp - tier.floor;
  const divIndex = Math.min(tier.divisions - 1, Math.floor(offset / DIVISION_SPAN)); // 0..2
  const floor = tier.floor + divIndex * DIVISION_SPAN;
  const ceil = floor + DIVISION_SPAN;
  const division = tier.divisions - divIndex; // 3,2,1
  const roman = ROMAN[divIndex];
  const progressPct = Math.min(100, Math.round(((rp - floor) / DIVISION_SPAN) * 100));

  return {
    tierId: tier.id, tierName: tier.name, emoji: tier.emoji, color: tier.color,
    division, divisionRoman: roman, label: `${tier.name} ${roman}`,
    rp, floor, ceil, toNext: ceil - rp, progressPct, rung: rungBase(ti) + divIndex,
  };
}

/* ─── حساب تغيّر RP بعد مباراة (Elo معدّل) ─── */
export interface RpChangeInput {
  myRP: number;
  oppRP: number;
  won: boolean;
  winStreak: number; // سلسلة الانتصارات الحالية (قبل هذه المباراة)
}

export interface RpChange {
  delta: number;        // التغيّر الفعلي في RP (بعد الحدّ الأدنى 0)
  base: number;         // مكوّن Elo قبل مكافأة السلسلة
  streakBonus: number;  // مكافأة سلسلة الانتصارات (للفوز فقط)
  newRP: number;
  newStreak: number;
  promoted: boolean;
  demoted: boolean;
}

/* احتمال الفوز المتوقَّع وفق Elo */
export function expectedScore(myRP: number, oppRP: number): number {
  return 1 / (1 + Math.pow(10, (oppRP - myRP) / 400));
}

const MIN_WIN_GAIN = 12;  // الفوز دائماً يُشعِر بالتقدّم
const MAX_LOSS = 32;      // سقف الخسارة (استقرار)
const STREAK_MIN = 3;     // تبدأ المكافأة من سلسلة 3
const STREAK_CAP = 15;    // أقصى مكافأة سلسلة

export function computeRpChange({ myRP, oppRP, won, winStreak }: RpChangeInput): RpChange {
  const E = expectedScore(myRP, oppRP);
  const k = myRP >= 1500 ? 24 : 32; // ثبات أعلى في الرتب العليا
  const S = won ? 1 : 0;
  let base = Math.round(k * (S - E));

  let streakBonus = 0;
  const newStreak = won ? winStreak + 1 : 0;

  if (won) {
    base = Math.max(base, MIN_WIN_GAIN);
    if (newStreak >= STREAK_MIN) streakBonus = Math.min((newStreak - STREAK_MIN + 1) * 3, STREAK_CAP);
  } else {
    base = Math.max(base, -MAX_LOSS);
    base = Math.min(base, -1); // الخسارة تنقص شيئاً دائماً (قبل الحدّ عند 0)
  }

  const rawDelta = base + streakBonus;
  const newRP = Math.max(0, myRP + rawDelta);
  const delta = newRP - myRP; // التغيّر الفعلي بعد الحدّ الأدنى

  const before = rankFromRP(myRP).rung;
  const after = rankFromRP(newRP).rung;

  return {
    delta, base, streakBonus, newRP, newStreak,
    promoted: after > before,
    demoted: after < before,
  };
}
