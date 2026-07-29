/* ═══════════ خيطُ الصفحة التالية (Page Thread) — نقيٌّ ١٠٠٪ ═══════════
   ▸ العطل: قِسنا صفحات درب على الجوال فوجدنا «مساري» و«أوربت» و«أخطائي» بصفر
     روابطَ سياقية — غرفٌ مغلقة مخرجُها الوحيد الشريط السفلي. وأربعُ صفحاتٍ لا
     يشير إليها أحد. فبدت المنصّة كأن كل صفحةٍ فيها منتجٌ قائمٌ بذاته.

   ▸ العلاج: خيطٌ واحد أسفل كل صفحة يحمل عملَ الطالب إلى الصفحة التي تُكمله —
     «راجعت أخطاءك؟ ذاكرها الآن في جلسة تركيز ←». لا قائمةَ روابطَ معلّبة:
     القوائم موجودةٌ أصلاً ولم تصنع ترابطاً.

   ▸ لا دماغَ ثانٍ: الترتيب العام يبقى لـ`lifeEngine`. هذه الوحدة تختار من
     أولوياته ما يناسب الصفحة الحالية، وتضيف وصلاتٍ سياقيةً يعرفها السياق ولا
     يعرفها المحرّك العام (أخطائي ← تركيز).

   ▸ نقيٌّ تماماً: لا localStorage ولا window ولا Date — المدخلات فقط (قاعدة P1). */
import type { Priority } from "./lifeEngine";

export interface ThreadSignals {
  activeErrors: number;      // أخطاءٌ لم تُراجَع بعد
  remainingDrills: number;   // تدريباتٌ متبقّية
  hasPlanToday: boolean;     // للطالب جدولٌ اليوم
  focusMinsToday: number;    // دقائق تركيزٍ أنجزها اليوم
  homeworkDue: number;       // واجباتٌ مستحقّة
  hasDestination: boolean;   // اختار جامعةً/تخصصاً
  admissionOpen: boolean;    // عالم القبول مفتوحٌ لمرحلته
}

export interface PageThread {
  icon: string;
  /* لماذا يُعرض هذا الآن — من حالته الحقيقية، بلا رقمٍ مخترَع */
  reason: string;
  cta: string;
  href: string;
}

/* الصفحات التي نصلها — المفتاح مسارُها */
export type ThreadPage =
  | "/dashboard" | "/plan" | "/roadmap" | "/orbit" | "/vault"
  | "/school" | "/profile" | "/university" | "/future";

