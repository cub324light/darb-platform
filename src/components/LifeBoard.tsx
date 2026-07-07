"use client";
/* ─── لوحة الأولويات — واجهة العقل المركزي (Life Engine) ───
   لا تقرّر هذه اللوحة شيئاً؛ تقرأ فقط من محرّك واحد (lifeEngine) وتعرض أولويات
   الطالب مرتّبة. الأولى بطلٌ كامل القرار (سبب/فائدة/وقت/ماذا بعدها)، والبقية صفٌّ
   مضغوط. إذا تغيّر شيء في حياة الطالب، يتغيّر المحرّك فتتغيّر هذه اللوحة وكل
   الصفحات معها — بلا شروط جديدة هنا. قراءة كسولة واحدة (بلا setState في effect). */
import { useState } from "react";
import Link from "next/link";
import { readLifeContext, lifeEngine, type Priority, type PriorityArea } from "@/lib/lifeEngine";

/* لونٌ بمعنى لكل مجال أولوية */
const AREA_COLOR: Record<PriorityArea, string> = {
  urgent: "var(--danger)",
  gpa: "var(--accent)",
  study: "var(--accent)",
  career: "var(--success)",
  growth: "var(--success)",
  admission: "var(--gold)",
};

/* حقل قرار واحد (سبب/فائدة/وقت/بعدها) */
function DecisionField({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[13px] flex-shrink-0 mt-0.5" aria-hidden="true">{icon}</span>
      <p className="t-caption leading-snug" style={{ color: "var(--text-dim)" }}>
        <span className="font-black" style={{ color: "var(--text-muted)" }}>{label}: </span>
        {value}
      </p>
    </div>
  );
}

/* أولوية ثانوية — صفّ مضغوط يقود لإجرائها */
function PriorityRow({ p }: { p: Priority }) {
  const c = AREA_COLOR[p.area];
  return (
    <Link href={p.href}
      className="ds-card ds-card-tight flex items-center gap-3 text-right no-underline transition active:scale-[0.98]"
      style={{ borderInlineStartWidth: 3, borderInlineStartColor: `color-mix(in srgb, ${c} 55%, transparent)` }}>
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-black flex-shrink-0 font-mono-nums"
        style={{ background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c }}>
        {p.rank}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block t-body font-black" style={{ color: "var(--text)" }}>{p.title}</span>
        <span className="block t-caption" style={{ color: "var(--text-muted)" }}>{p.benefit}</span>
      </span>
      <span className="t-caption px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
        style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>⏱ {p.time}</span>
    </Link>
  );
}

export default function LifeBoard() {
  const [priorities] = useState<Priority[]>(() => lifeEngine(readLifeContext()));
  if (priorities.length === 0) return null;

  const [top, ...rest] = priorities;
  const c = AREA_COLOR[top.area];

  return (
    <div className="mb-3 flex flex-col gap-3 text-right">
      {/* ══ الأولوية الأولى — قرارٌ كامل، لا نص ══ */}
      <section className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3"
        style={{
          background: `linear-gradient(150deg, color-mix(in srgb, ${c} ${top.urgent ? 16 : 11}%, var(--surface)) 0%, var(--surface) 78%)`,
          border: `1px solid color-mix(in srgb, ${c} ${top.urgent ? 40 : 26}%, var(--border))`,
        }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="eyebrow" style={{ color: c }}>
            {top.urgent ? "⏳ " : "✦ "}أولويتك الآن
          </span>
          <span className="t-caption font-black px-2 py-0.5 rounded-full font-mono-nums"
            style={{ background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c }}>
            {priorities.length > 1 ? `١ من ${priorities.length}` : "١"}
          </span>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-[26px] leading-none flex-shrink-0 mt-0.5" aria-hidden="true">{top.icon}</span>
          <h2 className="t-h2 leading-tight flex-1" style={{ color: "var(--text)" }}>{top.title}</h2>
        </div>

        {/* أربعة حقول القرار */}
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <DecisionField icon="🔎" label="السبب" value={top.why} />
          <DecisionField icon="🎯" label="الفائدة" value={top.benefit} />
          <DecisionField icon="⏱" label="الوقت" value={top.time} />
          <DecisionField icon="⏭" label="بعدها" value={top.next} />
        </div>

        <Link href={top.href}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 no-underline font-black transition active:scale-[0.98] self-start"
          style={{
            height: "var(--btn-h)", background: c,
            color: top.area === "admission" ? "#1a1400" : "#fff",
            boxShadow: `0 4px 16px color-mix(in srgb, ${c} 32%, transparent)`,
          }}>
          {top.cta}<span aria-hidden="true">←</span>
        </Link>
      </section>

      {/* ══ بقية أولوياتك — بترتيبها ══ */}
      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="t-caption font-black px-0.5" style={{ color: "var(--text-muted)" }}>ثم في قائمتك:</p>
          {rest.map((p) => <PriorityRow key={p.key} p={p} />)}
        </div>
      )}
    </div>
  );
}
