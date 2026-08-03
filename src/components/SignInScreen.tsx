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
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function SignInScreen({
  initialError,
  onGuest,
}: {
  initialError?: string | null;
  onGuest?: () => void;
}) {
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [err, setErr] = useState(initialError ?? "");

  /* حالة بطاقة الإيميل */
  const [emailOpen, setEmailOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const oauthGoogle = async () => {
    setErr("");
    setBusy("google");
    try {
      await signInWithGoogle();
    } catch (e) {
      const code = (e as FirebaseError)?.code ?? "";
      setErr(authErrorMsg(code) + (code ? ` (${code})` : ""));
      setBusy(null);
    }
  };

  const submitEmail = async () => {
    setErr("");
    if (!email.trim() || pass.length < 6) {
      setErr("اكتب الإيميل وكلمة مرور 6 أحرف على الأقل");
      return;
    }
    if (mode === "signup" && pass !== confirmPass) {
      setErr("كلمة المرور وتأكيدها غير متطابقتَين");
      return;
    }
    setBusy("email");
    try {
      if (mode === "signup") await signUp(email, pass);
      else await signIn(email, pass);
    } catch (e) {
      setErr(authErrorMsg((e as FirebaseError)?.code ?? ""));
      setBusy(null);
    }
  };

  const submitReset = async () => {
    setErr("");
    if (!email.trim()) { setErr("اكتب الإيميل أولاً"); return; }
    setBusy("email");
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (e) {
      setErr(authErrorMsg((e as FirebaseError)?.code ?? ""));
    } finally {
      setBusy(null);
    }
  };

  const passField = (
    val: string, setVal: (v: string) => void,
    show: boolean, setShow: (v: boolean) => void,
    placeholder: string, autoComplete: string,
    onEnter?: () => void,
  ) => (
    <div className="relative w-full">
      <input
        type={show ? "text" : "password"}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[52px]"
        style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", paddingLeft: "48px" }}
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
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-10 relative z-[1]">
      <div className="w-full max-w-sm flex flex-col items-center">
        <Logo className="font-black text-5xl mb-2" />
        <p className="text-[17px] text-center leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
          اختر طريقة الدخول
        </p>

        {/* ── رسالة الخطأ ── */}
        {err && (
          <div className="w-full rounded-2xl px-4 py-3 mb-4" style={{ background: "color-mix(in srgb, var(--danger) 12%, transparent)", border: "1.5px solid var(--danger)" }}>
            <p className="text-[15px] text-center font-semibold" style={{ color: "var(--danger)" }}>{err}</p>
          </div>
        )}

        {/* ══════ بطاقة 1: Google ══════ */}
        <div className="w-full rounded-2xl p-4 mb-3"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "color-mix(in srgb, #4285F4 12%, transparent)", border: "1px solid color-mix(in srgb, #4285F4 30%, transparent)" }}>
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </div>
            <div>
              <p className="font-black text-[17px]" style={{ color: "var(--text)" }}>Google</p>
              <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>سجّل دخولك ببضع ثوانٍ</p>
            </div>
          </div>
          <button onClick={oauthGoogle} disabled={busy !== null}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-[17px] transition active:scale-[0.98] min-h-[52px]"
            style={{
              background: "#FFFFFF", color: "#1F1F1F",
              border: "1.5px solid #DADCE0",
              opacity: busy && busy !== "google" ? 0.5 : 1,
            }}>
            {busy === "google" ? (
              <span className="inline-block w-5 h-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            )}
            {busy === "google" ? "جارٍ التوجيه..." : "المتابعة بحساب Google"}
          </button>
        </div>

        {/* ══════ بطاقة 2: الإيميل ══════ */}
        <div className="w-full rounded-2xl p-4 mb-3"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
          <button className="w-full flex items-center gap-2.5 mb-0"
            onClick={() => { setEmailOpen((o) => !o); setErr(""); setMode("signin"); }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div className="flex-1 text-right">
              <p className="font-black text-[17px]" style={{ color: "var(--text)" }}>الإيميل</p>
              <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>دخول أو حساب جديد</p>
            </div>
            <span className="text-[var(--text-muted)] text-lg transition-transform duration-200"
              style={{ transform: emailOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
              ⌄
            </span>
          </button>

          {emailOpen && (
            <div className="mt-4 flex flex-col gap-3">
              {mode === "forgot" ? (
                <>
                  <p className="text-[15px] text-center font-semibold" style={{ color: "var(--text)" }}>إعادة تعيين كلمة المرور</p>
                  {resetSent ? (
                    <div className="rounded-xl px-4 py-3" style={{ background: "color-mix(in srgb, #10B981 12%, transparent)", border: "1.5px solid #10B981" }}>
                      <p className="text-[15px] text-center font-semibold" style={{ color: "#10B981" }}>تم الإرسال — تحقق من بريدك</p>
                    </div>
                  ) : (
                    <>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="الإيميل" autoComplete="email" inputMode="email"
                        className="w-full rounded-xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[52px]"
                        style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
                      <button onClick={submitReset} disabled={busy !== null}
                        className="btn-primary" style={{ opacity: busy ? 0.6 : 1 }}>
                        {busy === "email" ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
                      </button>
                    </>
                  )}
                  <button onClick={() => { setMode("signin"); setErr(""); setResetSent(false); }}
                    className="text-[15px] text-center py-1 font-semibold" style={{ color: "var(--text-muted)" }}>
                    → رجوع
                  </button>
                </>
              ) : (
                <>
                  {/* تبويب دخول / حساب جديد */}
                  <div className="flex rounded-xl p-1 gap-1" style={{ background: "var(--surface2)" }}>
                    {(["signin", "signup"] as const).map((m) => (
                      <button key={m} onClick={() => { setMode(m); setErr(""); setConfirmPass(""); }}
                        className="flex-1 py-2.5 rounded-lg text-[16px] font-bold transition"
                        style={mode === m
                          ? { background: "var(--accent)", color: "white" }
                          : { color: "var(--text-muted)" }}>
                        {m === "signin" ? "دخول" : "حساب جديد"}
                      </button>
                    ))}
                  </div>

                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="الإيميل" autoComplete="email" inputMode="email"
                    className="w-full rounded-xl px-4 py-3.5 text-base text-[var(--text)] placeholder-[var(--text-muted)] outline-none min-h-[52px]"
                    style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />

                  {passField(pass, setPass, showPass, setShowPass,
                    "كلمة المرور (6 أحرف+)",
                    mode === "signup" ? "new-password" : "current-password",
                    mode === "signin" ? submitEmail : undefined,
                  )}

                  {mode === "signup" && passField(confirmPass, setConfirmPass, showConfirmPass, setShowConfirmPass,
                    "تأكيد كلمة المرور", "new-password", submitEmail,
                  )}

                  <button onClick={submitEmail} disabled={busy !== null}
                    className="btn-primary glow-blue" style={{ opacity: busy ? 0.6 : 1 }}>
                    {busy === "email" ? "لحظة..." : mode === "signin" ? "دخول ←" : "إنشاء حساب ←"}
                  </button>

                  {mode === "signin" && (
                    <button onClick={() => { setMode("forgot"); setErr(""); }}
                      className="text-[15px] text-center py-1" style={{ color: "var(--text-muted)" }}>
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ══════ بطاقة 3: زائر ══════ */}
        {onGuest && (
          <div className="w-full rounded-2xl p-4"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
                </svg>
              </div>
              <div>
                <p className="font-black text-[17px]" style={{ color: "var(--text)" }}>زائر</p>
                <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>تجرّب بدون حساب — البيانات محلية فقط</p>
              </div>
            </div>
            <button onClick={onGuest} disabled={busy !== null}
              className="w-full py-3.5 rounded-xl font-bold text-[17px] transition active:scale-[0.98] min-h-[52px]"
              style={{
                background: "transparent",
                border: "1.5px solid var(--border)",
                color: "var(--text-dim)",
                opacity: busy !== null ? 0.5 : 1,
              }}>
              المتابعة كزائر
            </button>
          </div>
        )}

        {/* ══════ بطاقة 4: وليّ الأمر ══════
            سندٌ منتَجٌ مستقلّ: الوالدُ يصله رابطُ ابنه ولا حسابَ له في درب، فلو
            لم يجد مدخله هنا لَحاول الدخولَ بحسابٍ لا يملكه. */}
        <a href="/sanad/join"
          className="w-full rounded-2xl p-4 mt-3 no-underline block"
          style={{ background: "var(--surface)", border: "1.5px solid color-mix(in srgb, var(--success) 32%, var(--border))" }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px]"
              style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)" }}>
              🤝
            </div>
            <div>
              <p className="font-black text-[17px]" style={{ color: "var(--text)" }}>وليّ أمر؟</p>
              <p className="text-[14px]" style={{ color: "var(--text-muted)" }}>سجّل في سند وتابع مذاكرة ابنك بإذنه</p>
            </div>
          </div>
          <span className="w-full py-3.5 rounded-xl font-bold text-[17px] min-h-[52px] flex items-center justify-center"
            style={{ background: "transparent", border: "1.5px solid var(--success)", color: "var(--success)" }}>
            ادخل إلى سند ←
          </span>
        </a>

        <p className="text-[12px] text-center mt-6 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          بدخولك توافق على{" "}
          <a href="/privacy" className="underline" style={{ color: "var(--text-dim)" }}>سياسة الخصوصية</a>
        </p>
      </div>
    </div>
  );
}
