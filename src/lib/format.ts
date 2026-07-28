/* ═══════════════ تنسيق الأرقام في درب — اصطلاحٌ واحد ═══════════════
   الواجهة عربية، فالأرقام عربية-هندية (٠١٢…) في كل النصوص السردية والإحصاءات،
   بالرموز العربية: النسبة ٪ والريال ﷼، وتواريخُ عربية موحّدة. للبيانات المُحاذاة
   (جداول/أعمدة) استعمل class="font-mono-nums" مع هذه الدوال. مصدرٌ واحد فلا تختلط
   ٥ مع 5 ولا ٪ مع %. لا تنسّق الأرقام يدوياً في الصفحات — استورد من هنا. */

const AR = "ar-u-nu-arab"; // فرض الأرقام العربية-الهندية بغضّ النظر عن بيئة التشغيل

/* عددٌ عربي مفصولٌ بالآلاف (١٢٣٤ → ١٬٢٣٤) */
export const n = (x: number): string => x.toLocaleString(AR);

/* سَنَةٌ عربية بلا فاصل آلاف (٢٠٢٧ لا ٢٬٠٢٧) — الفاصل في السنوات خطأٌ إملائيّ لا تنسيق */
export const year = (x: number): string => x.toLocaleString(AR, { useGrouping: false });

/* نسبة مئوية بالرمز العربي (٩٢ → ٩٢٪) */
export const pct = (x: number): string => `${n(Math.round(x))}٪`;

/* كسرٌ/إنجاز من مجموع (٥ من ٧ → ٥/٧) */
export const frac = (a: number, total: number): string => `${n(a)}/${n(total)}`;

/* مبلغٌ بالريال السعودي (١٥٠٠ → ١٬٥٠٠ ﷼) */
export const sar = (x: number): string => `${n(x)} ﷼`;

const toDate = (iso: string): Date => new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);

/* تاريخٌ عربي مختصر (١١ يوليو) */
export const dateShort = (iso: string): string =>
  toDate(iso).toLocaleDateString(AR, { day: "numeric", month: "long" });

/* تاريخٌ عربي كامل (١١ يوليو ٢٠٢٦) */
export const dateLong = (iso: string): string =>
  toDate(iso).toLocaleDateString(AR, { day: "numeric", month: "long", year: "numeric" });

/* «يوم/يومين/أيام/يوماً» بصيغةٍ عربية سليمة مع العدد */
export const days = (x: number): string =>
  x === 1 ? "يوم واحد" : x === 2 ? "يومان" : `${n(x)} ${x >= 3 && x <= 10 ? "أيام" : "يوماً"}`;

/* ═══ الوقت ═══
   الساعةُ في «درب» عددٌ عشريّ (١٧٫٥ = الخامسة والنصف مساءً)، فهذه الدوالّ تحوّله نصّاً.
   ▸ مصدرٌ واحدٌ للوقت في المنتج كلّه — حتى داخل برومبتات دويرب (المحلّل يردّ الأرقام
     إلى اللاتينية عبر `normalizeDigits`)، فلا تعود صيغتان تتفرّقان. */

/* وقتٌ من ساعةٍ عشرية (١٧٫٥ → «٥:٣٠ م»، ٨ → «٨ ص») */
export const time = (h: number): string => {
  const t = ((Math.round(h * 60) % 1440) + 1440) % 1440; // دقائق ضمن اليوم
  const hh = Math.floor(t / 60), mm = t % 60;
  const label = `${n(((hh + 11) % 12) + 1)}${mm ? `:${n(mm).padStart(2, "٠")}` : ""}`;
  return `${label} ${hh < 12 ? "ص" : "م"}`;
};

/* فترةٌ زمنية (١٦ → ١٧٫٥ = «٤ – ٥:٣٠ م») — يُحذف المؤشّر المكرّر داخل الفترة الواحدة */
export const timeRange = (from: number, to: number): string => {
  const a = time(from), b = time(to);
  const [aNum, aPeriod] = a.split(" ");
  return aPeriod === b.split(" ")[1] ? `${aNum} – ${b}` : `${a} – ${b}`;
};

/* مدّةٌ بالدقائق نصّاً عربياً طبيعياً (٩٠ → «ساعة و٣٠ دقيقة») — للجُمل لا للجداول.
   نظيرتها المختصرة `fmtMins` في `weeklyReport.ts` («١ س ٣٠ د») تبقى للإحصاءات المضغوطة. */
export const dur = (m: number): string => {
  const t = Math.max(0, Math.round(m));
  if (t === 0) return "٠ دقيقة";
  const h = Math.floor(t / 60), r = t % 60;
  const hp = h === 0 ? "" : h === 1 ? "ساعة" : h === 2 ? "ساعتين" : `${n(h)} ${h <= 10 ? "ساعات" : "ساعة"}`;
  const mp = r === 0 ? "" : r === 1 ? "دقيقة" : r === 2 ? "دقيقتين" : `${n(r)} ${r <= 10 ? "دقائق" : "دقيقة"}`;
  return hp && mp ? `${hp} و${mp}` : hp || mp;
};
