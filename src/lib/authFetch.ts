"use client";
/* ─── fetch موثّق ───
   يرفق Firebase ID Token في ترويسة Authorization تلقائياً، فيستطيع الخادم
   التحقق من هوية المستخدم بدل الثقة بـ uid من جسم الطلب.
   لو المستخدم غير مسجّل (وضع الزائر) تُرسَل بلا ترويسة — الخادم يرفض
   العمليات التي تتطلب هوية. */
import { auth } from "./firebase";

export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const u = auth.currentUser;
  if (u) {
    try {
      const token = await u.getIdToken();
      headers.set("Authorization", `Bearer ${token}`);
    } catch {
      /* تعذّر الحصول على التوكن — نُرسل بلا ترويسة */
    }
  }
  return fetch(input, { ...init, headers });
}

/* مختصر لاستدعاء /api/social كـ JSON موثّق */
export async function postSocial(body: Record<string, unknown>): Promise<Response> {
  return authedFetch("/api/social", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
