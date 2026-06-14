"use client";
import { useState } from "react";
import {
  signInWithGoogle,
  signIn, signUp, authErrorMsg,
} from "@/lib/cloud";
import Logo from "@/components/Logo";
import type { FirebaseError } from "firebase/app";

/* شاشة تسجيل الدخول الإجبارية — Google، والإيميل خيار ثانوي */
export default function SignInScreen({ initialError }: { initialError?: string | null }) {
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [err, setErr] = useState(initialError ?? "");
  const [showEmail, setShowEmail] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const oauthGoogle = async () => {
    setErr("");
    setBusy("google");
    try {
      await signInWithGoogle();
      /* popup نجح على الويب — أعِد التحميل عشان AuthGate يلتقط الجلسة */
      window.location.href = "/dashboard";
    } catch (e) {
      const code = (e as FirebaseError)?.code ?? "";
      setErr(authErrorMsg(code) + (code ? ` (${code})` : ""));
      setBusy(null);
    }
  };

  const submitEmail = async () => {
    setErr("");
    if (!email.trim() || pass.length < 6) {
      setErr("اكتب الإيميل وكلمة مرور ٦ أحرف على الأقل");
      return;
    }
    setBusy("email");
    try {
      if (mode === "signup") await signUp(email, pass);
      else await signIn(email, pass);
      /* Firebase حفظ الجلسة — نعيد تحميل الصفحة عشان AuthGate يلتقطها */
      window.location.href = "/dashboard";
    } catch (e) {
      const code = (e as FirebaseError)?.code ?? "";
      setErr(authErrorMsg(code) + (code ? ` (${code})` : ""));
      setBusy(null);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-10 relative z-[1]">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* الشعار — يتبع الثيم (أزرق ليلي / ذهبي نهاري) */}
        <Logo className="font-black text-5xl mb-2" />
        <p className="eyebrow mb-1" style={{ color: "var(--text-dim)" }}>YOUR PATH TO EXCELLENCE</p>
        <p className="text-[15px] text-center leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
          سجّل دخولك عشان نحفظ تقدّمك ونزامنه على كل أجهزتك.
        </p>

        {/* Google */}
        <button onClick={oauthGoogle} disabled={busy !== null}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-[16px] mb-3 transition active:scale-[0.98] min-h-[56px]"
          style={{ background: "#FFFFFF", color: "#1F1F1F", border: "1.5px solid var(--border)", opacity: busy && busy !== "google" ? 0.5 : 1 }}>
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {busy === "google" ? "جارٍ التحويل..." : "المتابعة بحساب Google"}
        </button>

        {/* خطأ */}
        {err && (
          <p className="text-[13px] text-center mt-1 mb-1 font-semibold" style={{ color: "var(--danger)" }}>{err}</p>
        )}

        {/* الإيميل (ثانوي) */}
        {!showEmail ? (
          <button onClick={() => { setShowEmail(true); setErr(""); }}
            className="mt-4 text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>
            أو الدخول بالإيميل
          </button>
        ) : (
          <div className="w-full mt-5 flex flex-col gap-3">
            <div className="flex rounded-2xl p-1" style={{ background: "var(--surface2)" }}>
              {(["signin", "signup"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setErr(""); }}
                  className="flex-1 py-2.5 rounded-xl text-[14px] font-bold transition"
                  style={mode === m ? { background: "var(--accent)", color: "white" } : { color: "var(--text-muted)" }}>
                  {m === "signin" ? "دخول" : "حساب جديد"}
                </button>
              ))}
            </div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="الإيميل" autoComplete="email" inputMode="email"
              className="w-full rounded-2xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[52px]"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }} />
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitEmail(); }}
              placeholder="كلمة المرور (٦ أحرف على الأقل)" autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full rounded-2xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[52px]"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }} />
            <button onClick={submitEmail} disabled={busy !== null}
              className="btn-primary glow-blue" style={{ opacity: busy ? 0.6 : 1 }}>
              {busy === "email" ? "لحظة..." : mode === "signin" ? "دخول ←" : "إنشاء حساب ←"}
            </button>
          </div>
        )}

        <p className="text-[11px] text-center mt-8 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          بدخولك توافق على{" "}
          <a href="/privacy" className="underline" style={{ color: "var(--text-dim)" }}>سياسة الخصوصية</a>
        </p>
      </div>
    </div>
  );
}
