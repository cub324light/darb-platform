/* ─── جلسة المحرّكات: إعادة البناء بعد تبديل المستخدم ───
   حين يبدّل `AuthGate` فضاءَ الأسماء (setNamespace) نُسقِط مثائل المحرّكات
   (ذاكرة/أحداث/إشعارات/منسّق) كي تُعاد قراءتها من المفاتيح المنطَّقة الجديدة —
   فلا تتسرّب بيانات حساب لآخر. يُستورَد من تجهيز المصادقة والمزامنة فقط
   (لا من المحرّكات → لا دوران). */
"use client";
import { __setMemoryEngine } from "./memory";
import { __resetEvents } from "./events";
import { __resetNotifications } from "./notifications";
import { __resetDuwairb } from "./orchestrator";

/** يُسقِط كل مثائل المحرّكات — يُعاد بناؤها كسولاً عند أول استدعاء تالٍ. */
export function resetEngineSingletons(): void {
  __setMemoryEngine(null);
  __resetEvents();
  __resetNotifications();
  __resetDuwairb();
}

