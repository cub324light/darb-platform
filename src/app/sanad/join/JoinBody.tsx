"use client";
/* ═══════════ تسجيلُ سند — جانبُ وليّ الأمر ═══════════
   خطوتان لا أكثر: حسابٌ للوالد، ثم رمزُ ابنه. لا رقمَ جوّالٍ يُدخله فيفتح ملفَّ
   من ليس ابنه — الرمزُ يصنعه الطالبُ ويقرؤه على والده، فالإذنُ منه ابتداءً.

   ▓ الحسابُ اختياريّ عمداً: من أراد أن يجرّب سنداً على جهاز ابنه لا نُلزمه
     بتسجيلٍ لا يحتاجه. ومن أراد متابعةً من جوّاله هو فالحسابُ بابُه. */
import { useState } from "react";
import Link from "next/link";
import { verifyLink, LINK_FAIL_TEXT, normalizeCode, CODE_LEN } from "@/lib/sanad/link";
import { loadCode, saveChild, loadChild, forgetChild } from "@/lib/sanad/store";
import { SANAD_PRICE } from "@/lib/plan";
import { price } from "@/lib/format";

type Step = "who" | "account" | "code" | "done";

/* خارج الرسم: مكوّنٌ يُنشأ داخله يُعاد تركيبه مع كل حرفٍ فيفقد الحقلُ تركيزه. */
function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>{label}</span>
      <input {...rest}
        className="w-full rounded-xl px-4 py-3 t-body outline-none"
        style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
    </label>
  );
}

