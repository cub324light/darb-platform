"use client";
/* ─── Life Engine Debug — أداة مرحلة التحقّق (للمطوّر فقط) ───
   لا نربط أي صفحة بالعقل قبل أن نفسّر كل قرار يتخذه. هذه الأداة تكشف العقل كاملاً:
   ما يعرفه عن الطالب (LifeContext)، ثم أولوياته بثقةٍ لكل واحدة، ثم «لماذا؟»
   (الأسباب) و«Rules Fired» (القواعد بأوزانها). سَندبوكس حيّ: عدّل أي إشارة فتُعاد
   الحسبة فوراً — بلا كتابة في التخزين — لنراجع العقل نفسه لا النتيجة فقط. */
import { useState } from "react";
import {
  lifeEngine, lifeScore, projectTimeline, readLifeContext,
  type LifeContext, type Priority, type Tier,
} from "@/lib/lifeEngine";

/* تصنيف الأولوية — لونٌ بمعنى، لا تختلط الأنواع */
const TIER_META: Record<Tier, { label: string; color: string }> = {
  urgent: { label: "عاجل", color: "var(--danger)" },
  important: { label: "مهم", color: "var(--gold)" },
  strategic: { label: "استراتيجي", color: "var(--accent)" },
};

/* أمثلة جاهزة لتسريع المراجعة */
const BASE: LifeContext = {
  stage: "university", uniStage: "senior", gpa: 2.31, hours: 91, year: "الثالثة",
  majorId: "ee", majorName: "هندسة كهربائية", coopDone: false, gradInterest: false,
  inSchoolFinals: false, daysToSchoolFinals: null, qiyas: null,
  uniFinalsInDays: null, termLabel: "الفصل الثالث", inStudyTerm: true,
};
const PRESETS: { label: string; patch: Partial<LifeContext> }[] = [
  { label: "جامعي متعثّر", patch: { stage: "university", uniStage: "senior", gpa: 2.31 } },
  { label: "جامعي متميّز", patch: { stage: "university", uniStage: "senior", gpa: 4.8 } },
  { label: "جامعي بداية", patch: { stage: "university", uniStage: "start", gpa: 3.4, year: "الأولى", hours: 18 } },
  { label: "اختبارات الفصل", patch: { stage: "university", uniStage: "mid", gpa: 3.2, uniFinalsInDays: 6 } },
  { label: "ثالث ثانوي", patch: { stage: "third", uniStage: null } },
  { label: "أول ثانوي", patch: { stage: "first", uniStage: null, qiyas: { kind: "qudurat", label: "القدرات العامة", days: 30, weeks: 5, approximate: true } } },
];

/* عرض حقل سياق واحد */
function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b" style={{ borderColor: "var(--border)" }}>
      <span className="t-caption" style={{ color: "var(--text-muted)" }}>{k}</span>
      <span className="t-caption font-black font-mono-nums" style={{ color: "var(--text)" }}>{v}</span>
    </div>
  );
}

/* صفّ تحكّم (نص/رقم) */
function Ctrl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="t-caption font-black" style={{ color: "var(--text-muted)" }}>{label}</span>
      {children}
    </label>
  );
}
const inputCls = "rounded-lg px-2.5 py-1.5 t-caption font-black bg-transparent";
const inputStyle = { border: "1px solid var(--border)", color: "var(--text)", background: "var(--surface2)" } as const;

