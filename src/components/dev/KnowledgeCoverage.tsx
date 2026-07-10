"use client";
/* ─── تغطية المعرفة (/dev/coverage) ───
   نضج طبقة المفاهيم قبل بدء الطبقة الثانية: كم مفهوماً مكتمل، وكم ينقصه شرحٌ/أمثلة/
   أسئلة/مصادر. المفاهيم مرتّبةٌ بالأهمية — الصفّ الأعلى هو أوّل ما نملؤه. للمطوّر فقط. */
import { knowledgeCoverage } from "@/lib/kb/entities/content/coverage";
import { KB } from "@/lib/kb/entities";

/* خانة بُعدٍ واحد: ✓ مكتمل · ○ ناقص */
function Slot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="t-caption inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono-nums"
      style={{ background: "var(--surface)", color: ok ? "var(--success)" : "var(--text-muted)" }}>
      {ok ? "✓" : "○"} {label}
    </span>
  );
}

export default function KnowledgeCoverage() {
  const r = knowledgeCoverage(KB);

  return (
    <div className="flex flex-col gap-4">
      {/* خلاصة الاكتمال */}
      <section className="ds-card ds-stack-tight">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="t-h3 flex-1" style={{ color: "var(--text)" }}>نضج طبقة المفاهيم</h2>
          <span className="t-caption font-black px-2.5 py-1 rounded-full font-mono-nums"
            style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-light)" }}>
            {r.complete}/{r.total} مكتملة · {r.pct}%
          </span>
        </div>
        <p className="t-caption" style={{ color: "var(--text-dim)" }}>
          بنينا أماكن المحتوى (تعريف/شرح/أمثلة) وربطناها بالاختبارات. الطبقة الثانية (دروس ← أسئلة ← مصادر ← كتب) تملأ ما يظهر ناقصاً هنا.
        </p>
        <div className="grid grid-cols-2 min-[640px]:grid-cols-5 gap-2">
          {r.slices.map((s) => (
            <div key={s.key} className="rounded-xl px-3 py-2.5 flex flex-col gap-0.5"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <span className="t-caption" style={{ color: "var(--text-muted)" }}>{s.icon} {s.label}</span>
              <span className="t-h3 font-black font-mono-nums"
                style={{ color: s.key === "complete" ? (s.count > 0 ? "var(--success)" : "var(--text-muted)") : "var(--text)" }}>{s.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* المفاهيم حسب الأهمية — أين نبدأ الطبقة الثانية */}
      <section className="ds-card ds-stack-tight">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>المفاهيم حسب الأولوية — الأعلى أوّلاً</h2>
        <div className="flex flex-col gap-1 max-h-[560px] overflow-y-auto pe-1">
          {r.concepts.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              style={{ background: i % 2 ? "transparent" : "var(--surface2)" }}>
              <span className="t-caption font-black font-mono-nums w-6 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
              <span className="t-body font-black min-w-0 flex-1 truncate" style={{ color: c.complete ? "var(--success)" : "var(--text)" }}>{c.name}</span>
              {c.category && <span className="t-caption px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>{c.category}</span>}
              <span className="t-caption font-black font-mono-nums px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-light)" }}>{c.importance}</span>
              <div className="hidden min-[560px]:flex items-center gap-1 flex-shrink-0">
                <Slot ok={c.hasExplanation} label="شرح" />
                <Slot ok={c.hasExamples} label="أمثلة" />
                <Slot ok={c.hasQuestions} label="أسئلة" />
                <Slot ok={c.hasResources} label="مصادر" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
