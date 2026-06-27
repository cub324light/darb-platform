/* ─── جلسة المحرّكات: تبديل المستخدم وإعادة البناء ───
   عند تغيّر المصادقة نبدّل فضاء الأسماء ونُسقِط مثائل المحرّكات (ذاكرة/أحداث/
   إشعارات/منسّق) كي تُعاد قراءتها من المفاتيح المنطَّقة الجديدة — فلا تتسرّب
   بيانات حساب لآخر. يُستورَد من تجهيز المصادقة فقط (لا من المحرّكات → لا دوران). */
"use client";
import { setNamespace } from "./engineNamespace";
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

/** يبدّل فضاء المحرّكات لمستخدم (uid أو null للضيف). آمن للاستدعاء المتكرّر. */
export function switchEngineUser(uid: string | null): void {
  if (!setNamespace(uid)) return; // لا تغيير في الفضاء
  resetEngineSingletons();
}
