"use client";
/* ─── مصفوفة التحقّق — 40+ حالة، قرار العقل لكلٍّ (dev) ───
   لكل حالة: الأولوية الأولى + سببها + «لماذا لم يختر غيرها» (البقية بأوزانها).
   نراجع القرارات على حالات حقيقية قبل أي ربط بالمنصة. */
import {
  lifeEngine, type Priority, type Tier, type LifeContext,
} from "@/lib/lifeEngine";
import { SCENARIOS } from "@/lib/lifeEngine.scenarios";

const TIER_META: Record<Tier, { label: string; color: string }> = {
  urgent: { label: "عاجل", color: "var(--danger)" },
  important: { label: "مهم", color: "var(--gold)" },
  strategic: { label: "استراتيجي", color: "var(--accent)" },
};

/* ملخّص مدخلات الحالة بسطر */
function summarize(c: LifeContext): string {
  const bits: string[] = [c.uniStage ? `جامعي/${c.uniStage}` : c.stage];
  if (c.gpa != null) bits.push(`معدّل ${c.gpa}`);
  if (c.hours != null && c.stage === "university") bits.push(`${c.hours}س`);
  if (c.stage === "university") bits.push(c.coopDone ? "تدريب✓" : "بلا تدريب");
  if (c.uniFinalsInDays != null) bits.push(`فاينل ${c.uniFinalsInDays}ي`);
  if (c.inSchoolFinals) bits.push("اختبارات الآن");
  if (c.daysToSchoolFinals != null) bits.push(`اختبارات ${c.daysToSchoolFinals}ي`);
  if (c.qiyas) bits.push(`قياس ${c.qiyas.days}ي`);
  return bits.join(" · ");
}

function Row({ name, ctx }: { name: string; ctx: LifeContext }) {
  const ps: Priority[] = lifeEngine(ctx);
  const top = ps[0];
  const rest = ps.slice(1, 3);
  const tm = TIER_META[top.tier];
  return (
    <div className="rounded-xl p-3 flex flex-col gap-1.5"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderInlineStartWidth: 3, borderInlineStartColor: tm.color }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="t-body font-black flex-1 min-w-0" style={{ color: "var(--text)" }}>{name}</span>
        <span className="t-caption px-2 py-0.5 rounded-full font-black" style={{ background: `color-mix(in srgb, ${tm.color} 16%, transparent)`, color: tm.color }}>{tm.label}</span>
        <span className="t-caption font-black font-mono-nums px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>{top.confidence}%</span>
      </div>
      <p className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{summarize(ctx)}</p>
      <p className="t-body font-black" style={{ color: "var(--accent-light)" }}>▶ {top.title}</p>
      <p className="t-caption" style={{ color: "var(--text-dim)" }}>
        <span className="font-black" style={{ color: "var(--success)" }}>✓ لماذا: </span>{top.reasons.join(" + ")}
      </p>
      <p className="t-caption" style={{ color: "var(--text-muted)" }}>
        <span className="font-black">✗ لم يختر: </span>
        {rest.length ? rest.map((p) => `${p.title} (score ${p.score})`).join(" · ") : "لا منافس"}
      </p>
    </div>
  );
}

export default function ScenarioMatrix() {
  const groups: { title: string; ids: (s: string) => boolean }[] = [
    { title: "الثانوي والخريج", ids: (id) => id.startsWith("s") },
    { title: "الجامعي", ids: (id) => id.startsWith("u") },
    { title: "حالات دقيقة/متطرّفة", ids: (id) => id.startsWith("e") },
  ];
  return (
    <div className="flex flex-col gap-4">
      <p className="t-caption" style={{ color: "var(--text-muted)" }}>
        {SCENARIOS.length} حالة · العاجل دائماً يتصدّر · كل قرار يكشف سببه ومنافسيه بأوزانهم.
      </p>
      {groups.map((g) => {
        const items = SCENARIOS.filter((s) => g.ids(s.id));
        if (!items.length) return null;
        return (
          <section key={g.title} className="flex flex-col gap-2">
            <h2 className="t-h3" style={{ color: "var(--text)" }}>{g.title} ({items.length})</h2>
            <div className="grid gap-2 min-[900px]:grid-cols-2">
              {items.map((s) => <Row key={s.id} name={s.name} ctx={s.ctx} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