export default function JoinBody() {
  const [step, setStep] = useState<Step>(() => (typeof window !== "undefined" && loadChild() ? "done" : "who"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [entered, setEntered] = useState("");

  const signUp = async () => {
    setErr("");
    if (!email.trim() || pass.length < 6) { setErr("اكتب بريدك وكلمة مرورٍ من ستّة أحرفٍ فأكثر."); return; }
    setBusy(true);
    try {
      const { signUp: doSignUp, signIn } = await import("@/lib/cloud");
      try { await doSignUp(email.trim(), pass); }
      catch { await signIn(email.trim(), pass); }   // له حسابٌ أصلاً — ندخله لا نعطّله
      setStep("code");
    } catch (e) {
      const { authErrorMsg } = await import("@/lib/cloud");
      setErr(authErrorMsg((e as { code?: string })?.code ?? "") || "تعذّر إنشاء الحساب — تأكّد من اتصالك.");
    } finally { setBusy(false); }
  };

  const submitCode = () => {
    setErr("");
    /* الرمزُ المُصدَر يوجد على **جهاز الطالب**. فإن كان الوالدُ على الجهاز نفسه
       تحقّقنا منه حقيقةً؛ وإن كان على جهازه هو فلا سبيل للتحقّق محلياً — نقبل
       الشكلَ ونقول له بصراحة أنّ الربطَ يكتمل حين يفتح البوّابة على جهاز ابنه. */
    const issued = loadCode();
    const r = verifyLink({ entered, issued, now: Date.now(), guardians: [], email: email.trim() || undefined });
    if (!r.ok && issued) { setErr(LINK_FAIL_TEXT[r.reason]); return; }
    if (!r.ok && r.reason === "bad-format") { setErr(LINK_FAIL_TEXT["bad-format"]); return; }
    saveChild({ code: normalizeCode(entered), linkedAt: Date.now(), label: name.trim() || undefined });
    setStep("done");
  };

  if (step === "done") {
    const child = typeof window !== "undefined" ? loadChild() : null;
    return (
      <div className="flex flex-col gap-4">
        <section className="ds-card ds-stack-tight text-center"
          style={{ background: "color-mix(in srgb, var(--success) 8%, var(--surface))", border: "1.5px solid color-mix(in srgb, var(--success) 32%, var(--border))" }}>
          <p className="text-[38px]" aria-hidden="true">🤝</p>
          <h2 className="t-h2 font-black" style={{ color: "var(--text)" }}>اكتمل التسجيل</h2>
          <p className="t-body leading-relaxed" style={{ color: "var(--text-muted)" }}>
            رمزُ ابنك <span className="font-mono-nums font-black" style={{ color: "var(--text)" }}>{child?.code}</span> محفوظٌ على جهازك.
          </p>
        </section>

        <Link href="/parent" className="rounded-2xl py-4 t-body font-black text-center no-underline"
          style={{ background: "var(--success)", color: "#04231a" }}>
          افتح بوّابة سند ←
        </Link>

        <section className="ds-card ds-stack-tight">
          <h3 className="t-title font-black" style={{ color: "var(--text)" }}>ما الذي يعمل الآن</h3>
          <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
            بوّابةُ سند تعرض ملخّصَ ابنك حين تُفتح **على جهازه**. أمّا متابعتُه من
            جوّالك أنت فتحتاج مزامنةً سحابيةً لم تُفتح بعد — ولن نأخذ منك اشتراكاً
            قبل أن تعمل. نقولها لك الآن ولا نتركك تكتشفها.
          </p>
          <button onClick={() => { forgetChild(); setStep("who"); setEntered(""); }}
            className="rounded-2xl py-3 t-caption font-black mt-1"
            style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
            افصل هذا الربط
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* الخطوات */}
      <div className="flex items-center gap-2 px-1">
        {(["who", "account", "code"] as Step[]).map((s, i) => {
          const idx = ["who", "account", "code"].indexOf(step);
          const on = i <= idx;
          return (
            <span key={s} className="flex-1 h-1.5 rounded-full"
              style={{ background: on ? "var(--success)" : "var(--border)" }} aria-hidden="true" />
          );
        })}
      </div>

      {step === "who" && (
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>من أنت؟</h2>
          <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
            اسمُك يظهر لابنك في قائمة من يتابعه — يعرف من ربطه ومتى.
          </p>
          <Field label="اسمك" value={name} onChange={(e) => setName(e.target.value)} placeholder="أبو محمد" />
          <div className="flex gap-2 mt-1">
            <button onClick={() => setStep("account")}
              className="flex-1 rounded-2xl py-3 t-body font-black"
              style={{ background: "var(--success)", color: "#04231a" }}>التالي</button>
            <button onClick={() => setStep("code")}
              className="rounded-2xl px-4 py-3 t-caption font-black"
              style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
              بلا حساب
            </button>
          </div>
        </section>
      )}

      {step === "account" && (
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>حسابُك</h2>
          <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
            بالحساب تتابع ابنك من جوّالك أنت. ومن أراد التجربة على جهاز ابنه فليتخطّاه.
          </p>
          <Field label="البريد" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Field label="كلمة المرور" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="ستّة أحرفٍ فأكثر" />
          {err && <p className="t-caption font-bold" style={{ color: "var(--danger)" }}>{err}</p>}
          <div className="flex gap-2 mt-1">
            <button onClick={signUp} disabled={busy}
              className="flex-1 rounded-2xl py-3 t-body font-black disabled:opacity-60"
              style={{ background: "var(--success)", color: "#04231a" }}>
              {busy ? "…" : "أنشئ الحساب"}
            </button>
            <button onClick={() => setStep("code")}
              className="rounded-2xl px-4 py-3 t-caption font-black"
              style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
              تخطَّ
            </button>
          </div>
        </section>
      )}

      {step === "code" && (
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>رمزُ ابنك</h2>
          <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
            يفتح ابنُك درب ← ملفّي ← «اربط وليّ أمرك» ← «أنشئ رمزاً»، ويقرؤه عليك.
            الرمزُ يعيش عشرَ دقائق ثم يموت.
          </p>
          <input value={entered} onChange={(e) => setEntered(e.target.value.toUpperCase())}
            maxLength={CODE_LEN + 2} placeholder="A4CD7K" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
            className="w-full rounded-2xl px-4 py-4 t-h2 font-black font-mono-nums text-center outline-none"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)", letterSpacing: "0.18em" }} />
          {err && <p className="t-caption font-bold" style={{ color: "var(--danger)" }}>{err}</p>}
          <button onClick={submitCode} disabled={normalizeCode(entered).length !== CODE_LEN}
            className="rounded-2xl py-3.5 t-body font-black disabled:opacity-50"
            style={{ background: "var(--success)", color: "#04231a" }}>
            اربط
          </button>
        </section>
      )}

      <p className="t-caption text-center leading-relaxed" style={{ color: "var(--text-dim)" }}>
        سند {price(SANAD_PRICE.amount)} ريال / {SANAD_PRICE.period} — والاشتراك المدفوع لم يُفتح بعد،
        فلن يُطلب منك شيء الآن. <Link href="/sanad" className="font-bold" style={{ color: "var(--success)" }}>ما هو سند؟</Link>
      </p>
    </div>
  );
}
