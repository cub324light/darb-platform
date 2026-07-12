"use client";
/* ─── توثيق البريد قبل المشاركة المجتمعية ───
   حسابات Google موثّقة تلقائياً؛ الدخول بالإيميل يبدأ غير موثّق حتى يضغط
   الطالب الرابط المُرسَل. نقيّد الكتابة في المجتمع (المجلس/الأرينا) فقط —
   لا نقفل التطبيق كله. */
import { useState, useEffect, useCallback } from "react";

type VerifyState = { uid: string | null; verified: boolean; resolved: boolean };

/* يشترك في حالة المصادقة ويرجع: المعرّف، هل البريد موثّق، وهل حُسم الأمر بعد. */
export function useEmailVerified(): VerifyState {
  const [state, setState] = useState<VerifyState>({ uid: null, verified: false, resolved: false });
  useEffect(() => {
    let unsub: (() => void) | undefined;
    import("@/lib/cloud").then(({ onAuth }) => {
      unsub = onAuth((u) => {
        setState({ uid: u?.uid ?? null, verified: u?.emailVerified ?? false, resolved: true });
      });
    });
    return () => { unsub?.(); };
  }, []);
  return state;
}

/* بانر يظهر فقط لمستخدم مسجّل دخوله ببريد غير موثّق.
   يعرض زر «أعد الإرسال» وزر «وثّقت، حدّث» (يعيد تحميل حالة المستخدم). */
export function EmailVerifyNotice({ message }: { message?: string }) {
  const { uid, verified, resolved } = useEmailVerified();
  const [busy, setBusy] = useState<"resend" | "refresh" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const resend = useCallback(async () => {
    setBusy("resend"); setNote(null);
    try {
      const { resendVerification } = await import("@/lib/cloud");
      await resendVerification();
      setNote("أرسلنا الرابط — تحقق من بريدك (وصندوق المهملات)");
    } catch {
      setNote("تعذّر الإرسال — انتظر دقيقة وحاول مجدداً");
    } finally { setBusy(null); }
  }, []);

  const refresh = useCallback(async () => {
    setBusy("refresh"); setNote(null);
    try {
      const { reloadVerification } = await import("@/lib/cloud");
      const ok = await reloadVerification();
      if (ok) window.location.reload();
      else setNote("لم نتحقق بعد — اضغط الرابط في بريدك ثم أعد المحاولة");
    } finally { setBusy(null); }
  }, []);

  /* لا شيء يُعرض: لم يُحسم بعد، أو زائر، أو موثّق */
  if (!resolved || !uid || verified) return null;

  return (
    <div className="rounded-xl px-4 py-3 flex flex-col gap-2"
      style={{ background: "color-mix(in srgb, var(--gold) 12%, transparent)", border: "1.5px solid color-mix(in srgb, var(--gold) 45%, var(--border))" }}>
      <p className="text-[15px] font-bold text-center" style={{ color: "var(--gold)" }}>
        ✉️ {message ?? "وثّق بريدك للمشاركة في المجتمع"}
      </p>
      {note && (
        <p className="text-[14px] text-center" style={{ color: "var(--text-muted)" }}>{note}</p>
      )}
      <div className="flex gap-2">
        <button onClick={resend} disabled={busy !== null}
          className="flex-1 rounded-lg py-2 text-[15px] font-bold transition active:scale-[0.98]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", opacity: busy ? 0.6 : 1 }}>
          {busy === "resend" ? "..." : "أعد الإرسال"}
        </button>
        <button onClick={refresh} disabled={busy !== null}
          className="flex-1 rounded-lg py-2 text-[15px] font-bold text-white transition active:scale-[0.98]"
          style={{ background: "var(--gold)", opacity: busy ? 0.6 : 1 }}>
          {busy === "refresh" ? "..." : "وثّقت، حدّث"}
        </button>
      </div>
    </div>
  );
}
