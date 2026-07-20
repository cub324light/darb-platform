"use client";
/* ─── خط رحلة الطالب (Progress Journey) — عرضٌ بصريٌّ فقط ───
   يعرض مراحل رحلة القياس/القبول ويضيء ما وصل إليه الطالب. المرحلة الحالية تُحسَب في
   صفحة مساري من بياناتٍ قائمة (لا منطق جديد ولا حقول جديدة): onboarded · تقدّم الوحدات ·
   الدرجات المسجّلة · بانتظار النتيجة · الدرجات المعتمدة. مكوّنٌ تقديميٌّ بحت. */

export const JOURNEY_STAGES = [
  { key: "start", short: "بدأت", icon: "🚩" },
  { key: "study", short: "تذاكر", icon: "📚" },
  { key: "exam", short: "اختبرت", icon: "✍️" },
  { key: "result", short: "النتيجة", icon: "⏳" },
  { key: "apply", short: "التقديم", icon: "🎯" },
  { key: "admitted", short: "القبول", icon: "🎓" },
] as const;

const FULL_LABEL: Record<string, string> = {
  start: "بدأت رحلتك", study: "تذاكر الآن", exam: "اختبرت", result: "بانتظار النتيجة",
  apply: "جاهز للتقديم", admitted: "تم القبول",
};

export default function JourneyTimeline({ stage }: { stage: number }) {
  const n = JOURNEY_STAGES.length;
  const cur = Math.max(0, Math.min(stage, n - 1));
  const fillPct = n > 1 ? (cur / (n - 1)) * 100 : 0;
  const next = cur < n - 1 ? JOURNEY_STAGES[cur + 1] : null;

  return (
    <section>
      <p className="eyebrow mb-2.5 px-1">🧭 رحلتك</p>
      <div className="rounded-2xl p-4 pt-5" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
        {/* المسار + النقاط */}
        <div className="relative">
          {/* الخط الخلفي (RTL: يبدأ من اليمين) */}
          <div className="absolute inset-x-1 rounded-full" style={{ top: 17, height: 4, background: "var(--border)" }} aria-hidden />
          <div className="absolute rounded-full" style={{ top: 17, height: 4, right: 4, width: `calc(${fillPct}% - 8px)`, background: "var(--success)" }} aria-hidden />
          <div className="relative flex justify-between">
            {JOURNEY_STAGES.map((s, i) => {
              const done = i < cur, current = i === cur;
              return (
                <div key={s.key} className="flex flex-col items-center gap-1.5" style={{ width: 54 }}>
                  <div className="rounded-full flex items-center justify-center flex-shrink-0 transition"
                    style={{
                      width: current ? 38 : 30, height: current ? 38 : 30,
                      background: done ? "var(--success)" : current ? "var(--accent)" : "var(--surface2)",
                      color: done || current ? "#fff" : "var(--text-muted)",
                      fontSize: current ? 17 : 13,
                      boxShadow: current ? "0 0 0 5px color-mix(in srgb, var(--accent) 22%, transparent)" : "none",
                      border: done || current ? "none" : "1.5px solid var(--border)",
                    }}>
                    {done ? "✓" : s.icon}
                  </div>
                  <span className="t-caption font-bold text-center leading-tight"
                    style={{ color: current ? "var(--accent-light)" : done ? "var(--text)" : "var(--text-muted)" }}>{s.short}</span>
                </div>
              );
            })}
          </div>
        </div>
        {/* أنت الآن + التالية */}
        <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="t-caption font-bold px-2.5 py-1 rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-light)" }}>
            أنت الآن: {FULL_LABEL[JOURNEY_STAGES[cur].key]}
          </span>
          {next && <span className="t-caption" style={{ color: "var(--text-muted)" }}>التالية: {FULL_LABEL[next.key]} ←</span>}
        </div>
      </div>
    </section>
  );
}
