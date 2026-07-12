"use client";
/* ─── متصفّح قاعدة المعرفة (dev) — يرى البنية وكيف يقرؤها دويرب ───
   يسار: كل الكيانات مجموعة بنوعها. يمين: الكيان المختار — حقوله، وحوافه القابلة
   للنقر (اجتياز الرسم)، ثم «كما يقرؤها دويرب» (نصّ describe الحرفي). للمراجعة فقط. */
import { useState } from "react";
import { KB, KIND_META, RELATION_LABEL, type EntityKind, type KBEntity } from "@/lib/kb/entities";

const KIND_ORDER: EntityKind[] = [
  "university", "college", "major", "subject", "concept", "course", "lesson", "book", "resource", "question",
  "job", "career_path", "company", "skill", "tool", "ai_tool", "project", "certification", "exam", "exam_session", "goal",
];

export default function KBBrowser() {
  const [id, setId] = useState<string>(() => "job:power-systems-engineer");
  const entity: KBEntity | undefined = KB.get(id);
  const edges = KB.edges(id);
  const errors = KB.validate();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="t-caption font-black px-2.5 py-1 rounded-full"
          style={{ background: `color-mix(in srgb, var(--${errors.length ? "danger" : "success"}) 15%, transparent)`, color: `var(--${errors.length ? "danger" : "success"})` }}>
          {errors.length ? `${errors.length} خطأ بنيوي` : "البنية سليمة ✓"}
        </span>
        <span className="t-caption" style={{ color: "var(--text-muted)" }}>{KB.count()} كياناً · {KIND_ORDER.length} أنواع</span>
      </div>

      <div className="grid gap-3 min-[900px]:grid-cols-[300px_1fr]">
        {/* قائمة الكيانات مجموعة بالنوع */}
        <section className="ds-card ds-stack-tight" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {KIND_ORDER.map((k) => {
            const items = KB.all(k);
            if (!items.length) return null;
            return (
              <div key={k} className="flex flex-col gap-1">
                <p className="t-caption font-black" style={{ color: "var(--text-muted)" }}>{KIND_META[k].icon} {KIND_META[k].label} ({items.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((e) => (
                    <button key={e.id} onClick={() => setId(e.id)}
                      className="t-caption px-2.5 py-1 rounded-lg transition active:scale-95"
                      style={{
                        background: e.id === id ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--surface2)",
                        border: `1px solid ${e.id === id ? "color-mix(in srgb, var(--accent) 50%, transparent)" : "var(--border)"}`,
                        color: e.id === id ? "var(--accent-light)" : "var(--text)",
                      }}>
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* الكيان المختار */}
        <section className="flex flex-col gap-3">
          {entity && (
            <div className="ds-card ds-stack-tight">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[23px]" aria-hidden="true">{KIND_META[entity.kind].icon}</span>
                <h2 className="t-h2 flex-1" style={{ color: "var(--text)" }}>{entity.name}</h2>
                <code className="t-caption font-mono-nums" style={{ color: "var(--text-muted)" }}>{entity.id}</code>
              </div>
              <p className="t-body" style={{ color: "var(--text-dim)" }}>{entity.summary}</p>
              {entity.description && <p className="t-caption" style={{ color: "var(--text-muted)" }}>{entity.description}</p>}

              {/* الحواف — قابلة للنقر (اجتياز) */}
              <div className="flex flex-col gap-1.5">
                <p className="t-caption font-black" style={{ color: "var(--text-muted)" }}>الروابط ({edges.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {edges.map((e, i) => (
                    <button key={i} onClick={() => setId(e.entity.id)}
                      className="t-caption px-2.5 py-1.5 rounded-lg text-right transition active:scale-95 flex items-center gap-1.5"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                      <span style={{ color: "var(--text-muted)" }}>{RELATION_LABEL[e.type]}{e.dir === "in" ? " ↩" : ""}</span>
                      <span className="font-black">{KIND_META[e.entity.kind].icon} {e.entity.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* كما يقرؤها دويرب */}
          <div className="ds-card ds-stack-tight">
            <p className="t-caption font-black" style={{ color: "var(--text-muted)" }}>🤖 كما يقرؤها دويرب (describe)</p>
            <pre className="t-caption whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-dim)", fontFamily: "inherit" }}>
              {KB.describe(id)}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
