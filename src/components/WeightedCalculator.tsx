"use client";
/* ─── 🧮 حاسبة الموزونة ───
   تحسب النسبة الموزونة الرسمية من معادلة الجامعة المختارة + درجات الطالب.
   كل المنطق من محرّك نقي واحد: computeWeighted() في university.ts.
   الدرجات تُعبَّأ تلقائياً من «نتائجي» وتبقى قابلة للتعديل. */
import { useMemo, useState } from "react";
import {
  findUniversity, computeWeighted, weightedVerdict, type WeightedFormula,
} from "@/lib/university";
import { loadGoals, saveGoals, currentScoreMap } from "@/lib/storage";
import { n as ar } from "@/lib/format";


/* أحدث درجة من خريطة النتائج حسب كلمات مفتاحية */
function scoreFromMap(map: Record<string, { score: number }>, ...keys: string[]): number | null {
  for (const k of keys) for (const mk of Object.keys(map)) if (mk.includes(k)) return map[mk].score;
  return null;
}

export default function WeightedCalculator({ universityId }: { universityId?: string }) {
  const goals = loadGoals();
  const uniId = universityId ?? goals.universityId;
  const uni = findUniversity(uniId);

  const scoreMap = useMemo(() => currentScoreMap(), []);
  const prefillQudurat = useMemo(() => scoreFromMap(scoreMap, "قدرات"), [scoreMap]);
  const prefillTahsili = useMemo(() => scoreFromMap(scoreMap, "تحصيلي"), [scoreMap]);

  const [hs, setHs] = useState<string>(() => goals.highschoolPct != null ? String(goals.highschoolPct) : "");
  const [qd, setQd] = useState<string>(() => prefillQudurat != null ? String(prefillQudurat) : "");
  const [th, setTh] = useState<string>(() => prefillTahsili != null ? String(prefillTahsili) : "");
  const [formulaId, setFormulaId] = useState<string>(() => uni?.formulas?.[0]?.id ?? "");

  const formulas = uni?.formulas ?? [];
  const formula: WeightedFormula | undefined =
    formulas.find((f) => f.id === formulaId) ?? formulas[0];

  const num = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const v = Number(t.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
    return Number.isFinite(v) ? v : null;
  };

  /* احفظ نسبة الثانوية في الأهداف عند التغيير (مزامنة سحابية تلقائية) */
  const persistHs = () => {
    const v = num(hs);
    saveGoals({ ...loadGoals(), highschoolPct: v == null ? undefined : v });
  };

  const result = useMemo(() => {
    if (!formula) return null;
    return computeWeighted(formula, { highschool: num(hs), qudurat: num(qd), tahsili: num(th) });
  }, [formula, hs, qd, th]);

  if (!uni || uni.id === "other") {
    return (
      <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-[15px] font-black mb-1" style={{ color: "var(--text)" }}>🧮 حاسبة الموزونة</p>
        <p className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>
          اختر جامعتك من القائمة أعلاه لأحسب نسبتك الموزونة حسب معادلتها الرسمية.
        </p>
      </div>
    );
  }

  const verdict = result?.score != null ? weightedVerdict(result.score) : null;
  const vColor =
    verdict?.icon === "🟢" ? "var(--success)" :
    verdict?.icon === "🟡" ? "var(--gold)" : "var(--danger)";

  const field = (label: string, value: string, set: (v: string) => void, onBlur?: () => void, dim?: boolean) => (
    <label className="flex flex-col gap-1 flex-1 min-w-[88px]">
      <span className="text-[13px] font-bold" style={{ color: dim ? "var(--text-muted)" : "var(--text-muted)" }}>{label}</span>
      <input
        value={value} onChange={(e) => set(e.target.value)} onBlur={onBlur}
        inputMode="decimal" placeholder="—" maxLength={5}
        className="w-full rounded-xl px-3 py-2 text-[17px] font-black text-center text-[var(--text)] outline-none"
        style={{ background: "var(--surface2)", border: "1.5px solid var(--border)" }} />
    </label>
  );

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2">
        <span className="text-[20px]">🧮</span>
        <p className="text-[15px] font-black flex-1" style={{ color: "var(--text)" }}>حاسبة الموزونة — {uni.name}</p>
      </div>

      {/* أهلية بلا معادلة رسمية */}
      {formulas.length === 0 ? (
        <div className="rounded-xl px-3 py-3 text-[14px] font-semibold"
          style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
          {uni.admissionNote ?? "معايير القبول في هذه الجامعة تختلف حسب التخصص — راجع موقعها الرسمي."}
        </div>
      ) : (
        <>
          {/* اختيار المعادلة (المسار) */}
          {formulas.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {formulas.map((f) => {
                const on = f.id === formula?.id;
                return (
                  <button key={f.id} onClick={() => setFormulaId(f.id)} aria-pressed={on}
                    className="px-3 py-1.5 rounded-full text-[14px] font-bold transition active:scale-95"
                    style={{
                      background: on ? "var(--accent)" : "var(--surface2)",
                      color: on ? "#fff" : "var(--text)",
                      border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                    }}>
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* المدخلات */}
          <div className="flex gap-2.5">
            {formula && formula.highschool > 0 && field(`الثانوية (${ar(formula.highschool)}٪)`, hs, setHs, persistHs)}
            {formula && formula.qudurat > 0 && field(`القدرات (${ar(formula.qudurat)}٪)`, qd, setQd)}
            {formula && formula.tahsili > 0 && field(`التحصيلي (${ar(formula.tahsili)}٪)`, th, setTh)}
          </div>

          {formula?.note && (
            <p className="text-[13px] font-semibold" style={{ color: "var(--gold)" }}>⚠️ {formula.note}</p>
          )}

          {/* النتيجة */}
          {result?.score != null ? (
            <div className="rounded-xl p-3.5 flex flex-col gap-3"
              style={{ background: `color-mix(in srgb, ${vColor} 8%, var(--surface2))`, border: `1px solid color-mix(in srgb, ${vColor} 28%, transparent)` }}>
              <div className="flex items-center gap-3">
                <span className="text-[27px]">{verdict?.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>نسبتك الموزونة</p>
                  <p className="text-[29px] font-black leading-none" style={{ color: vColor }}>{ar(result.score)}٪</p>
                </div>
              </div>
              {verdict && (
                <p className="text-[14px] font-bold" style={{ color: "var(--text)" }}>{verdict.label}</p>
              )}
              {/* تفصيل المساهمة */}
              <div className="flex flex-col gap-1.5">
                {result.parts.map((p) => (
                  <div key={p.label} className="flex items-center justify-between text-[14px]">
                    <span className="font-bold" style={{ color: "var(--text-muted)" }}>
                      {p.label} ({ar(p.value)} × {ar(p.weight)}٪)
                    </span>
                    <span className="font-black" style={{ color: "var(--text)" }}>{ar(Math.round(p.contribution * 100) / 100)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[14px] font-semibold rounded-xl px-3 py-2.5"
              style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
              أدخل {result?.missing.join(" و") || "درجاتك"} لحساب نسبتك الموزونة.
            </p>
          )}
        </>
      )}

      {/* كليات الجامعة */}
      {uni.colleges && uni.colleges.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-black" style={{ color: "var(--text)" }}>🏛️ كليات {uni.name}</p>
          <div className="flex flex-wrap gap-1.5">
            {uni.colleges.map((c) => (
              <span key={c} className="px-2.5 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
        المعادلات إرشادية وتتغيّر سنوياً — اعتمد دائماً على موقع الجامعة الرسمي.
      </p>
    </div>
  );
}
