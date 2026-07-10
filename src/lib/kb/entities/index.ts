/* ═══════════ قاعدة المعرفة الموحّدة — نقطة الدخول ═══════════
   KB: مثيلٌ واحد من الرسم المبنيّ من البذرة. تستهلكه الصفحات ودويرب والوكلاء عبر
   واجهة واحدة (get/search/neighbors/describe/groundingFor). هنا يُضخّ المحتوى لاحقاً
   بدمج بذرات إضافية بنفس المخطّط — بلا إعادة هيكلة. */
export * from "./schema";
export { KnowledgeBase, type ResolvedEdge } from "./registry";
import { KnowledgeBase } from "./registry";
import { SEED_ENTITIES } from "./seed";

export const KB = new KnowledgeBase(SEED_ENTITIES);
