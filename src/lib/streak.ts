/* ═══════════ محرّك السلسلة — مصدرُ الحقيقة الواحد لـ«الأيام المتتالية» ═══════════
   ▸ العطل الذي أُغلق: كان في المشروع **خمسةُ** اشتقاقاتٍ لسلسلةٍ واحدة، بقاعدتين
     مختلفتين ومُدخَلين مختلفين:
       · `computeStreak` (متسامحة، من `sessionDays`) — الرئيسيةُ ودويربُ وسندُ والاقتصاد.
       · `computeStats().week.streakDays` (صارمة، من `dayMins`) — «مساري» وإحصاءاته.
       · `readDailySignals.streakDays` (صارمة) — رسالةُ دويرب اليومية.
       · `xp.computeStreakDays` (متسامحة، بمفتاحِ **UTC** لا محليّ) — الشارات.
       · `longestStreak` في الإحصاءات (تعريفٌ ثالثٌ للتتابع).
     فكان الطالبُ يرى «🔥 ٧» في الرئيسية و«🔥 ٠» في «مساري» في اللحظة نفسها، ويسمع
     «من زمان عنك» صباحَ يومٍ ذاكر فيه أمس تسعين دقيقة.

   ▸ القاعدةُ الواحدة هنا — **المتسامحة**، وهي سلوكُ الأغلبية القائم: يومُ اليوم لم
     ينتهِ بعد، فلا تنكسر السلسلةُ قبل منتصف ليله. لو لم يذاكر اليوم بدأ العدُّ من أمس.

   ▸ والمُدخَلُ الواحد — **اتّحادُ** `sessionDays` و`dayMins > 0`. كلاهما يُكتب معاً في
     `recordSession`، إلا `addSessionDay` (استعادةُ السلسلة المكسورة) فيكتب الأوّلَ
     وحدَه — فبالاتّحادِ تُحتسب الاستعادةُ في كلِّ الشاشات لا في نصفها.

   ▸ نقيٌّ تماماً: لا تخزينَ ولا `Date.now()` ولا منطقةَ زمنية. يستقبل مفتاحَ اليوم
     (`localDayKey`) ممّن يعرفه. */

/** مصدرُ الأيام — شكلُ `DarbStats` بنيوياً (بلا استيرادٍ يصنع دورة). */
export interface StreakSource {
  sessionDays?: string[];
  dayMins?: Record<string, number>;
}

/* حسابُ اليوم السابق على مفتاح `YYYY-MM-DD` — بحساب UTC على المفتاح نفسِه، فلا
   تتدخّل منطقةُ الجهاز الزمنية في نتيجةٍ مبنيّةٍ على مفاتيحَ محليّةٍ أصلاً. */
const DAY_MS = 86_400_000;
export function prevDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

/** أيامُ المذاكرة الفعلية — اتّحادُ المصدرين، بلا تكرارٍ ولا ترتيب. */
export function studyDays(src: StreakSource): Set<string> {
  const days = new Set<string>(src.sessionDays ?? []);
  const dm = src.dayMins;
  if (dm) for (const d in dm) if ((dm[d] ?? 0) > 0) days.add(d);
  return days;
}

/**
 * السلسلةُ الحالية حتى `today` — أيامٌ متتاليةٌ تنتهي اليوم أو أمس.
 * (يومُ اليوم لم ينتهِ: غيابُه لا يكسر سلسلةَ الأمس.)
 */
export function streakOn(src: StreakSource, today: string): number {
  const days = studyDays(src);
  if (days.size === 0) return 0;
  let cursor = days.has(today) ? today : prevDay(today);
  let streak = 0;
  while (days.has(cursor)) { streak += 1; cursor = prevDay(cursor); }
  return streak;
}

/** أطولُ سلسلةٍ في تاريخ الطالب كلِّه — نفسُ تعريفِ التتابع، بلا «اليوم». */
export function longestStreakOf(src: StreakSource): number {
  const sorted = [...studyDays(src)].sort();
  let longest = 0, run = 0, prev = "";
  for (const d of sorted) {
    run = prev && prevDay(d) === prev ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }
  return longest;
}
