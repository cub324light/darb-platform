"use client";
/* ─── لوحة قيادة المحتوى (/dev/content) ───
   عدد العقد لكل نوع، مجموع العلاقات، ونسبة اكتمال كل مجال. البناء بالدفعات:
   نراقب هنا نموّ المحتوى مجالاً مجالاً بالترتيب الرسمي. للمطوّر فقط. */
import { KB, KIND_META, type EntityKind } from "@/lib/kb/entities";
import { domainProgress } from "@/lib/kb/entities/content/domains";

/* شريط تقدّم نصّي (١٠ خانات) — كأمثلة المالك */
function bar(pct: number): string {
  const filled = Math.round(pct / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

const KIND_ORDER: EntityKind[] = [
  "goal", "university", "college", "major", "subject", "concept", "course", "lesson", "book", "resource", "question",
  "job", "career_path", "company", "skill", "tool", "ai_tool", "project", "certification", "exam", "exam_session",
];

export default function ContentDashboard() {
  const stats = KB.stats();
  const domains = domainProgress(KB);

  return (
    <div className="flex flex-col gap-4">
      {/* اكتمال المجالات — لوحة القيادة الأساسية */}
      <section className="ds-card ds-stack-tight">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>اكتمال المجالات</h2>
        <div className="flex flex-col gap-2.5">
          {domains.map((d) => (
            <div key={d.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="t-body font-black" style={{ color: "var(--text)" }}>{d.icon} {d.label}</span>
                <span className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{d.actual}/{d.target} · {d.pct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono-nums text-[13px] tracking-tighter" style={{ color: d.pct >= 60 ? "var(--success)" : d.pct >= 25 ? "var(--gold)" : "var(--text-muted)" }}>{bar(d.pct)}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: "var(--accent)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* أعداد العقد + العلاقات */}
      <section className="ds-card ds-stack-tight">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="t-h3 flex-1" style={{ color: "var(--text)" }}>عدد العقد</h2>
          <span className="t-caption font-black px-2.5 py-1 rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-light)" }}>
            {stats.total} عقدة · {stats.relations} علاقة
          </span>
        </div>
        <div className="grid grid-cols-2 min-[700px]:grid-cols-3 gap-2">
          {KIND_ORDER.map((k) => (
            <div key={k} className="rounded-xl px-3 py-2 flex items-center justify-between gap-2"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <span className="t-caption" style={{ color: "var(--text-muted)" }}>{KIND_META[k].icon} {KIND_META[k].label}</span>
              <span className="t-body font-black font-mono-nums" style={{ color: (stats.byKind[k] ?? 0) > 0 ? "var(--text)" : "var(--text-muted)" }}>{stats.byKind[k] ?? 0}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