export default function LifeEngineDebug() {
  const [c, setC] = useState<LifeContext>(() => BASE);
  const set = <K extends keyof LifeContext>(k: K, v: LifeContext[K]) => setC((p) => ({ ...p, [k]: v }));
  const priorities: Priority[] = lifeEngine(c);
  const scores = lifeScore(c);
  const timeline = projectTimeline(c);
  const num = (v: string): number | null => (v.trim() === "" ? null : Number(v));

  return (
    <div className="flex flex-col gap-4">
      {/* شريط أدوات */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setC(readLifeContext())}
          className="t-caption font-black px-3 py-1.5 rounded-lg" style={{ background: "var(--accent)", color: "#fff" }}>
          حمّل ملفي الحقيقي
        </button>
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => setC({ ...BASE, ...p.patch })}
            className="t-caption font-black px-3 py-1.5 rounded-lg"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* لوحتان: التحكّم + ما يعرفه */}
      <div className="grid gap-3 min-[900px]:grid-cols-2">
        {/* عناصر التحكّم — سَندبوكس */}
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>الإشارات (سَندبوكس)</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <Ctrl label="المرحلة">
              <select className={inputCls} style={inputStyle} value={c.stage}
                onChange={(e) => set("stage", e.target.value as LifeContext["stage"])}>
                {["first", "second", "third", "university", "graduate"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Ctrl>
            <Ctrl label="مرحلة جامعية">
              <select className={inputCls} style={inputStyle} value={c.uniStage ?? ""}
                onChange={(e) => set("uniStage", (e.target.value || null) as LifeContext["uniStage"])}>
                {["", "start", "mid", "senior"].map((s) => <option key={s} value={s}>{s || "—"}</option>)}
              </select>
            </Ctrl>
            <Ctrl label="المعدّل (من ٥)">
              <input className={inputCls} style={inputStyle} type="number" step="0.01" min="0" max="5"
                value={c.gpa ?? ""} onChange={(e) => set("gpa", num(e.target.value))} />
            </Ctrl>
            <Ctrl label="الساعات">
              <input className={inputCls} style={inputStyle} type="number" value={c.hours ?? ""}
                onChange={(e) => set("hours", num(e.target.value))} />
            </Ctrl>
            <Ctrl label="أيام اختبارات الجامعة">
              <input className={inputCls} style={inputStyle} type="number" value={c.uniFinalsInDays ?? ""}
                onChange={(e) => set("uniFinalsInDays", num(e.target.value))} />
            </Ctrl>
            <Ctrl label="أيام اختبارات المدرسة">
              <input className={inputCls} style={inputStyle} type="number" value={c.daysToSchoolFinals ?? ""}
                onChange={(e) => set("daysToSchoolFinals", num(e.target.value))} />
            </Ctrl>
            <Ctrl label="أيام القياس">
              <input className={inputCls} style={inputStyle} type="number"
                value={c.qiyas?.days ?? ""}
                onChange={(e) => {
                  const d = num(e.target.value);
                  set("qiyas", d == null ? null : { kind: "qudurat", label: "القدرات العامة", days: d, weeks: Math.ceil(d / 7), approximate: true });
                }} />
            </Ctrl>
            <Ctrl label="التخصص">
              <input className={inputCls} style={inputStyle} type="text" value={c.majorName ?? ""}
                onChange={(e) => set("majorName", e.target.value || null)} />
            </Ctrl>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <label className="flex items-center gap-2 t-caption font-black" style={{ color: "var(--text-dim)" }}>
              <input type="checkbox" checked={c.coopDone} onChange={(e) => set("coopDone", e.target.checked)} /> أنجز التدريب
            </label>
            <label className="flex items-center gap-2 t-caption font-black" style={{ color: "var(--text-dim)" }}>
              <input type="checkbox" checked={c.inSchoolFinals} onChange={(e) => set("inSchoolFinals", e.target.checked)} /> اختبارات مدرسية الآن
            </label>
            <label className="flex items-center gap-2 t-caption font-black" style={{ color: "var(--text-dim)" }}>
              <input type="checkbox" checked={c.inStudyTerm} onChange={(e) => set("inStudyTerm", e.target.checked)} /> داخل الفصل
            </label>
          </div>
        </section>

        {/* ما يعرفه المحرّك */}
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>ما يعرفه المحرّك</h2>
          <div className="flex flex-col">
            <Field k="المرحلة" v={c.stage} />
            <Field k="المرحلة الجامعية" v={c.uniStage ?? "—"} />
            <Field k="السنة" v={c.year ?? "—"} />
            <Field k="المعدّل" v={c.gpa != null ? String(c.gpa) : "—"} />
            <Field k="الساعات" v={c.hours != null ? String(c.hours) : "—"} />
            <Field k="التخصص" v={c.majorName ?? "—"} />
            <Field k="التدريب" v={c.coopDone ? "أنجزه" : "لا يوجد"} />
            <Field k="اختبارات الجامعة" v={c.uniFinalsInDays != null ? `بعد ${c.uniFinalsInDays} يوم` : "—"} />
            <Field k="اختبارات المدرسة" v={c.inSchoolFinals ? "الآن" : c.daysToSchoolFinals != null ? `بعد ${c.daysToSchoolFinals} يوم` : "—"} />
            <Field k="القياس" v={c.qiyas ? `${c.qiyas.label} بعد ${c.qiyas.days} يوم` : "—"} />
            <Field k="داخل الفصل" v={c.inStudyTerm ? "نعم" : "لا"} />
          </div>
        </section>
      </div>

      {/* Life Score + Timeline */}
      <div className="grid gap-3 min-[900px]:grid-cols-2">
        {/* Life Score — أين هو الآن */}
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>Life Score — أين أنت</h2>
          <div className="flex flex-col gap-2.5">
            {scores.map((s) => (
              <div key={s.key} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="t-caption font-black" style={{ color: "var(--text)" }}>{s.label}</span>
                  <span className="t-caption font-black font-mono-nums" style={{ color: "var(--accent-light)" }}>{s.pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: "var(--accent)" }} />
                </div>
                <span className="t-caption" style={{ color: "var(--text-muted)" }}>{s.hint}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline — إلى أين يقود */}
        <section className="ds-card ds-stack-tight">
          <h2 className="t-h3" style={{ color: "var(--text)" }}>Timeline — إلى أين يقودك</h2>
          <div className="flex flex-col">
            {timeline.map((n, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full mt-1.5" style={{ background: i === 0 ? "var(--accent)" : "var(--text-muted)" }} />
                  {i < timeline.length - 1 && <span className="w-px flex-1 my-0.5" style={{ background: "var(--border)" }} />}
                </div>
                <div className="flex flex-col pb-3">
                  <span className="t-caption font-black" style={{ color: i === 0 ? "var(--accent-light)" : "var(--text-muted)" }}>{n.horizon}</span>
                  <span className="t-body font-black" style={{ color: "var(--text)" }}>{n.title}</span>
                  {n.note && <span className="t-caption" style={{ color: "var(--text-muted)" }}>{n.note}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* الأولويات + التفسير الكامل */}
      <section className="ds-card ds-stack-tight">
        <div className="flex items-center gap-2">
          <h2 className="t-h3 flex-1" style={{ color: "var(--text)" }}>الأولويات ({priorities.length})</h2>
          <span className="t-caption" style={{ color: "var(--text-muted)" }}>الثقة = ٤٥ + ٦٫٠× الوزن (مقصوصة ٩٩)</span>
        </div>
        {priorities.length === 0 && <p className="t-caption" style={{ color: "var(--text-muted)" }}>لا أولويات لهذا السياق.</p>}
        {priorities.map((p) => (
          <div key={p.key} className="rounded-xl p-3 flex flex-col gap-2"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            {/* رأس الأولوية */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-full flex items-center justify-center t-caption font-black font-mono-nums flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent-light)" }}>{p.rank}</span>
              <span className="text-[15px]" aria-hidden="true">{p.icon}</span>
              <span className="t-body font-black flex-1" style={{ color: "var(--text)" }}>{p.title}</span>
              <span className="t-caption font-black px-2 py-0.5 rounded-full"
                style={{ background: `color-mix(in srgb, ${TIER_META[p.tier].color} 16%, transparent)`, color: TIER_META[p.tier].color }}>
                {TIER_META[p.tier].label}
              </span>
              <span className="t-caption font-black px-2 py-0.5 rounded-full font-mono-nums"
                style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>
                الثقة {p.confidence}%
              </span>
              <span className="t-caption font-mono-nums px-2 py-0.5 rounded-full"
                style={{ background: "var(--surface)", color: "var(--text-muted)" }}>score {p.score}</span>
              <code className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{p.key}</code>
            </div>

            {/* لماذا؟ (الأسباب) */}
            <div className="flex flex-col gap-1 pr-1">
              <span className="t-caption font-black" style={{ color: "var(--text-muted)" }}>لماذا اختار هذه الأولوية؟</span>
              {p.reasons.map((r, i) => (
                <span key={i} className="t-caption flex gap-1.5" style={{ color: "var(--text-dim)" }}>
                  <span style={{ color: "var(--success)" }} aria-hidden="true">✓</span>{r}
                </span>
              ))}
            </div>

            {/* Rules Fired (القواعد بأوزانها) */}
            <div className="flex flex-col gap-1 pr-1">
              <span className="t-caption font-black" style={{ color: "var(--text-muted)" }}>Rules Fired</span>
              {p.firedRules.map((r) => (
                <div key={r.id} className="flex items-center gap-2 t-caption font-mono-nums" style={{ color: "var(--text-dim)" }}>
                  <code className="px-1.5 py-0.5 rounded" style={{ background: "var(--surface)", color: "var(--accent-light)" }}>Rule {r.id}</code>
                  <span className="flex-1" style={{ fontFamily: "inherit" }}>{r.label}</span>
                  <span className="font-black" style={{ color: "var(--accent)" }}>+{r.weight}</span>
                </div>
              ))}
            </div>

            {/* التكلفة والعائد — كم أدفع؟ وماذا أكسب؟ */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="t-caption font-black px-2 py-0.5 rounded-lg font-mono-nums"
                style={{ background: "var(--surface)", color: "var(--text-dim)" }}>
                💰 التكلفة: {p.costHours > 0 ? `${p.costHours} ساعة` : "مستمر"}
              </span>
              <span className="t-caption" style={{ color: "var(--text-muted)" }}>📈 العائد: <span style={{ color: "var(--text-dim)" }}>{p.payoff}</span></span>
            </div>

            {/* القرار الكامل */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="t-caption" style={{ color: "var(--text-muted)" }}>الفائدة: <span style={{ color: "var(--text-dim)" }}>{p.benefit}</span></span>
              <span className="t-caption" style={{ color: "var(--text-muted)" }}>الوقت: <span style={{ color: "var(--text-dim)" }}>{p.time}</span></span>
              <span className="t-caption" style={{ color: "var(--text-muted)" }}>بعدها: <span style={{ color: "var(--text-dim)" }}>{p.next}</span></span>
              <span className="t-caption" style={{ color: "var(--text-muted)" }}>الوجهة: <code style={{ color: "var(--accent-light)" }}>{p.href}</code></span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
