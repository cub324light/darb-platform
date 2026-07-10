/* ═══════════ قاعدة المعرفة الموحّدة — نقطة الدخول ═══════════
   KB: مثيلٌ واحد من الرسم المبنيّ من البذرة. تستهلكه الصفحات ودويرب والوكلاء عبر
   واجهة واحدة (get/search/neighbors/describe/groundingFor). هنا يُضخّ المحتوى لاحقاً
   بدمج بذرات إضافية بنفس المخطّط — بلا إعادة هيكلة. */
export * from "./schema";
export { KnowledgeBase, type ResolvedEdge, type KBStats } from "./registry";
import { KnowledgeBase } from "./registry";
import { SEED_ENTITIES } from "./seed";
import { CONTENT_ENTITIES } from "./content";

/* الرسم = البذرة البنيوية + دفعات المحتوى (تُضاف تباعاً بلا إعادة هيكلة) */
export const KB = new KnowledgeBase([...SEED_ENTITIES, ...CONTENT_ENTITIES]);
