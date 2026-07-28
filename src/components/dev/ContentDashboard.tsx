"use client";
/* ─── لوحة قيادة المحتوى (/dev/content) ───
   عدد العقد لكل نوع، مجموع العلاقات، ونسبة اكتمال كل مجال. البناء بالدفعات:
   نراقب هنا نموّ المحتوى مجالاً مجالاً بالترتيب الرسمي. للمطوّر فقط. */
import { KB, KIND_META, type EntityKind } from "@/lib/kb/entities";
import { domainProgress, conceptsByImportance, topConcepts } from "@/lib/kb/entities/content/domains";

/* شريط تقدّم نصّي (10 خانات) — كأمثلة المالك */
function bar(pct: number): string {
  const filled = Math.round(pct / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

const KIND_ORDER: EntityKind[] = [
  "goal", "university", "college", "major", "subject", "concept", "course", "lesson", "book", "resource", "question",
  "job", "career_path", "company", "skill", "tool", "ai_tool", "project", "certification", "exam", "exam_session",
];

/* تفصيل مجال (كم مفهوم/درس/سؤال/كتاب/مصدر) — لنعرف أين النقص */
function Breakdown({ c }: { c: { concepts: number; lessons: number; questions: number; books: number; resources: number } }) {
  const cells: [string, number][] = [["📖 مفاهيم", c.concepts], ["📝 دروس", c.lessons], ["❓ أسئلة", c.questions], ["📕 كتب", c.books], ["🎬 مصادر", c.resources]];
  return (
    <div className="flex flex-wrap gap-1.5">
      {cells.map(([label, n]) => (
        <span key={label} className="t-caption font-mono-nums px-2 py-0.5 rounded-full"
          style={{ background: "var(--surface2)", color: n > 0 ? "var(--text-dim)" : "var(--text-muted)" }}>{label} {n}</span>
      ))}
    </div>
  );
}

export default function ContentDashboard() {
  const stats = KB.stats();
  const domains = domainProgress(KB);
  const quduratTiers = conceptsByImportance(KB, "exam:qudurat");
  const top20 = topConcepts(KB, 20);

  return (
    <div className="flex flex-col gap-4">
      {/* أعلى 20 مفهوماً عبر المنصة — أين نركّز المحتوى أولاً */}
      <section className="ds-card ds-stack-tight">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>Top 20 — أعلى المفاهيم أهميةً (كل المنصة)</h2>
        <div className="flex flex-col gap-1">
          {top20.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1"
              style={{ background: i % 2 ? "transparent" : "var(--surface2)" }}>
              <span className="t-caption font-black font-mono-nums w-6 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
              <span className="t-body font-black flex-1 min-w-0" style={{ color: "var(--text)" }}>{c.name}</span>
              {c.category && <span className="t-caption px-2 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>{c.category}</span>}
              {c.examFrequency != null && <span className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>↻{c.examFrequency}</span>}
              <span className="t-caption font-black font-mono-nums px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent-light)" }}>{c.importance}</span>
            </div>
          ))}
        </div>
      </section>
      {/* اكتمال المجالات — لوحة القيادة الأساسية */}
      <section className="ds-card ds-stack-tight">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>اكتمال المجالات (طبقة المفاهيم أولاً)</h2>
        <div className="flex flex-col gap-3">
          {domains.map((d) => (
            <div key={d.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="t-body font-black" style={{ color: "var(--text)" }}>{d.icon} {d.label}</span>
                <span className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{d.actual}/{d.target} · {d.pct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono-nums text-[15px] tracking-tighter" style={{ color: d.pct >= 60 ? "var(--success)" : d.pct >= 25 ? "var(--gold)" : "var(--text-muted)" }}>{bar(d.pct)}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: "var(--accent)" }} />
                </div>
              </div>
              {d.counts && <Breakdown c={d.counts} />}
            </div>
          ))}
        </div>
      </section>

      {/* المفاهيم حسب الأهمية — ماذا يشرح دويرب أولاً */}
      <section className="ds-card ds-stack-tight">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>مفاهيم القدرات حسب الأولوية</h2>
        <div className="flex flex-col gap-2.5">
          {quduratTiers.map((t) => (
            <div key={t.label} className="flex flex-col gap-1">
              <p className="t-caption font-black" style={{ color: "var(--accent-light)" }}>{t.label} · {t.items.length}</p>
              <div className="flex flex-wrap gap-1.5">
                {t.items.map((c) => (
                  <span key={c.id} className="t-caption px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    {c.name}
                    <span className="font-mono-nums" style={{ color: "var(--text-muted)" }}>{c.importance}</span>
                  </span>
                ))}
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
