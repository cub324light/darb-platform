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
import type { ArcStep } from "./uniJourney";

export interface ThreadSignals {
  activeErrors: number;      // أخطاءٌ لم تُراجَع بعد
  remainingDrills: number;   // تدريباتٌ متبقّية
  hasPlanToday: boolean;     // للطالب جدولٌ اليوم
  focusMinsToday: number;    // دقائق تركيزٍ أنجزها اليوم
  homeworkDue: number;       // واجباتٌ مستحقّة
  hasDestination: boolean;   // اختار جامعةً/تخصصاً
  admissionOpen: boolean;    // عالم القبول مفتوحٌ لمرحلته
  /* خطوةُ الطالب التالية في قوس الرحلة الجامعية (`uniJourney.arcNext`).
     تُحسب في طبقة الـIO وتصل جاهزةً — هذه الوحدةُ تختار ولا تقرّر. */
  journey?: ArcStep | null;
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
  | "/school" | "/profile" | "/university" | "/future"
  /* صفحاتُ عالم الجامعة — كانت كلُّها بلا خيطٍ يُخرج منها */
  | "/universities" | "/opportunities" | "/career" | "/uni-tools" | "/uni-gear";

/* خطوةُ القوس بصيغة الخيط — بلا حقل المرحلة (لا يعني الطالبَ اسمُها) */
const stepOf = (a: ArcStep): PageThread =>
  ({ icon: a.icon, reason: a.reason, cta: a.cta, href: a.href });

/* ▓ `/career` و`/future` مساران لمحتوىً واحد (`CareerCenter` نفسُه). فالخيطُ من
   أحدهما إلى الآخر يَعِد الطالبَ بصفحةٍ جديدة ويسلّمه الصفحةَ التي هو فيها.
   (التكرارُ مسجَّلٌ في `docs/backlog.md` ولم يُدمَج — هنا نمنع أثره فقط.) */
const SAME_CONTENT: Record<string, string> = { "/career": "/future", "/future": "/career" };
const isHere = (href: string, page: ThreadPage): boolean =>
  href === page || SAME_CONTENT[page] === href;

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

    /* ▓ عالمُ الجامعة كلُّه: خطوةُ القوس أولاً — هي التي تجعل الصفحات رحلةً
       لا جُزُراً. وحين لا تصل (لا إشارات) يبقى السلوكُ القديم كما هو حرفاً بحرف. */
    case "/universities":
    case "/opportunities":
    case "/career":
    case "/uni-tools":
    case "/uni-gear":
      return s.journey && !isHere(s.journey.href, page) ? stepOf(s.journey) : null;

    /* وجهتي/المستقبل ← خطوةُ القوس، وإلّا السلوكُ القديم كما هو حرفاً بحرف.
       (وحين تشير الخطوةُ إلى الصفحة نفسها فالطالبُ واقفٌ في مكانها الصحيح.) */
    case "/university":
    case "/future":
      if (s.journey && !isHere(s.journey.href, page)) return stepOf(s.journey);
      /* ▓ ولا يُساق إلى «دليل الجامعات» مَن خرج من عالم القبول أصلاً: الجامعيُّ
         وخريجُ الجامعة وجهتُهما خلفَهما. `admissionOpen` كان يصل `true` دائماً من
         طبقة الـIO فيرى الخرّيجُ «قارن وجهتك بغيرها» — وهو قد اختار وتخرّج. */
      if (!s.admissionOpen) return null;
      if (!s.hasDestination) {
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
  if (ctx && !isHere(ctx.href, page)) return ctx;

  /* الرئيسية (ومَن سقط سياقُه): أعلى أولوية من `lifeEngine` تخرج بالطالب من صفحته */
  const p = priorities.find((x) => x.href && !isHere(x.href, page));
  if (!p) return null;
  return { icon: p.icon, reason: p.why, cta: p.cta, href: p.href };
}
