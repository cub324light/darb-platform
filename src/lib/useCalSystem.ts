"use client";
/* ═══════════ نظامُ التقويم المعروض — هجريّ أو ميلاديّ ═══════════
   بعضُ الطلاب يعدّ بالهجريّ وبعضُهم بالميلاديّ، والتقويم الرسميّ يُعلَن بالهجريّ
   وتُنشر مواعيدُه بالميلاديّ. فالخيارُ للطالب لا لنا.

   قيمةٌ خارجية في `localStorage`، فتُقرأ بـ`useSyncExternalStore` لا في مُهيّئ
   `useState` — قراءتُها في المُهيّئ تكسر الترطيب (React #418): الخادم يرسم
   «ميلادي» والعميلُ «هجري» في اللحظة نفسها. عطلٌ تكرّر في هذا المشروع، فلا
   نعيده. اللقطةُ الخادميّة «ميلادي» وهي الافتراض، فلا يُعاد الرسمُ إلا لمن
   غيّرها فعلاً. */
import { useSyncExternalStore } from "react";

export type CalSystem = "greg" | "hijri";

const KEY = "darb_cal_system";
export const CAL_CHANGED = "darb:calSystemChanged";

export function loadCalSystem(): CalSystem {
  try { return localStorage.getItem(KEY) === "hijri" ? "hijri" : "greg"; } catch { return "greg"; }
}

/** يكتب التفضيل ويبثّه فتتحدّث كلُّ النسخ معاً. */
export function applyCalSystem(v: CalSystem): void {
  try { localStorage.setItem(KEY, v); } catch { /* تجاهل */ }
  window.dispatchEvent(new Event(CAL_CHANGED));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(CAL_CHANGED, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CAL_CHANGED, cb);
    window.removeEventListener("storage", cb);
  };
};

export function useCalSystem(): CalSystem {
  return useSyncExternalStore<CalSystem>(subscribe, loadCalSystem, () => "greg");
}
