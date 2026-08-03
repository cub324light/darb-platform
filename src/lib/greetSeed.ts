"use client";
/* ═══════════ بذرةُ الترحيب — عشوائيّةٌ ثابتةٌ في الزيارة الواحدة ═══════════
   التحيّةُ عشوائيّةٌ كما طلب المالك، لكنّ إعادةَ انتقائها في كل انتقالٍ بين
   الصفحات تجعل الطالبَ يظنّ التطبيقَ مضطرباً: يدخل «مساري» فتحيّة، ويرجع
   للرئيسية فتحيّةٌ أخرى، وهو لم يغادر جلسته.

   فالبذرةُ تُنتقى **مرّةً لكلّ زيارة** وتُحفظ في `sessionStorage`: تحيّةٌ واحدة
   من فتح درب إلى إغلاقه، وتحيّةٌ جديدة في الزيارة القادمة. و`sessionStorage`
   لا `localStorage`: الأخيرةُ تُبقيها أياماً فتعود التحيّةُ ثابتةً كما كانت.

   ورقمان لا واحد: الترحيبُ والنصيحةُ لا يتحرّكان معاً — لو اشتركا في بذرةٍ
   واحدة لصارا زوجاً محفوظاً. */

const KEY = "darb_greet_seed";

interface Seed { hello: number; tip: number }

const fresh = (): Seed => ({ hello: Math.random(), tip: Math.random() });

/** بذرةُ هذه الزيارة — تُصنع عند أول نداءٍ فيها ثم تثبت. */
export function greetSeed(): Seed {
  if (typeof window === "undefined") return { hello: 0, tip: 0 };
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Seed>;
      if (typeof p.hello === "number" && typeof p.tip === "number") return { hello: p.hello, tip: p.tip };
    }
    const s = fresh();
    sessionStorage.setItem(KEY, JSON.stringify(s));
    return s;
  } catch {
    return fresh();
  }
}
