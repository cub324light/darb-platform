"use client";
import { useState } from "react";
import {
  signInWithGoogle,
  signIn, signUp, resetPassword, authErrorMsg,
} from "@/lib/cloud";
import Logo from "@/components/Logo";
import type { FirebaseError } from "firebase/app";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function SignInScreen({ initialError }: { initialError?: string | null }) {
  const [busy, setBusy] = useState<"google" | "email" | "reset" | null>(null);
  const [err, setErr] = useState(initialError ?? "");
  const [info, setInfo] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [done, setDone] = useState(false);

  const oauthGoogle = async () => {
    setErr(""); setInfo("");
    setBusy("google");
    try {
      await signInWithGoogle();
      window.location.href = "/dashboard";
    } catch (e) {
      const code = (e as FirebaseError)?.code ?? "";
      setErr(authErrorMsg(code) + (code ? ` (${code})` : ""));
      setBusy(null);
    }
  };

  const submitEmail = async () => {
    setErr(""); setInfo("");
    if (!email.trim()) { setErr("اكتب إيميلك"); return; }
    if (pass.length < 6) { setErr("كلمة المرور ٦ أحرف على الأقل"); return; }
    if (mode === "signup" && pass !== confirmPass) {
      setErr("كلمة المرور وتأكيدها ما يتطابقان");
      return;
    }
    setBusy("email");
    try {
      if (mode === "signup") await signUp(email, pass);
      else await signIn(email, pass);
      setDone(true);
      setInfo("تم الدخول بنجاح ✓  جارٍ التحميل...");
    } catch (e) {
      const raw = e as FirebaseError;
      const code = raw?.code ?? "";
      console.error("[SignIn] auth/email error:", code, raw?.message ?? e);
      if (code === "auth/email-already-in-use") {
        setMode("signin");
        setErr("هذا الإيميل مسجّل — ادخل بكلمة مرورك أو استخدم «نسيت كلمة المرور»");
      } else if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        setErr("الإيميل أو كلمة المرور غير صحيحة — جرّب «نسيت كلمة المرور»");
      } else if (code === "auth/too-many-requests") {
        setErr("محاولات كثيرة — انتظر دقيقة وحاول مرة ثانية");
      } else if (code === "auth/network-request-failed") {
        setErr("تأكد من اتصالك بالإنترنت وحاول مرة ثانية");
      } else {
        setErr((authErrorMsg(code) || "صار خطأ غير متوقع") + (code ? `  [${code}]` : ""));
      }
      setBusy(null);
    }
  };

  const submitReset = async () => {
    setErr(""); setInfo("");
    if (!email.trim()) { setErr("اكتب إيميلك أولاً"); return; }
    setBusy("reset");
    try {
      await resetPassword(email);
      setInfo("أُرسل رابط إعادة التعيين — تحقّق من البريد الوارد وSpam ✓");
      setShowReset(false);
    } catch (e) {
      const code = (e as FirebaseError)?.code ?? "";
      setErr(authErrorMsg(code) + (code ? ` (${code})` : ""));
    } finally {
      setBusy(null);
    }
  };

  if (done) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 relative z-[1]">
        <Logo className="font-black text-5xl mb-2" />
        <p className="text-[16px] font-bold text-center" style={{ color: "var(--accent-light)" }}>تم الدخول بنجاح ✓</p>
        <p className="text-[14px] text-center" style={{ color: "var(--text-muted)" }}>جارٍ تحميل بياناتك...</p>
        <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin mt-2" style={{ borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  /* حقل كلمة مرور مع زر العين */
  const passField = (
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    setShow: (v: boolean) => void,
    placeholder: string,
    autoComplete: string,
    onEnter?: () => void,
  ) => (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-2xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[52px] pr-12"
        style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute left-3 top-1/2 -translate-y-1/2 p-1"
        style={{ color: "var(--text-muted)" }}
        tabIndex={-1}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-10 relative z-[1]">
      <div className="w-full max-w-sm flex flex-col items-center">
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

        {/* رسائل */}
        {err && (
          <div className="w-full rounded-2xl px-4 py-3 mt-2 mb-1"
            style={{ background: "rgba(239,68,68,0.12)", border: "2px solid #EF4444" }}>
            <p className="text-[14px] text-center font-bold leading-snug" style={{ color: "#EF4444" }}>{err}</p>
          </div>
        )}
        {info && (
          <div className="w-full rounded-2xl px-4 py-3 mt-2 mb-1"
            style={{ background: "rgba(59,130,246,0.12)", border: "2px solid var(--accent)" }}>
            <p className="text-[14px] text-center font-bold" style={{ color: "var(--accent-light)" }}>{info}</p>
          </div>
        )}

        {/* الإيميل */}
        {!showEmail ? (
          <button onClick={() => { setShowEmail(true); setErr(""); setInfo(""); }}
            className="mt-4 text-[14px] font-bold" style={{ color: "var(--text-muted)" }}>
            أو الدخول بالإيميل
          </button>
        ) : showReset ? (
          <div className="w-full mt-5 flex flex-col gap-3">
            <p className="text-[14px] font-bold text-center" style={{ color: "var(--text)" }}>إعادة تعيين كلمة المرور</p>
            <p className="text-[12px] text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
              لو سجّلت عن طريق Google، استخدم زر Google للدخول — ما في كلمة مرور.
            </p>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="الإيميل" autoComplete="email" inputMode="email"
              className="w-full rounded-2xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[52px]"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }} />
            <button onClick={submitReset} disabled={busy !== null}
              className="btn-primary glow-blue" style={{ opacity: busy ? 0.6 : 1 }}>
              {busy === "reset" ? "جارٍ الإرسال..." : "أرسل رابط الإعادة ←"}
            </button>
            <button onClick={() => { setShowReset(false); setErr(""); setInfo(""); }}
              className="text-[13px] font-bold text-center" style={{ color: "var(--text-muted)" }}>
              ← رجوع
            </button>
          </div>
        ) : (
          <div className="w-full mt-5 flex flex-col gap-3">
            <div className="flex rounded-2xl p-1" style={{ background: "var(--surface2)" }}>
              {(["signin", "signup"] as const).map((m) => (
                <button key={m}
                  onClick={() => { setMode(m); setErr(""); setInfo(""); setConfirmPass(""); }}
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

            {passField(
              pass, setPass, showPass, setShowPass,
              "كلمة المرور (٦ أحرف على الأقل)",
              mode === "signup" ? "new-password" : "current-password",
              mode === "signin" ? submitEmail : undefined,
            )}

            {mode === "signup" && passField(
              confirmPass, setConfirmPass, showConfirmPass, setShowConfirmPass,
              "تأكيد كلمة المرور",
              "new-password",
              submitEmail,
            )}

            <button onClick={submitEmail} disabled={busy !== null}
              className="btn-primary glow-blue" style={{ opacity: busy ? 0.6 : 1 }}>
              {busy === "email" ? "لحظة..." : mode === "signin" ? "دخول ←" : "إنشاء حساب ←"}
            </button>

            <p className="text-[12px] text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {mode === "signup"
                ? "أول مرة؟ اكتب أي إيميل وكلمة مرور جديدة وأنشئ حسابك."
                : "ادخل بإيميلك وكلمة المرور التي أنشأتها."}
            </p>

            {mode === "signin" && (
              <button onClick={() => { setShowReset(true); setErr(""); setInfo(""); }}
                className="text-[13px] font-bold text-center" style={{ color: "var(--text-muted)" }}>
                نسيت كلمة المرور؟
              </button>
            )}
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
