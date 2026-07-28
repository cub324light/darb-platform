/* ═══════════ كتالوج المصادر الجاهزة (من المنصّة) ═══════════
   ▸ لماذا؟ الطالب يضيف مصادره، والمنصّة تقترح عليه المعروف منها فلا يبدأ من ورقةٍ بيضاء.
   ▸ صدق — قاعدةٌ حاكمة: `totalUnits` **غائبٌ عمداً** لكل مصدر. أعداد الحلقات والصفحات
     تتغيّر كل موسم، ولا نملك مصدراً موثّقاً لها، فنسأل الطالب بدل أن نخترع رقماً يبني
     عليه خطّته. (نفس عرف `university.ts`: «الغياب مقصود عند عدم اليقين».)
   ▸ الروابط نطاقاتٌ رسميةٌ موثّقة فقط — كما في `officialLinks.ts`.
   ▸ التوسعة: أضِف سطراً هنا فقط. لا تعديل في الواجهة ولا في المحرّك. */
import type { SourceKind } from "@/lib/roadmap/sources";

export interface CatalogSource {
  id: string;
  name: string;
  desc: string;
  kind: SourceKind;
  /** مفاتيح الاختبارات التي يخدمها (examKey من الواصف): قدرات · تحصيلي · ستيب … */
  examKeys: string[];
  /** مواد بعينها. الغياب = كل مواد الاختبار. */
  subjects?: string[];
  url?: string;
  /** عددُ الوحدات — يبقى غائباً حتى نملك مصدراً موثّقاً. الواجهة تسأل الطالب. */
  totalUnits?: number;
}

export const SOURCE_CATALOG: CatalogSource[] = [
  { id: "qiyas-official", name: "قياس — الاختبارات التجريبية", desc: "التجريبيّ الرسميّ من هيئة تقويم التعليم والتدريب.",
    kind: "video", examKeys: ["قدرات", "تحصيلي", "ستيب"], url: "https://etec.gov.sa" },
  { id: "qdrat-sa", name: "منصة قدرات", desc: "دروسٌ عن بُعد للقدرات والتحصيلي.",
    kind: "video", examKeys: ["قدرات", "تحصيلي"], url: "https://qdrat.sa" },
  { id: "mujtahid", name: "مجتهد", desc: "بنك أسئلةٍ محلولة ومحاكي اختبارات.",
    kind: "video", examKeys: ["قدرات", "تحصيلي"], url: "https://mujtahidacademy.com" },
  { id: "raiz", name: "رائز", desc: "شرح المناهج والقدرات والتحصيلي.",
    kind: "video", examKeys: ["قدرات", "تحصيلي"], url: "https://www.raizsa.com" },
  { id: "ekhtibarat", name: "منصة اختبارات", desc: "تدريبٌ على القدرات والتحصيلي وSTEP.",
    kind: "video", examKeys: ["قدرات", "تحصيلي", "ستيب"], url: "https://ekhtibarat.com" },
];

/** المصادر الجاهزة المناسبة لاختبارٍ ومادة. مادةٌ غير مذكورة ⇒ المصدر عامٌّ للاختبار كلّه. */
export function catalogFor(examKey: string | undefined, subject: string): CatalogSource[] {
  if (!examKey) return [];
  return SOURCE_CATALOG.filter(
    (c) => c.examKeys.includes(examKey) && (!c.subjects || c.subjects.includes(subject)),
  );
}
