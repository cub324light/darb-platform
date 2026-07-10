/* ═══════════ محتوى قاعدة المعرفة — مجمّع الدفعات ═══════════
   يُبنى دفعةً دفعة (٢٠–٣٠ عقدة، ثم مراجعة/تنظيف/ربط، ثم التالية). كل دفعة ملفٌ
   مستقل يُضاف هنا. الترتيب الرسمي: القدرات ← التحصيلي ← الكتب ← STEP ← الجامعة. */
import type { KBEntity } from "../schema";
import { QUDURAT_CONCEPTS } from "./qudurat";
import { TAHSILI_CONCEPTS } from "./tahsili";

export const CONTENT_ENTITIES: KBEntity[] = [
  ...QUDURAT_CONCEPTS,
  ...TAHSILI_CONCEPTS,
];
