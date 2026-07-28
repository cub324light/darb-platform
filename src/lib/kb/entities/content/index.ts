/* ═══════════ محتوى قاعدة المعرفة — مجمّع الدفعات ═══════════
   يُبنى دفعةً دفعة (20–30 عقدة، ثم مراجعة/تنظيف/ربط، ثم التالية). كل دفعة ملفٌ
   مستقل يُضاف هنا. الترتيب الرسمي: القدرات ← التحصيلي ← الكتب ← STEP ← الجامعة. */
import type { KBEntity } from "../schema";
import { QUDURAT_CONCEPTS } from "./qudurat";
import { TAHSILI_CONCEPTS } from "./tahsili";
import { ENGLISH_CONCEPTS } from "./english";
import { OHMS_LAW_SLICE } from "./lessons/ohms-law";

export const CONTENT_ENTITIES: KBEntity[] = [
  ...QUDURAT_CONCEPTS,
  ...TAHSILI_CONCEPTS,
  ...ENGLISH_CONCEPTS,
  /* الطبقة الثانية — أول Vertical Slice كامل (درس + أسئلة + مصادر) */
  ...OHMS_LAW_SLICE,
];
