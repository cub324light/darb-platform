/* ═══════════════ تنسيق الأرقام في درب — اصطلاحٌ واحد ═══════════════
   الأرقام 0-9 الغُبارية (0123456789) هي المعتمدة. هي عربيّةُ الأصل — نشأت في المغرب
   العربي والأندلس وعنها أخذت أوروبا — وهي التي يذاكر بها طالبنا رياضياته، وتأتيه بها
   نتيجة قياس، ويراها في أبشر وبنكه وشاشة جواله. وأرقام «درب» أكثرها تُمسح بالعين لا
   تُقرأ (درجتك · باقي كذا يوماً · عدّاد التركيز)، والأُلفة في هذا تغلب الزخرفة.

   قاعدتان لا ثالثة لهما:
   1. كل رقمٍ يُكتب 0-9. لا يُخلط شكلان أبداً.
   2. العدد داخل جملةٍ سرديّة يُكتب كلمةً لا رقماً: «القسم الأول» لا «القسم 1»،
      و«ثلاث جلسات» لا «3 جلسات». أمّا القياسُ فيبقى رقماً: «45 دقيقة» · «95 درجة».

   الرموز عربية دائماً: النسبة ٪ والريال ﷼. للأعمدة المُحاذاة استعمل
   class="font-mono-nums". لا تنسّق الأرقام يدوياً في الصفحات — استورد من هنا. */

const AR = "ar-u-nu-latn"; // فرض أرقام 0-9 بغضّ النظر عن بيئة التشغيل

/* عددٌ عربي مفصولٌ بالآلاف (1234 → 1٬234) */
export const n = (x: number): string => x.toLocaleString(AR);

/* سَنَةٌ عربية بلا فاصل آلاف (2027 لا 2٬027) — الفاصل في السنوات خطأٌ إملائيّ لا تنسيق */
export const year = (x: number): string => x.toLocaleString(AR, { useGrouping: false });

/* نسبة مئوية بالرمز العربي (92 → 92٪) */
export const pct = (x: number): string => `${n(Math.round(x))}٪`;

/* كسرٌ/إنجاز من مجموع (5 من 7 → 5/7) */
export const frac = (a: number, total: number): string => `${n(a)}/${n(total)}`;

/* مبلغٌ بالريال السعودي (1500 → 1٬500 ﷼) */
export const sar = (x: number): string => `${n(x)} ﷼`;

const toDate = (iso: string): Date => new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);

/* تاريخٌ عربي مختصر (11 يوليو) */
export const dateShort = (iso: string): string =>
  toDate(iso).toLocaleDateString(AR, { day: "numeric", month: "long" });

/* تاريخٌ عربي كامل (11 يوليو 2026) */
export const dateLong = (iso: string): string =>
  toDate(iso).toLocaleDateString(AR, { day: "numeric", month: "long", year: "numeric" });

/* تاريخٌ ضيّق للرقاقات والأعمدة (11 يول) */
export const dateTiny = (iso: string): string =>
  toDate(iso).toLocaleDateString(AR, { day: "numeric", month: "short" });

/* تاريخٌ باليوم واسمه (السبت، 11 يوليو 2026) — لترويسات اليوم ورسائل الجدولة.
   `withYear=false` تُسقط السنة حين يكون العام مفهوماً من السياق. */
export const dateFull = (iso: string, withYear = true): string =>
  toDate(iso).toLocaleDateString(AR, {
    weekday: "long", day: "numeric", month: "long",
    ...(withYear ? { year: "numeric" as const } : {}),
  });

/* ═══ التقويم الهجري ═══
   ⚠ `toLocaleDateString("ar-SA")` في المتصفّح يعني **أُمّ القرى بأرقامٍ هندية**
   («٢٦ محرم») لا «11 يوليو» — لا مجرّد اختلافِ شكلِ رقم. فمَن أراد الهجريّ
   يطلبه صراحةً من هنا، ولا يُكتب `ar-SA` في الصفحات أبداً (يحرسه format.test.ts). */
export const dateHijri = (iso: string, withYear = true): string =>
  toDate(iso).toLocaleDateString(AR, {
    calendar: "islamic-umalqura", numberingSystem: "latn",
    weekday: "long", day: "numeric", month: "long",
    ...(withYear ? { year: "numeric" as const } : {}),
  });

/* «يوم/يومين/أيام/يوماً» بصيغةٍ عربية سليمة مع العدد */
export const days = (x: number): string =>
  x === 1 ? "يوم واحد" : x === 2 ? "يومان" : `${n(x)} ${x >= 3 && x <= 10 ? "أيام" : "يوماً"}`;

/* «أسبوع/أسبوعان/أسابيع/أسبوعاً» — نظيرةُ `days` (كان يُكتب «7 أسبوع» في بطاقة التقويم) */
export const weeks = (x: number): string =>
  x === 1 ? "أسبوع واحد" : x === 2 ? "أسبوعان" : `${n(x)} ${x >= 3 && x <= 10 ? "أسابيع" : "أسبوعاً"}`;

/* ═══ الوقت ═══
   الساعةُ في «درب» عددٌ عشريّ (17٫5 = الخامسة والنصف مساءً)، فهذه الدوالّ تحوّله نصّاً.
   ▸ مصدرٌ واحدٌ للوقت في المنتج كلّه — حتى داخل برومبتات دويرب (المحلّل يردّ الأرقام
     إلى اللاتينية عبر `normalizeDigits`)، فلا تعود صيغتان تتفرّقان. */

/* وقتٌ من ساعةٍ عشرية (17.5 → «5:30 م»، 8 → «8 ص») */
export const time = (h: number): string => {
  const t = ((Math.round(h * 60) % 1440) + 1440) % 1440; // دقائق ضمن اليوم
  const hh = Math.floor(t / 60), mm = t % 60;
  const label = `${n(((hh + 11) % 12) + 1)}${mm ? `:${n(mm).padStart(2, "0")}` : ""}`;
  return `${label} ${hh < 12 ? "ص" : "م"}`;
};

/* فترةٌ زمنية (16 → 17٫5 = «4 – 5:30 م») — يُحذف المؤشّر المكرّر داخل الفترة الواحدة */
export const timeRange = (from: number, to: number): string => {
  const a = time(from), b = time(to);
  const [aNum, aPeriod] = a.split(" ");
  return aPeriod === b.split(" ")[1] ? `${aNum} – ${b}` : `${a} – ${b}`;
};

/* مدّةٌ بالدقائق نصّاً عربياً طبيعياً (90 → «ساعة و30 دقيقة») — للجُمل لا للجداول.
   نظيرتها المختصرة `fmtMins` في `weeklyReport.ts` («1 س 30 د») تبقى للإحصاءات المضغوطة. */
export const dur = (m: number): string => {
  const t = Math.max(0, Math.round(m));
  if (t === 0) return "0 دقيقة";
  const h = Math.floor(t / 60), r = t % 60;
  const hp = h === 0 ? "" : h === 1 ? "ساعة" : h === 2 ? "ساعتين" : `${n(h)} ${h <= 10 ? "ساعات" : "ساعة"}`;
  const mp = r === 0 ? "" : r === 1 ? "دقيقة" : r === 2 ? "دقيقتين" : `${n(r)} ${r <= 10 ? "دقائق" : "دقيقة"}`;
  return hp && mp ? `${hp} و${mp}` : hp || mp;
};
