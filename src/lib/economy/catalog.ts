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
  /** لقبُ مستوى: يُمنَح تلقائياً عند بلوغه ولا يُعرض في المتجر ولا يُشترى.
      وجودُه في الكتالوج ضروريٌّ ليعرف `equippedItem` كيف يرسمه. */
  levelIndex?: number;
}

/** أصنافُ المتجر. ← أضِف هنا وحدها.

    ▓ معايرةُ الأسعار: الطالبُ المجتهد يكسب ~٦٠ فضةً في اليوم (٥٠ دقيقةَ تركيزٍ
      + ١٠ مكافأةَ أوّل جلسة). فاللقبُ بمئةٍ يومان، وبثلاثمئةٍ خمسةُ أيام،
      وبألفٍ أسبوعان ونصف. جعلنا أوّلَ لقبٍ رخيصاً (٨٠) ليذوق الطالبُ الشراء
      في أوّل أسبوعه، ثم تتدرّج — والغالي منها مشروطٌ بإنجازٍ لا بمالٍ فقط. */
export const CATALOG: StoreItem[] = [
  /* ── ألقابُ المستويات — تُمنَح مع كل مستوى XP جديد، ولا تُباع ──
     اللقبُ هنا **جزاءُ رحلةٍ لا سلعة**: يبلغه الطالبُ فيلبسه بلا أن يدفع.
     وأسماؤها أسماءُ المستويات نفسُها في `xp.ts` — لا اسمان لشيءٍ واحد. */
  { id: "lvl-0", slot: "title", label: "مبتدئ",  desc: "بدايةُ الطريق — تُمنَح بأوّل دخول.", price: 0, levelIndex: 0 },
  { id: "lvl-1", slot: "title", label: "طالب",   desc: "بلغتَ ٢٠٠ نقطة خبرة.",   price: 0, levelIndex: 1 },
  { id: "lvl-2", slot: "title", label: "متمكّن", desc: "بلغتَ ٦٠٠ نقطة خبرة.",   price: 0, levelIndex: 2 },
  { id: "lvl-3", slot: "title", label: "محترف",  desc: "بلغتَ ١٥٠٠ نقطة خبرة.",  price: 0, levelIndex: 3 },
  { id: "lvl-4", slot: "title", label: "خبير",   desc: "بلغتَ ٣٥٠٠ نقطة خبرة.",  price: 0, levelIndex: 4 },

  /* ── ألقابُ المتجر — تُشترى، وغيرُ ألقاب المستويات عمداً ──
     لو باعَ المتجرُ «المبتدئ» وهو يُمنَح مجّاناً بالمستوى لَبدا المتجرُ يبيع ما
     يملكه الطالبُ أصلاً. فألقابُه أسماءُ **صفةٍ لا مرتبة**: يختارها لأنها تشبهه. */
  { id: "t-mudhabir", slot: "title", label: "المُثابر",   desc: "من لا ينقطع ولو قلّ.", price: 120, requires: { minStreak: 3 } },
  { id: "t-sabir",    slot: "title", label: "الصابر",     desc: "أسبوعٌ متّصلٌ بلا انقطاع.", price: 350, requires: { minStreak: 7 } },
  { id: "t-mujtahid", slot: "title", label: "المجتهد",    desc: "عشرُ ساعاتِ تركيزٍ خلفك.", price: 500, requires: { minFocusMins: 600 } },
  { id: "t-mutqin",   slot: "title", label: "المُتقن",    desc: "خمسون جلسةً منجزة.", price: 900, requires: { minSessions: 50 } },
  { id: "t-fares",    slot: "title", label: "فارسُ الفجر", desc: "لمن يذاكر والناسُ نيام.", price: 1100, requires: { minStreak: 14 } },
  { id: "t-jabal",    slot: "title", label: "جبلٌ لا يميل", desc: "مئةُ ساعةِ تركيز.", price: 1800, requires: { minFocusMins: 6000 } },
  { id: "t-lahib",    slot: "title", label: "لهيبُ درب",   desc: "ثلاثون يوماً متّصلة.", price: 2500, requires: { minStreak: 30 } },

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

/** أصنافُ الخانة **المعروضة في المتجر** — ألقابُ المستويات ليست بضاعة. */
export const itemsInSlot = (catalog: StoreItem[], slot: CosmeticSlot): StoreItem[] =>
  catalog.filter((i) => i.slot === slot && i.levelIndex === undefined);

/** لقبُ المستوى رقم `i` — يمنحه `levelRewards` عند بلوغه. */
export const levelTitle = (catalog: StoreItem[], i: number): StoreItem | null =>
  catalog.find((x) => x.levelIndex === i) ?? null;
