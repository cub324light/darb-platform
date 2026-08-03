"use client";
/* ═══════════ «اربط وليّ أمرك» — جانبُ الطالب ═══════════
   الربطُ **بيد الطالب**: هو من يُنشئ الرمز، وهو من يفصل متى شاء. لا يُربط أحدٌ
   بحسابه بإدخال رقم جوّاله من الطرف الآخر — منتَجٌ يتابع القاصرَ بلا علمه يفسد
   الثقةَ التي يقوم عليها.

   ويرى الطالبُ صراحةً **ماذا سيرى والدُه وماذا لن يرى** قبل أن يضغط. */
import { useEffect, useState } from "react";
import Sheet from "@/components/Sheet";
import { CODE_TTL_MS, secondsLeft, MAX_GUARDIANS, type PairCode, type Guardian } from "@/lib/sanad/link";
import { loadCode, issueCode, clearCode, loadGuardians, unlinkGuardian, linkGuardian } from "@/lib/sanad/store";
import { n, dateShort } from "@/lib/format";

const SEES = [
  "كم ساعةً ذاكرت هذا الأسبوع وكم جلسةً أتممت",
  "المادّة التي يقلّ فيها إنجازك",
  "كم بقي على أقرب اختبارٍ رسميّ لك",
];
const NOT = [
  "محادثاتك مع دويرب",
  "ما تكتبه في دفترك أو ترسمه",
  "موقعك أو رسائلك أو صورك",
];

export default function GuardianLink() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<PairCode | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [left, setLeft] = useState(0);

  /* قراءةٌ بعد الترطيب لا في المُهيّئ (التخزينُ لا يوجد على الخادم)، ومؤجَّلةٌ
     خطوةً: ضبطُ الحالة داخل الأثر مباشرةً يُسلسل رسماتٍ متتالية. */
  useEffect(() => {
    const t = setTimeout(() => { setCode(loadCode()); setGuardians(loadGuardians()); }, 0);
    return () => clearTimeout(t);
  }, []);

  /* عدّادُ عمر الرمز */
  useEffect(() => {
    if (!code) return;
    const tick = () => {
      const s = secondsLeft(code.issuedAt, Date.now());
      setLeft(s);
      if (s === 0) { clearCode(); setCode(null); }
    };
    const id = setInterval(tick, 1000);
    const first = setTimeout(tick, 0);
    return () => { clearInterval(id); clearTimeout(first); };
  }, [code]);

  const full = guardians.length >= MAX_GUARDIANS;

  return (
    <section className="ds-card ds-stack-tight">
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>🤝 وليّ أمرك</h2>
        {guardians.length > 0 && (
          <span className="t-caption" style={{ color: "var(--text-muted)" }}>
            {guardians.length === 1 ? "مرتبطٌ واحد" : `${n(guardians.length)} مرتبطين`}
          </span>
        )}
      </div>
      <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
        تقدر تعطي والدك ملخّصاً أسبوعياً عن مذاكرتك — بإذنك، وتفصله متى شئت.
      </p>

      {guardians.length > 0 && (
        <div className="flex flex-col gap-2">
          {guardians.map((g) => (
            <div key={g.id} className="rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <span className="w-9 h-9 rounded-xl grid place-items-center t-body flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)" }} aria-hidden="true">👤</span>
              <span className="flex-1 min-w-0">
                <span className="block t-small font-black truncate" style={{ color: "var(--text)" }}>{g.label}</span>
                <span className="block t-caption truncate" style={{ color: "var(--text-muted)" }}>
                  {g.email ? `${g.email} · ` : ""}منذ {dateShort(new Date(g.linkedAt).toISOString().slice(0, 10))}
                </span>
              </span>
              <button onClick={() => setGuardians(unlinkGuardian(g.id))}
                className="t-caption font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                style={{ color: "var(--danger)" }}>افصله</button>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setOpen(true)} disabled={full}
        className="w-full rounded-2xl py-3 t-body font-black transition active:scale-[0.98] disabled:opacity-50"
        style={{ background: "transparent", border: "1.5px solid var(--success)", color: "var(--success)" }}>
        {full ? `بلغتَ الحدّ (${n(MAX_GUARDIANS)})` : "＋ اربط وليّ أمرك"}
      </button>

      {open && (
        <Sheet onClose={() => setOpen(false)} title="اربط وليّ أمرك">
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <p className="t-caption font-black mb-1.5" style={{ color: "var(--success)" }}>سيرى</p>
              {SEES.map((x) => (
                <p key={x} className="t-caption leading-relaxed" style={{ color: "var(--text-dim)" }}>• {x}</p>
              ))}
              <p className="t-caption font-black mt-3 mb-1.5" style={{ color: "var(--danger)" }}>ولن يرى</p>
              {NOT.map((x) => (
                <p key={x} className="t-caption leading-relaxed" style={{ color: "var(--text-dim)" }}>• {x}</p>
              ))}
            </div>

            {code ? (
              <div className="rounded-2xl p-5 text-center" style={{ background: "color-mix(in srgb, var(--success) 8%, var(--surface2))", border: "1.5px solid color-mix(in srgb, var(--success) 35%, transparent)" }}>
                <p className="t-caption font-bold" style={{ color: "var(--text-muted)" }}>اقرأ هذا الرمز على والدك</p>
                <p className="t-display font-black font-mono-nums mt-1" style={{ color: "var(--text)", letterSpacing: "0.18em" }}>{code.code}</p>
                <p className="t-caption mt-2 font-mono-nums" style={{ color: "var(--text-muted)" }}>
                  ينتهي بعد {n(Math.floor(left / 60))}:{String(left % 60).padStart(2, "0")}
                </p>
                <p className="t-caption mt-2 leading-relaxed" style={{ color: "var(--text-dim)" }}>
                  يفتح والدُك <span className="font-black" style={{ color: "var(--text)" }}>usedarb.com/sanad/join</span> ويكتبه.
                </p>
              </div>
            ) : (
              <button onClick={() => setCode(issueCode())}
                className="w-full rounded-2xl py-3.5 t-body font-black"
                style={{ background: "var(--success)", color: "#04231a" }}>
                أنشئ رمزاً ({n(CODE_TTL_MS / 60000)} دقائق)
              </button>
            )}

            {code && (
              <div className="flex gap-2">
                <button onClick={() => setCode(issueCode())}
                  className="flex-1 rounded-2xl py-3 t-caption font-black"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>رمزٌ جديد</button>
                <button
                  onClick={() => {
                    /* التأكيدُ من الطالب نفسِه: هو من يشهد أنّ والده كتبه */
                    setGuardians(linkGuardian({
                      id: `g${Date.now().toString(36)}`,
                      label: "وليّ أمري",
                      linkedAt: Date.now(),
                    }));
                    setCode(null);
                    setOpen(false);
                  }}
                  className="flex-1 rounded-2xl py-3 t-caption font-black"
                  style={{ background: "var(--accent)", color: "#fff" }}>كتبه ✓</button>
              </div>
            )}

            <p className="t-caption leading-relaxed px-1" style={{ color: "var(--text-muted)" }}>
              الرمزُ يُقرأ مرّةً ثم يموت، ولا يُربط أحدٌ بحسابك بغير علمك. وتقدر تفصله في أي وقت.
            </p>
          </div>
        </Sheet>
      )}
    </section>
  );
}
