"use client";
/* ═══════════ قراءةُ الثيم داخل React — مصدرٌ واحد ═══════════
   الثيم قيمةٌ خارجية تعيش في `localStorage`، والخادمُ لا يراها. وقراءتُها في مُهيّئ
   `useState` تكسر الترطيب (React #418): الخادم يرسم «ليل» والعميل يرسم «نهار» في
   اللحظة نفسها، فيختلف النصّ المرسوم — وهو ما كان يحدث في صفحة الهبوط لكل من
   اختار الوضع النهاريّ (أكثرُ صفحةٍ يراها زائرٌ جديد).

   `useSyncExternalStore` هي أداةُ React لهذا بالضبط: لقطةٌ خادميّة ثابتة يتّفق عليها
   الطرفان، ثم إعادةُ رسمٍ فوريّةٌ صامتة بالقيمة الحقيقية — بلا خطأ وبلا وميض.

   ⚠ لا تقرأ الثيم بغير هذه الدالّة، ولا تستنسخها: نسخةٌ ثالثة تعني اختلافاً يوماً ما.
   وللكتابة استعمل `applyTheme` (تبثّ `THEME_CHANGED` فتتحدّث كلُّ النسخ معاً). */
import { useSyncExternalStore } from "react";
import { loadTheme, THEME_CHANGED, type Theme } from "@/lib/storage";

const subscribe = (cb: () => void) => {
  window.addEventListener(THEME_CHANGED, cb);
  return () => window.removeEventListener(THEME_CHANGED, cb);
};

/* اللقطة الخادميّة: «ليل» — وهو الوضع الافتراضي في `loadTheme` أيضاً، فيتّفق العرضان
   لأكثر المستخدمين ولا يُعاد الرسم إلا لمن غيّرها فعلاً. */
export function useTheme(): Theme {
  return useSyncExternalStore<Theme>(subscribe, loadTheme, () => "dark");
}