const arabicCount = (n: number, one: string, two: string, few: string, many: string): string =>
  n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${many}`;

/* وصلاتٌ سياقية يعرفها موضعُ الطالب ولا يعرفها المحرّك العام.
   كلٌّ منها مشروطٌ بحالةٍ حقيقية — فإن لم تتحقّق سقط إلى أولويات `lifeEngine`. */
function contextual(page: ThreadPage, s: ThreadSignals): PageThread | null {
  switch (page) {
    /* أخطائي ← تركيز: الخطأ المحفوظ بلا مذاكرةٍ تتبعه ورقٌ في درج */
    case "/vault":
      if (s.activeErrors > 0) {
        return {
          icon: "⏱️",
          reason: `عندك ${arabicCount(s.activeErrors, "خطأ واحد لم تراجعه", "خطآن لم تراجعهما", "أخطاء لم تراجعها", "خطأً لم تراجعه")}`,
          cta: "ذاكرها في جلسة تركيز",
          href: "/orbit",
        };
      }
      return { icon: "🗺️", reason: "خزنتك نظيفة", cta: "تابع تقدّمك في مساري", href: "/roadmap" };

    /* تركيز ← أخطائي: بعد الجلسة، ما أخطأتَ فيه يُحفَظ وإلا ضاع */
    case "/orbit":
      if (s.focusMinsToday > 0) {
        return { icon: "🗃️", reason: "أنهيت مذاكرةً اليوم", cta: "احفظ ما أخطأت فيه في أخطائي", href: "/vault" };
      }
      if (!s.hasPlanToday) {
        return { icon: "🗓️", reason: "ما عندك جدولٌ اليوم", cta: "رتّب يومك في خطتي", href: "/plan" };
      }
      return { icon: "🗺️", reason: "تابع أين وصلت", cta: "افتح مساري", href: "/roadmap" };

    /* مساري ← خطتي: تعرف ما ينقصك، فالخطوة أن تحجز له وقتاً */
    case "/roadmap":
      if (!s.hasPlanToday) {
        return { icon: "🗓️", reason: "معرفتك بما ينقصك لا تنفع بلا وقتٍ محجوز", cta: "رتّب يومك في خطتي", href: "/plan" };
      }
      if (s.remainingDrills > 0) {
        return { icon: "⏱️", reason: "عندك تدريبٌ متبقٍّ", cta: "ابدأ جلسة تركيز", href: "/orbit" };
      }
      return { icon: "🗃️", reason: "ثبّت ما تعلّمته", cta: "راجع أخطاءك", href: "/vault" };

    /* المدرسة ← خطتي: الواجب المستحقّ يزاحم المذاكرة، فليدخل الجدول */
    case "/school":
      if (s.homeworkDue > 0) {
        return { icon: "🗓️", reason: `عندك ${arabicCount(s.homeworkDue, "واجبٌ مستحقّ", "واجبان مستحقّان", "واجبات مستحقّة", "واجباً مستحقّاً")}`, cta: "احجز لها وقتاً في خطتي", href: "/plan" };
      }
      return { icon: "🗓️", reason: "مدرستك تحت السيطرة", cta: "شوف خطة يومك", href: "/plan" };

    /* خطتي ← تركيز أو مساري */
    case "/plan":
      if (s.hasPlanToday && s.focusMinsToday === 0) {
        return { icon: "⏱️", reason: "جدولك جاهز وما بدأت بعد", cta: "ابدأ أول جلسة", href: "/orbit" };
      }
      return { icon: "🗺️", reason: "شوف أثر اليوم على جاهزيتك", cta: "افتح مساري", href: "/roadmap" };

    /* وجهتي/المستقبل ← دليل الجامعات (صفحةٌ يتيمة لا يشير إليها أحد) */
    case "/university":
    case "/future":
      if (!s.hasDestination && s.admissionOpen) {
        return { icon: "🏛️", reason: "ما حدّدت وجهتك بعد", cta: "استكشف الجامعات وتخصصاتها", href: "/universities" };
      }
      return { icon: "🏛️", reason: "قارن وجهتك بغيرها", cta: "تصفّح دليل الجامعات", href: "/universities" };

    /* ملفي ← الرئيسية */
    case "/profile":
      return { icon: "🏠", reason: "ارجع لعملك", cta: "افتح لوحتك", href: "/dashboard" };

    default:
      return null;
  }
}

/** يبني خيط «الخطوة التالية» لصفحةٍ بعينها — أو `null` إن لم يكن ثمّة ما يُقال. */
export function pageThread(
  page: ThreadPage,
  priorities: Priority[],
  signals: ThreadSignals,
): PageThread | null {
  const ctx = contextual(page, signals);
  /* لا نُرجِع خيطاً يعيد الطالب إلى الصفحة التي هو فيها — كان هذا عطلاً حقيقياً
     في بطاقةٍ سابقة: زرٌّ في «مساري» يؤدّي إلى «مساري». */
  if (ctx && ctx.href !== page) return ctx;

  /* الرئيسية (ومَن سقط سياقُه): أعلى أولوية من `lifeEngine` تخرج بالطالب من صفحته */
  const p = priorities.find((x) => x.href && x.href !== page);
  if (!p) return null;
  return { icon: p.icon, reason: p.why, cta: p.cta, href: p.href };
}
