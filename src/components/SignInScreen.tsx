"use client";
import { useState } from "react";
import {
  signInWithGoogle, signInWithApple,
  signIn, signUp, authErrorMsg,
} from "@/lib/cloud";
import type { FirebaseError } from "firebase/app";

/* شاشة تسجيل الدخول الإجبارية — Google + Apple، والإيميل خيار ثانوي */
export default function SignInScreen({ initialError }: { initialError?: string | null }) {
  const [busy, setBusy] = useState<"google" | "apple" | "email" | null>(null);
  const [err, setErr] = useState(initialError ?? "");
  const [showEmail, setShowEmail] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const oauth = async (which: "google" | "apple") => {
    setErr("");
    setBusy(which);
    try {
      if (which === "google") await signInWithGoogle();
      else await signInWithApple();
      /* redirect — تنتقل الصفحة للمزوّد ثم ترجع؛ البوابة تكمل الباقي */
    } catch (e) {
      setErr(authErrorMsg((e as FirebaseError)?.code ?? ""));
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
      /* onAuth في البوابة يلتقط الدخول ويبدأ المزامنة */
    } catch (e) {
      setErr(authErrorMsg((e as FirebaseError)?.code ?? ""));
      setBusy(null);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-10 relative z-[1]">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* الشعار */}
        <p className="font-black text-5xl mb-2"
          style={{ color: "var(--text)", filter: "drop-shadow(0 0 22px color-mix(in srgb, var(--accent) 45%, transparent))" }}>
          درب
        </p>
        <p className="eyebrow mb-1" style={{ color: "var(--text-dim)" }}>YOUR PATH TO EXCELLENCE</p>
        <p className="text-[15px] text-center leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
          سجّل دخولك عشان نحفظ تقدّمك ونزامنه على كل أجهزتك.
        </p>

        {/* Google */}
        <button onClick={() => oauth("google")} disabled={busy !== null}
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

        {/* Apple */}
        <button onClick={() => oauth("apple")} disabled={busy !== null}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-[16px] mb-3 transition active:scale-[0.98] min-h-[56px]"
          style={{ background: "var(--text)", color: "var(--bg)", border: "none", opacity: busy && busy !== "apple" ? 0.5 : 1 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.02-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.78 1.3 10.33.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.27 3.14-2.53.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.72-1.04-2.75-4.13zM14.5 4.34c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.59 3.03-1.46z"/>
          </svg>
          {busy === "apple" ? "جارٍ التحويل..." : "المتابعة بـ Apple"}
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
