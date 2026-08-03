"use client";
/* ═══════════ خطّتك عبر الأشهر ═══════════
   «متى أختبر الأول؟ ومتى أُدخل الثاني؟ ومتى أخلص؟» — سؤالٌ يعيش في رأس الطالب
   ولا يجيبه أحد. هذه البطاقة تجيبه من وتيرته هو، لا من متوسّطٍ مخترع.

   ▓ الصدق: لا شيءَ قبل أسبوعٍ من القياس. وما نقوله «جاهزيّتك» لا «موعدُ اختبارك»
     — الموعدُ تُعلنه الجهةُ الرسمية أو يحدّده هو، ولا نخترعه أبداً. */
import { phaseLabel, daysUntilForecast, type StagedPlan, type PlanPhase } from "@/lib/roadmap/examPlan";
import { dateFull, days as arDays, n } from "@/lib/format";

const PHASE_TONE = {
  solo: "var(--accent)",
  overlap: "var(--gold)",
} as const;

export default function ExamPlanTimeline({
  plan, labelOf, pace,
}: {
  plan: StagedPlan;
  labelOf: (id: string) => string;
  pace: { minsPerDay: number; daysMeasured: number };
}) {
  if (!plan.ok) {
    if (plan.reason === "need-two-exams" || plan.reason === "no-work") return null;
    const left = daysUntilForecast(pace);
    return (
      <section className="ds-card ds-stack-tight">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>🗺️ خطّتك عبر الأشهر</h2>
        <p className="t-body leading-relaxed" style={{ color: "var(--text-muted)" }}>
          لن أرسم لك جدولاً لثلاثة أشهرٍ وأنا لا أعرف وتيرتك بعد. ذاكِر
          {left > 0 ? ` ${arDays(left)} ` : " "}
          وسأقيس كم تنجز في اليوم، ثم أقول لك متى تجهز لكلِّ اختبار ومتى تُدخل الثاني.
        </p>
        {pace.daysMeasured > 0 && (
          <p className="t-caption" style={{ color: "var(--text-dim)" }}>
            قِستُ حتى الآن {arDays(pace.daysMeasured)} · متوسّطك {n(pace.minsPerDay)} دقيقة في اليوم.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="ds-card ds-stack-tight">
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>🗺️ خطّتك عبر الأشهر</h2>
        <span className="t-caption" style={{ color: "var(--text-muted)" }}>
          وتيرتك {n(plan.minsPerDay)} د/يوم
        </span>
      </div>
      <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
        تقديرٌ من وتيرتك الحقيقية — يتغيّر كلّما تغيّرت. وهو يومُ{" "}
        <strong style={{ color: "var(--text)" }}>جاهزيتك</strong>، أمّا موعدُ الاختبار
        فتُعلنه الجهةُ الرسمية أو تحدّده أنت.
      </p>

      <div className="flex flex-col gap-2">
        {plan.phases.map((ph, i) => (
          <PhaseRow key={i} phase={ph} labelOf={labelOf} index={i} />
        ))}
      </div>

      <div className="rounded-2xl p-3.5 flex flex-col gap-1.5"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
        <p className="t-caption font-black" style={{ color: "var(--text-dim)" }}>تجهز لكلٍّ منها</p>
        {Object.entries(plan.readyBy).map(([id, d]) => (
          <div key={id} className="flex items-center justify-between gap-2">
            <span className="t-small font-bold" style={{ color: "var(--text)" }}>{labelOf(id)}</span>
            <span className="t-small font-mono-nums" style={{ color: "var(--accent-light)" }}>{dateFull(d, false)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PhaseRow({ phase, labelOf, index }: { phase: PlanPhase; labelOf: (id: string) => string; index: number }) {
  const tone = PHASE_TONE[phase.kind];
  const len = Math.max(1, Math.round((Date.parse(phase.end) - Date.parse(phase.start)) / 86400000) + 1);
  return (
    <div className="rounded-2xl p-3.5 flex items-start gap-3"
      style={{ background: `color-mix(in srgb, ${tone} 8%, var(--surface2))`, border: `1.5px solid color-mix(in srgb, ${tone} 30%, transparent)` }}>
      <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center t-caption font-black font-mono-nums"
        style={{ background: `color-mix(in srgb, ${tone} 18%, transparent)`, color: tone }}>
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="t-body font-black" style={{ color: "var(--text)" }}>
          {phase.kind === "overlap" ? "فترةٌ مشتركة · " : ""}{phaseLabel(phase, labelOf)}
        </p>
        <p className="t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>
          {dateFull(phase.start, false)} — {dateFull(phase.end, false)} · {arDays(len)}
        </p>
        {phase.kind === "overlap" && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {Object.entries(phase.share).map(([id, sh]) => (
              <span key={id} className="t-caption font-bold px-2.5 py-1 rounded-full"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)" }}>
                {labelOf(id)} {n(Math.round(sh * 100))}٪
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
