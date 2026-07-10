"use client";
/* ─── نموذج العالم — المستكشف الكامل (dev) ───
   لكل عقدة: العلاقات الخارجة، الداخلة، أين تُستخدَم، ومن يعتمد عليها — مع نسختها
   (meta) و«كما يقرؤها دويرب». عليها تُبنى كل ميزة مستقبلية. الرسم هو الحقيقة. */
import { useState } from "react";
import {
  KB, KIND_META, RELATION_LABEL, type EntityKind, type RelationType, type ResolvedEdge,
} from "@/lib/kb/entities";

const KIND_ORDER: EntityKind[] = [
  "goal", "university", "college", "major", "subject", "concept", "course", "lesson", "book", "resource", "question",
  "job", "career_path", "company", "skill", "tool", "ai_tool", "project", "certification", "exam", "exam_session",
];
const USE_TYPES: RelationType[] = ["uses", "used_in"];
const DEP_TYPES: RelationType[] = ["requires", "depends_on", "prerequisite"];

function EdgeChip({ e, onGo }: { e: ResolvedEdge; onGo: (id: string) => void }) {
  return (
    <button onClick={() => onGo(e.entity.id)}
      className="t-caption px-2.5 py-1.5 rounded-lg text-right transition active:scale-95 flex items-center gap-1.5"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
      <span style={{ color: "var(--text-muted)" }}>{RELATION_LABEL[e.type]}{e.dir === "in" ? " ↩" : ""}</span>
      <span className="font-black">{KIND_META[e.entity.kind].icon} {e.entity.name}</span>
    </button>
  );
}
function EdgeGroup({ title, edges, onGo }: { title: string; edges: ResolvedEdge[]; onGo: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="t-caption font-black" style={{ color: "var(--text-muted)" }}>{title} ({edges.length})</p>
      {edges.length ? (
        <div className="flex flex-wrap gap-1.5">{edges.map((e, i) => <EdgeChip key={i} e={e} onGo={onGo} />)}</div>
      ) : <p className="t-caption" style={{ color: "var(--text-muted)" }}>—</p>}
    </div>
  );
}

export default function WorldGraph() {
  const [id, setId] = useState<string>(() => "goal:enter-ee");
  const [q, setQ] = useState("");
  const entity = KB.get(id);
  const errors = KB.validate();
  const edges = KB.edges(id);
  const out = edges.filter((e) => e.dir === "out");
  const inc = edges.filter((e) => e.dir === "in");
  const usedBy = inc.filter((e) => USE_TYPES.includes(e.type));
  const dependents = inc.filter((e) => DEP_TYPES.includes(e.type));
  const meta = KB.meta(id);
  const results = q.trim() ? KB.search(q, 12) : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="t-caption font-black px-2.5 py-1 rounded-full"
          style={{ background: `color-mix(in srgb, var(--${errors.length ? "danger" : "success"}) 15%, transparent)`, color: `var(--${errors.length ? "danger" : "success"})` }}>
          {errors.length ? `${errors.length} خطأ بنيوي` : "الرسم سليم ✓"}
        </span>
        <span className="t-caption" style={{ color: "var(--text-muted)" }}>{KB.count()} عقدة · {KIND_ORDER.length} أنواع</span>
      </div>

      <div className="grid gap-3 min-[900px]:grid-cols-[300px_1fr]">
        {/* قائمة العقد + بحث */}
        <section className="ds-card ds-stack-tight" style={{ maxHeight: "76vh", overflowY: "auto" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن عقدة…"
            className="rounded-lg px-2.5 py-1.5 t-caption font-black"
            style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)" }} />
          {q.trim() ? (
            <div className="flex flex-wrap gap-1.5">
              {results.length ? results.map((e) => (
                <button key={e.id} onClick={() => setId(e.id)} className="t-caption px-2.5 py-1 rounded-lg"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  {KIND_META[e.kind].icon} {e.name}
                </button>
              )) : <p className="t-caption" style={{ color: "var(--text-muted)" }}>لا نتائج</p>}
            </div>
          ) : KIND_ORDER.map((k) => {
            const items = KB.all(k);
            if (!items.length) return null;
            return (
              <div key={k} className="flex flex-col gap-1">
                <p className="t-caption font-black" style={{ color: "var(--text-muted)" }}>{KIND_META[k].icon} {KIND_META[k].label} ({items.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((e) => (
                    <button key={e.id} onClick={() => setId(e.id)} className="t-caption px-2.5 py-1 rounded-lg transition active:scale-95"
                      style={{
                        background: e.id === id ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--surface2)",
                        border: `1px solid ${e.id === id ? "color-mix(in srgb, var(--accent) 50%, transparent)" : "var(--border)"}`,
                        color: e.id === id ? "var(--accent-light)" : "var(--text)",
                      }}>{e.name}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* تفاصيل العقدة */}
        <section className="flex flex-col gap-3">
          {entity && (
            <div className="ds-card ds-stack-tight">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[20px]" aria-hidden="true">{KIND_META[entity.kind].icon}</span>
                <h2 className="t-h2 flex-1" style={{ color: "var(--text)" }}>{entity.name}</h2>
                <code className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{entity.id}</code>
              </div>
              <p className="t-body" style={{ color: "var(--text-dim)" }}>{entity.summary}</p>
              {/* النسخنة */}
              <div className="flex flex-wrap gap-2">
                <span className="t-caption font-mono-nums px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>v{meta.version}</span>
                <span className="t-caption font-mono-nums px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>محدّث {meta.lastUpdated}</span>
                {meta.confidence != null && <span className="t-caption font-mono-nums px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>ثقة {Math.round(meta.confidence * 100)}%</span>}
                {meta.source && <span className="t-caption px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>مصدر: {meta.source}</span>}
              </div>

              <EdgeGroup title="⬅ العلاقات الخارجة" edges={out} onGo={setId} />
              <EdgeGroup title="➡ العلاقات الداخلة" edges={inc} onGo={setId} />
              <EdgeGroup title="🔧 أين تُستخدَم" edges={usedBy} onGo={setId} />
              <EdgeGroup title="⚓ من يعتمد عليها" edges={dependents} onGo={setId} />
            </div>
          )}
          <div className="ds-card ds-stack-tight">
            <p className="t-caption font-black" style={{ color: "var(--text-muted)" }}>🤖 كما يقرؤها دويرب (نصٌّ مُشتقّ من الرسم)</p>
            <pre className="t-caption whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-dim)", fontFamily: "inherit" }}>{KB.describe(id)}</pre>
          </div>
        </section>
      </div>
    </div>
  );
}
