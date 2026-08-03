"use client";
/* ═══════════ تسجيلُ سند — جانبُ وليّ الأمر ═══════════
   أربعُ خطوات: بياناتُك ← حسابُك ← الاشتراك ← رمزُ ابنك.

   ▓ يدخل **بلا رابط**: من فتح الصفحة بنفسه يمرّ بالخطوات كاملة، ومن جاءه رابطٌ
     من ابنه (`?code=`) وجد الرمزَ مكتوباً فيتخطّى آخرَ خطوة.

   ▓ ولا رقمَ جوّالٍ يفتح ملفَّ من ليس ابنه: الرمزُ يصنعه الطالبُ ويرسله، فالإذنُ
     منه ابتداءً. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { verifyLink, LINK_FAIL_TEXT, normalizeCode, CODE_LEN } from "@/lib/sanad/link";
import { loadCode, saveChild, loadChild, forgetChild } from "@/lib/sanad/store";
import { SANAD_PRICE } from "@/lib/plan";
import { price } from "@/lib/format";

type Step = "who" | "account" | "subscribe" | "code" | "done";
const ORDER: Step[] = ["who", "account", "subscribe", "code"];

const RELATIONS = ["أب", "أم", "وليّ أمر", "أخ أكبر"];

/* خارج الرسم: مكوّنٌ يُنشأ داخله يُعاد تركيبه مع كل حرفٍ فيفقد الحقلُ تركيزه. */
function Field({ label, hint, ...rest }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>
        {label}{hint && <span style={{ color: "var(--text-dim)" }}> · {hint}</span>}
      </span>
      <input {...rest}
        className="w-full rounded-xl px-4 py-3 t-body outline-none"
        style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
    </label>
  );
}

