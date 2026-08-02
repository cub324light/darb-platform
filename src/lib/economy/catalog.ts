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

/** أصنافُ المتجر. ← أضِف هنا. */
export const CATALOG: StoreItem[] = [];

export const itemById = (catalog: StoreItem[], id: string): StoreItem | null =>
  catalog.find((i) => i.id === id) ?? null;

export const itemsInSlot = (catalog: StoreItem[], slot: CosmeticSlot): StoreItem[] =>
  catalog.filter((i) => i.slot === slot);
