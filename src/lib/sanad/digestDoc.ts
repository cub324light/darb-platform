/* ═══════════ وثيقةُ الملخّص المرفوعة — الحارسُ الفعليّ للوعد ═══════════
   وعدنا الطالبَ في شاشة الربط بأنّ والدَه سيرى ساعاتِه وجلساتِه ومادّتَه الأضعف
   وقربَ اختباره، و**لن يرى** محادثاتِه مع دويرب ولا دفترَه ولا أخطاءه المفصّلة.
   ما دام الملخّصُ يُقرأ على جهاز الطالب وحده كان الوعدُ محفوظاً بالبنية. أمّا
   وقد صار يُرفع إلى السحابة فالوعدُ يحتاج حارساً في الكود لا في النيّة.

   `projectDigest` هو الحارس: **قائمةُ سماحٍ** لا قائمةَ منع. يبني وثيقةً جديدة
   حقلاً حقلاً من الملخّص، فما لم يُذكر هنا لا يُرفع — ولو أضاف أحدُنا غداً حقلاً
   حسّاساً إلى `ParentDigest` لم يتسرّب من هذا الباب. اختبارٌ يحرس ذلك بأن يحقن
   حقولاً دخيلةً ويتأكّد أنّها لا تعبر.

   نقيّ: لا شبكةَ ولا تخزينَ ولا `Date.now()` — الوقتُ يُمرَّر. */
import type { ParentDigest } from "../parentDigest";

/** رقمُ صيغةِ الوثيقة — يرتفع إن تغيّر شكلُها فيعرف القارئُ القديم أنّه قديم. */
export const DIGEST_VERSION = 1;

/** أقصى عمرٍ نعتبر بعده الملخّصَ بائتاً: جهازُ الطالب لم يرفع منذ ثلاثة أيام. */
export const DIGEST_STALE_MS = 3 * 24 * 60 * 60 * 1000;

export interface DigestDoc {
  v: number;
  updatedAt: number;
  student: { name: string; stage: string | null; goal: string | null };
  status: ParentDigest["status"];
  progress: ParentDigest["progress"];
  support: ParentDigest["support"];
  nextExam: ParentDigest["nextExam"];
  achievements: ParentDigest["achievements"];
  suggestion: ParentDigest["suggestion"];
  alert: ParentDigest["alert"];
}

/** يبني الوثيقةَ المرفوعة من الملخّص — قائمةُ سماحٍ صريحة، حقلاً حقلاً. */
export function projectDigest(d: ParentDigest, now: number): DigestDoc {
  return {
    v: DIGEST_VERSION,
    updatedAt: now,
    student: { name: d.student.name, stage: d.student.stage, goal: d.student.goal },
    status: d.status,
    progress: d.progress,
    support: d.support,
    nextExam: d.nextExam,
    achievements: d.achievements,
    suggestion: d.suggestion,
    alert: d.alert,
  };
}

/* «لحظات» (moments) لا تُرفع عمداً: نصوصٌ حرّةٌ من يوم الطالب، وهي أقربُ إلى
   دفتره منها إلى ملخّصٍ للوالد. تبقى على جهازه. */

export function isStale(doc: { updatedAt?: number } | null, now: number): boolean {
  if (!doc || typeof doc.updatedAt !== "number") return true;
  return now - doc.updatedAt > DIGEST_STALE_MS;
}

/** يتحقّق من وثيقةٍ قادمةٍ من الشبكة قبل عرضها — لا نثق بما نقرأ. */
export function isDigestDoc(v: unknown): v is DigestDoc {
  if (!v || typeof v !== "object") return false;
  const d = v as Partial<DigestDoc>;
  return typeof d.v === "number"
    && typeof d.updatedAt === "number"
    && !!d.student && typeof d.student.name === "string"
    && !!d.status && typeof d.status.level === "string"
    && !!d.progress && typeof d.progress.commitmentPct === "number";
}
