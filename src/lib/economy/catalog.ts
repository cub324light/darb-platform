/* ═══════════ كتالوج متجر الفضة — المكان الوحيد لأصنافه ═══════════
   الفضةُ تُكسَب اليوم في «تركيز» (دقيقةٌ = فضة، و١٠ مكافأةَ أول جلسة) ولا تُصرف
   في شيء. هذه بنيةُ الصرف: أنواعُ الأصناف وشروطُها وأسعارُها.

   ▓ الأصناف **جماليّة فقط** — لقبٌ أو شارةٌ أو ثيم. لا نبيع وظيفةً بالفضة:
     أن تصير المذاكرةُ شرطاً لاستعمال أدواتِ المذاكرة عقوبةٌ لا مكافأة. ومن أراد
     أدواتٍ أكثر فاشتراكُ شاهين، لا عملةُ اللعب.

   ▓ `CATALOG` فارغٌ عمداً حتى يختار المالكُ الأصناف. أضِفها هنا وحدها — المحرّك
     والمتجر يقرآن منها، فلا يحتاج شيءٌ آخر تعديلاً. نقيّ: بياناتٌ وثوابتُ عرض. */

/** خانةُ الزينة: لا يُلبس صنفان في خانةٍ واحدة. */
export type CosmeticSlot = "title" | "badge" | "theme" | "dome";

export const SLOT_LABEL: Record<CosmeticSlot, string> = {
  title: "لقب",
  badge: "شارة",
  theme: "ثيم",
  dome: "سماء القبّة",
};

/** شرطُ إنجازٍ يُفتح به الصنف — فليست الفضةُ وحدها بابَ كل شيء. */
export interface StoreRequire {
  minSessions?: number;    // عددُ جلسات التركيز المنجزة
  minFocusMins?: number;   // مجموعُ دقائق التركيز
  minStreak?: number;      // أيامٌ متتالية
}

export interface StoreItem {
  id: string;              // ثابتٌ للأبد — يُخزَّن في ملكيّة الطالب
  slot: CosmeticSlot;
  label: string;
  desc?: string;
  price: number;           // بالفضة (صفرٌ = مجّانيّ يُفتح بالإنجاز وحده)
  requires?: StoreRequire;
}

/** أصنافُ المتجر. ← أضِف هنا وحدها.

    ▓ معايرةُ الأسعار: الطالبُ المجتهد يكسب ~٦٠ فضةً في اليوم (٥٠ دقيقةَ تركيزٍ
      + ١٠ مكافأةَ أوّل جلسة). فاللقبُ بمئةٍ يومان، وبثلاثمئةٍ خمسةُ أيام،
      وبألفٍ أسبوعان ونصف. جعلنا أوّلَ لقبٍ رخيصاً (٨٠) ليذوق الطالبُ الشراء
      في أوّل أسبوعه، ثم تتدرّج — والغالي منها مشروطٌ بإنجازٍ لا بمالٍ فقط. */
export const CATALOG: StoreItem[] = [
  /* ── ألقاب ── */
  { id: "t-mubtade", slot: "title", label: "المبتدئ",   desc: "أوّلُ خطوةٍ في الطريق.", price: 80 },
  { id: "t-multazim", slot: "title", label: "المُلتزم", desc: "من يذاكر ولو قلّ.", price: 250, requires: { minStreak: 3 } },
  { id: "t-mujtahid", slot: "title", label: "المجتهد",  desc: "عشرُ ساعاتِ تركيزٍ خلفك.", price: 400, requires: { minFocusMins: 600 } },
  { id: "t-sabir",    slot: "title", label: "الصابر",   desc: "أسبوعٌ متّصلٌ بلا انقطاع.", price: 700, requires: { minStreak: 7 } },
  { id: "t-mutqin",   slot: "title", label: "المُتقن",  desc: "خمسون جلسةً منجزة.", price: 1200, requires: { minSessions: 50 } },

  /* ── شارات ── */
  { id: "b-first",   slot: "badge", label: "🌱 أوّل جلسة", desc: "بدأتَ فعلاً.", price: 0, requires: { minSessions: 1 } },
  { id: "b-week",    slot: "badge", label: "🔥 أسبوعٌ متّصل", desc: "سبعةُ أيامٍ بلا انقطاع.", price: 0, requires: { minStreak: 7 } },
  { id: "b-owl",     slot: "badge", label: "🦉 بومة",  desc: "زينةٌ لمن أحبّها.", price: 150 },
  { id: "b-rocket",  slot: "badge", label: "🚀 صاروخ", desc: "زينةٌ لمن أحبّها.", price: 150 },
  { id: "b-moon",    slot: "badge", label: "🌙 هلال",  desc: "زينةٌ لمن أحبّها.", price: 150 },
  { id: "b-crown",   slot: "badge", label: "👑 تاج",   desc: "مئةُ ساعةِ تركيز.", price: 900, requires: { minFocusMins: 6000 } },
];

export const itemById = (catalog: StoreItem[], id: string): StoreItem | null =>
  catalog.find((i) => i.id === id) ?? null;

export const itemsInSlot = (catalog: StoreItem[], slot: CosmeticSlot): StoreItem[] =>
  catalog.filter((i) => i.slot === slot);
