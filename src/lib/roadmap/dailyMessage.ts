/* ═══════════ رسالة دويرب (Daily Message) — روحُ مساري، نقيّةٌ وصادقة ═══════════
   ▸ لماذا؟ ليشعر الطالب أن دويرب أخٌ يعرفه لا نظامٌ يعرض أرقاماً. تُخاطبه بالاسم وتتغيّر يومياً.
   ▸ المصدر: إشاراتٌ حقيقية فقط (باقي أيام الاختبار · نشاط الأمس · السلسلة · هل بدأ) — لا اختراع.
   ▸ الهدف: ترحيبٌ + رسالةٌ واحدةٌ مناسبةٌ لحال الطالب. الحالة تتغيّر يومياً فتتغيّر الرسالة.
   ▸ نقاءٌ تام: تستقبل الإشارات كمُدخَل؛ القارئ يجمّعها من التخزين خارج هذه الدالّة. */
import { n } from "../format";
import { duwairbGreeting } from "../greeting";

export interface DailyMessage { greeting: string; message: string; }

export interface DailySignals {
  name?: string;
  /** ساعةُ اللحظة (٠..٢٣) ورقمٌ عشوائيّ — بهما تتبدّل التحيّة فلا تصير أثاثاً.
      يأتيان من القارئ لا من هنا: المحرّكُ نقيٌّ لا يعرف الوقتَ ولا العشوائيّ. */
  hour?: number;
  rand?: number;
  everStarted: boolean;         // هل بدأ المذاكرة يوماً؟
  yesterdayMins?: number;       // دقائق الأمس (لكشف الاجتهاد/الخمول)
  streakDays?: number;          // سلسلة الأيام المتتالية حتى اليوم
  daysToExam?: number | null;   // باقي أيام أقرب اختبار (إن وُجد موعد)
}

/* تُختار أعلى رسالةٍ مطابقةٍ لحالة الطالب (أولويةٌ من الأخصّ للأعمّ). */
export function pickDailyMessage(s: DailySignals): DailyMessage {
  /* التحيّة تتبدّل كتحيّة الرئيسية — كانت سطراً واحداً لا يتغيّر أبداً */
  const greeting = duwairbGreeting(s.name, s.hour ?? 12, s.rand ?? 0);
  const streak = s.streakDays ?? 0;
  const yst = s.yesterdayMins ?? 0;
  const dte = s.daysToExam ?? null;

  const message =
    !s.everStarted
      ? "ابدأ أوّل خطوة اليوم، وأنا معك خطوةً بخطوة."
    : streak === 0
      ? "من زمان عنك، خلنا نرجع للطريق 💪"
    : dte != null && dte > 0 && dte <= 15
      ? `باقي ${n(dte)} يوم على الاختبار — كل جلسةٍ الآن تفرق، خلنا نركّز 🔥`
    : yst >= 60
      ? "واضح إنك اجتهدت أمس، اليوم بنكمّل على نفس الروح 💪"
    : yst === 0 && streak > 0
      ? "واضح إنك أخذت راحة أمس، اليوم نرجع بهدوء ونكمّل."
    : dte != null && dte > 0 && dte <= 45
      ? `باقي ${n(dte)} يوم على الاختبار، خلنا نستغلها 🔥`
    : streak >= 5
      ? `ماشاء الله ${n(streak)} أيام متتالية — استمر، أنت ماشي بالطريق الصحيح 🌟`
      : "استمر، أنت ماشي بالطريق الصحيح.";

  return { greeting, message };
}