export default function JoinBody() {
  const [step, setStep] = useState<Step>("who");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState(RELATIONS[0]);
  const [phone, setPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [entered, setEntered] = useState("");

  /* بعد الترطيب: ربطٌ سابق؟ أو رمزٌ جاء في الرابط من ابنه؟ */
  useEffect(() => {
    const t = setTimeout(() => {
      if (loadChild()) { setStep("done"); return; }
      try {
        const c = new URLSearchParams(window.location.search).get("code");
        if (c) setEntered(normalizeCode(c));
      } catch { /* تجاهل */ }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const signUp = async () => {
    setErr("");
    if (!email.trim() || pass.length < 6) { setErr("اكتب بريدك وكلمة مرورٍ من ستّة أحرفٍ فأكثر."); return; }
    setBusy(true);
    try {
      const { signUp: doSignUp, signIn } = await import("@/lib/cloud");
      try { await doSignUp(email.trim(), pass); }
      catch { await signIn(email.trim(), pass); }   // له حسابٌ أصلاً — ندخله لا نعطّله
      setStep("subscribe");
    } catch (e) {
      const { authErrorMsg } = await import("@/lib/cloud");
      setErr(authErrorMsg((e as { code?: string })?.code ?? "") || "تعذّر إنشاء الحساب — تأكّد من اتصالك.");
    } finally { setBusy(false); }
  };

  const submitCode = () => {
    setErr("");
    /* الرمزُ المُصدَر يوجد على **جهاز الطالب**. فإن كان الوالدُ على الجهاز نفسه
       تحقّقنا منه حقيقةً؛ وإن كان على جهازه هو قبِلنا الشكلَ وقلنا له بصراحة
       أين يكتمل الربط. */
    const issued = loadCode();
    const r = verifyLink({ entered, issued, now: Date.now(), guardians: [], email: email.trim() || undefined });
    if (!r.ok && (issued || r.reason === "bad-format")) { setErr(LINK_FAIL_TEXT[r.reason]); return; }
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
            بوّابةُ سند تعرض ملخّصَ ابنك حين تُفتح على جهازه. أمّا متابعتُه من جوّالك
            أنت فتحتاج مزامنةً سحابيةً لم تُفتح بعد — ولن نأخذ منك ريالاً قبل أن تعمل.
            نقولها لك الآن ولا نتركك تكتشفها.
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

  const idx = ORDER.indexOf(step);

  return (
    <div className="flex flex-col gap-4">
      {/* الخطوات */}
      <div className="flex items-center gap-2 px-1">
        {ORDER.map((s, i) => (
          <span key={s} className="flex-1 h-1.5 rounded-full"
            style={{ background: i <= idx ? "var(--success)" : "var(--border)" }} aria-hidden="true" />
        ))}
      </div>

      {step === "who" && (
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>بياناتك</h2>
          <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
            اسمُك وصلتُك يظهران لابنك في قائمة من يتابعه — يعرف من ربطه ومتى.
          </p>
          <Field label="اسمك" value={name} onChange={(e) => setName(e.target.value)} placeholder="أبو محمد" />

          <div>
            <p className="t-caption font-bold mb-2" style={{ color: "var(--text-muted)" }}>صلتك بالطالب</p>
            <div className="flex flex-wrap gap-2">
              {RELATIONS.map((r) => (
                <button key={r} onClick={() => setRelation(r)} aria-pressed={relation === r}
                  className="px-3.5 py-2 rounded-full t-small font-bold transition active:scale-95"
                  style={{
                    background: relation === r ? "var(--success)" : "var(--surface2)",
                    color: relation === r ? "#04231a" : "var(--text-muted)",
                    border: `1.5px solid ${relation === r ? "var(--success)" : "var(--border)"}`,
                  }}>{r}</button>
              ))}
            </div>
          </div>

          <Field label="اسم الطالب" hint="كما تناديه" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="محمد" />
          <Field label="جوّالك" hint="اختياريّ — للتنبيه عند انقطاعه" type="tel" inputMode="tel"
            value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" />

          <button onClick={() => setStep("account")} disabled={!name.trim()}
            className="rounded-2xl py-3 t-body font-black mt-1 disabled:opacity-50"
            style={{ background: "var(--success)", color: "#04231a" }}>التالي</button>
        </section>
      )}

      {step === "account" && (
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>حسابُك</h2>
          <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
            بالحساب تتابع ابنك من جوّالك أنت، ويبقى الربطُ لو غيّرتَ جهازك.
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
            <button onClick={() => setStep("subscribe")}
              className="rounded-2xl px-4 py-3 t-caption font-black"
              style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
              تخطَّ
            </button>
          </div>
        </section>
      )}

      {step === "subscribe" && (
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>اشترك في سند</h2>
          <div className="flex items-baseline gap-2">
            <span className="t-display font-black font-mono-nums" style={{ color: "var(--success)" }}>{price(SANAD_PRICE.amount)}</span>
            <span className="t-body font-bold" style={{ color: "var(--text-muted)" }}>ريال / {SANAD_PRICE.period}</span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            {["ملخّصٌ أسبوعيّ صادق عن مذاكرته", "أين يتعثّر وبماذا تدعمه", "ابنٌ واحدٌ مشمول، وخصمُ النصف لكلّ أخ"].map((f) => (
              <p key={f} className="t-caption" style={{ color: "var(--text-dim)" }}>✓ {f}</p>
            ))}
          </div>
          <p className="t-caption leading-relaxed mt-1" style={{ color: "var(--text-muted)" }}>
            بوّابةُ الدفع لم تُفتح بعد — فاشتراكُك الآن **تجريبيٌّ بلا مقابل**، ولن
            يُطلب منك شيءٌ حتى تعمل المزامنةُ التي تُريك ابنَك من جوّالك.
          </p>
          <button onClick={() => { setSubscribed(true); setStep("code"); }}
            className="rounded-2xl py-3.5 t-body font-black mt-1"
            style={{ background: "var(--success)", color: "#04231a" }}>
            اشترك — تجربةٌ بلا دفع
          </button>
          <button onClick={() => setStep("code")}
            className="rounded-2xl py-2.5 t-caption font-black"
            style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
            لاحقاً — أريد الربط فقط
          </button>
        </section>
      )}

      {step === "code" && (
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>رمزُ {childName.trim() || "ابنك"}</h2>
          {subscribed && (
            <p className="t-caption font-bold" style={{ color: "var(--success)" }}>✓ اشتراكُك فُعّل — بقيت خطوةٌ واحدة.</p>
          )}
          <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
            يفتح ابنُك درب ← ملفّي ← الإعدادات ← «وليّ أمرك» ← «أنشئ رمزاً»، ثم
            يرسله لك أو يقرؤه عليك. الرمزُ يعيش عشر دقائق ثم يموت.
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
        <Link href="/sanad" className="font-bold" style={{ color: "var(--success)" }}>ما هو سند؟</Link>
        {" · "}لا نقرأ محادثات ابنك ولا دفترَه ولا موقعَه.
      </p>
    </div>
  );
}
