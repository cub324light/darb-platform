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

/* فارغٌ عمداً بقرار المالك — تُملأ بمصادر المنصّة المعتمدة لاحقاً. الواجهة تتعامل مع
   القائمة الفارغة كحالةٍ طبيعية: تعرض «مصدرٌ خاصٌّ بي» وحده بلا قسم اختيارٍ فارغ. */
export const SOURCE_CATALOG: CatalogSource[] = [];

/** المصادر الجاهزة المناسبة لاختبارٍ ومادة. مادةٌ غير مذكورة ⇒ المصدر عامٌّ للاختبار كلّه. */
export function catalogFor(examKey: string | undefined, subject: string): CatalogSource[] {
  if (!examKey) return [];
  return SOURCE_CATALOG.filter(
    (c) => c.examKeys.includes(examKey) && (!c.subjects || c.subjects.includes(subject)),
  );
}
