"use client";
/* ─── فهرس الدروس + بحثٌ في المعرفة (/lesson) ───
   يعرض الدروس المتاحة، ويبحث في نموذج العالم كلّه: لو طابق البحثُ مفهوماً له درسٌ
   يُدرّسه، قاد الطالبَ للدرس مباشرة؛ ولو كان المفهوم بلا درسٍ بعد أظهرناه بصدق
   («قريباً»). هكذا يظهر الدرس في البحث فعلاً — من الرسم لا من قائمةٍ ثابتة. */
import { useState, useMemo } from "react";
import Link from "next/link";
import { KB } from "@/lib/kb/entities";

interface Hit { lessonId: string | null; title: string; concept?: string; }
const slug = (id: string) => id.replace(/^lesson:/, "");

/* يحوّل نتيجة بحثٍ (درس أو مفهوم) إلى وجهةٍ للطالب */
function toHit(id: string): Hit | null {
  const e = KB.get(id);
  if (!e) return null;
  if (e.kind === "lesson") {
    const c = KB.neighbors(e.id, { type: "teaches", dir: "out", kind: "concept" })[0];
    return { lessonId: e.id, title: e.name, concept: c?.name };
  }
  if (e.kind === "concept") {
    const lesson = KB.neighbors(e.id, { type: "teaches", dir: "in", kind: "lesson" })[0];
    return { lessonId: lesson?.id ?? null, title: lesson?.name ?? e.name, concept: e.name };
  }
  return null;
}

export default function LessonBrowser() {
  const [q, setQ] = useState("");
  const lessons = useMemo(() => KB.all("lesson").map((l) => ({ id: l.id, name: l.name, summary: l.summary, min: l.kind === "lesson" ? l.durationMin : undefined })), []);

  const results = useMemo<Hit[]>(() => {
    const query = q.trim();
    if (!query) return [];
    const seen = new Set<string>();
    const hits: Hit[] = [];
    for (const e of KB.search(query, 12)) {
      if (e.kind !== "lesson" && e.kind !== "concept") continue;
      const h = toHit(e.id);
      if (!h) continue;
      const key = h.lessonId ?? `concept:${h.concept}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push(h);
    }
    return hits;
  }, [q]);

  return (
    <div className="flex flex-col gap-3">
      <div className="ds-card ds-stack-tight">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن درس أو مفهوم… (مثل: قانون أوم)"
          className="w-full rounded-xl px-4 py-3 t-body outline-none"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        {q.trim() && (
          <div className="flex flex-col gap-2 mt-1">
            {results.length === 0 && <p className="t-caption" style={{ color: "var(--text-muted)" }}>لا نتائج.</p>}
            {results.map((h, i) => h.lessonId ? (
              <Link key={i} href={`/lesson/${slug(h.lessonId)}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition hover:brightness-110" style={{ background: "var(--surface2)" }}>
                <span style={{ fontSize: "1.1rem" }}>📝</span>
                <span className="t-body font-black flex-1 min-w-0" style={{ color: "var(--text)" }}>{h.title}</span>
                <span className="t-caption" style={{ color: "var(--accent-light)" }}>افتح الدرس ↗</span>
              </Link>
            ) : (
              <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)", opacity: 0.7 }}>
                <span style={{ fontSize: "1.1rem" }}>💡</span>
                <span className="t-body font-black flex-1 min-w-0" style={{ color: "var(--text-dim)" }}>{h.concept}</span>
                <span className="t-caption" style={{ color: "var(--text-muted)" }}>لا يوجد درس بعد</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* الدروس المتاحة */}
      <section className="ds-card ds-stack-tight">
        <h2 className="t-h3" style={{ color: "var(--text)" }}>الدروس المتاحة</h2>
        <div className="flex flex-col gap-2">
          {lessons.map((l) => (
            <Link key={l.id} href={`/lesson/${slug(l.id)}`} className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition hover:brightness-110" style={{ background: "var(--surface2)" }}>
              <span style={{ fontSize: "1.1rem" }}>📝</span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="t-body font-black" style={{ color: "var(--text)" }}>{l.name}</span>
                <span className="t-caption" style={{ color: "var(--text-muted)" }}>{l.summary}</span>
              </div>
              {l.min && <span className="t-caption flex-shrink-0" style={{ color: "var(--text-muted)" }}>⏱ {l.min}د</span>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
