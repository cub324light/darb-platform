"use client";
import { useEffect } from "react";
import { isInitialSyncDone } from "@/lib/cloudFlags";
import { readGuestMode } from "@/components/AuthGate";

/* يحفظ نسخة من البيانات في السحابة تلقائياً طالما المستخدم مسجّل دخول:
   كل دقيقتين، وعند مغادرة الصفحة أو إغلاق التطبيق.
   لا يرفع قبل اكتمال أول سحب (isInitialSyncDone) حتى لا يمحو السحابة بنسخة فارغة.
   cloud.ts تُحمَّل ديناميكياً — لا تدخل Firebase في حزمة layout المبدئية.

   والزائر لا يُحمَّل له شيءٌ منها إطلاقاً: لا حساب له يُرفَع إليه، فكانت المكوّنة
   تجلب Firebase (~364 ك.ب) في كل صفحةٍ يفتحها ليكتشف أنه غير مسجّل. */
export default function CloudSync() {
  useEffect(() => {
    if (readGuestMode()) return;

    let loggedIn = false;
    let unsub: (() => void) | undefined;

    const doPush = () => {
      import("@/lib/cloud").then(({ pushBackup }) => { pushBackup(); });
    };

    const onHide = () => {
      if (loggedIn && isInitialSyncDone() && document.visibilityState === "hidden") doPush();
    };
    document.addEventListener("visibilitychange", onHide);

    const iv = setInterval(() => {
      if (loggedIn && isInitialSyncDone()) doPush();
    }, 120_000);

    import("@/lib/cloud").then(({ onAuth }) => {
      unsub = onAuth((u) => { loggedIn = !!u; });
    });

    return () => {
      unsub?.();
      document.removeEventListener("visibilitychange", onHide);
      clearInterval(iv);
    };
  }, []);

  return null;
}
