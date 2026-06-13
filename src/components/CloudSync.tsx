"use client";
import { useEffect } from "react";
import { onAuth, pushBackup, isInitialSyncDone } from "@/lib/cloud";

/* يحفظ نسخة من البيانات في السحابة تلقائياً طالما المستخدم مسجّل دخول:
   كل دقيقتين، وعند مغادرة الصفحة أو إغلاق التطبيق.
   لا يرفع قبل اكتمال أول سحب (isInitialSyncDone) حتى لا يمحو السحابة بنسخة فارغة. */
export default function CloudSync() {
  useEffect(() => {
    let loggedIn = false;
    const unsub = onAuth((u) => { loggedIn = !!u; });

    const onHide = () => {
      if (loggedIn && isInitialSyncDone() && document.visibilityState === "hidden") pushBackup();
    };
    document.addEventListener("visibilitychange", onHide);

    const iv = setInterval(() => { if (loggedIn && isInitialSyncDone()) pushBackup(); }, 120_000);

    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onHide);
      clearInterval(iv);
    };
  }, []);

  return null;
}
