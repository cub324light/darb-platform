"use client";
/* ═══════════ 📚 مصادري — مصادر مادةٍ واحدة داخل فضاء المذاكرة ═══════════
   الطالب لا يذاكر «لفظي» مجرّدةً، بل يذاكر من مصدر: دورةٌ أو كتاب. هنا يضيف مصدره
   (جاهزاً من كتالوج المنصّة أو خاصّاً به)، ويقسّمه أقساماً، ويشطب قسماً قسماً — فيرى
   موضعه بالضبط لا نسبةً غامضة. كل الحساب في `lib/roadmap/sources.ts` النقيّ. */
import { useState } from "react";
import {
  sourceProgress, sourcesProgress, toggleSection, buildSource, unitLabel,
  type StudySource, type SourceKind,
} from "@/lib/roadmap/sources";
import { loadSources, sourcesFor, addSource, updateSource, removeSource } from "@/lib/roadmap/sourceStore";
import { catalogFor, type CatalogSource } from "@/lib/sourceCatalog";
import { n, pct } from "@/lib/format";

const DEFAULT_SECTIONS = 4;

export default function SubjectSources({ subject, examKey, color }: {
  subject: string; examKey?: string; color: string;
}) {
  const [all, setAll] = useState<StudySource[]>(() => (typeof window !== "undefined" ? loadSources() : []));
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const mine = sourcesFor(examKey ?? "", subject, all).filter(() => !!examKey);
  const total = sourcesProgress(mine);

  const apply = (next: StudySource[]) => setAll(next);
  const onToggle = (src: StudySource, sectionId: string) => apply(updateSource(src.id, toggleSection(src, sectionId)));

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <p className="eyebrow flex-1" style={{ color: "var(--text)" }}>📚 مصادري</p>
        {total.total > 0 && (
          <span className="t-caption font-black font-mono-nums" style={{ color }}>
            {n(total.done)} من {n(total.total)} — {pct(total.pct)}
          </span>
        )}
      </div>

      {mine.length === 0 ? (
        <p className="t-caption leading-relaxed" style={{ color: "var(--text-muted)" }}>
          أضِف المصدر الذي تذاكر منه — دورةً أو كتاباً — ونقسّمه لك أقساماً تتابع تقدّمك فيها.
        </p>
      ) : (
        mine.map((src) => {
          const p = sourceProgress(src);
          const isOpen = open === src.id;
          return (
            <div key={src.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>
              <button onClick={() => setOpen(isOpen ? null : src.id)} className="w-full p-4 text-right flex items-center gap-3">
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="t-body font-black truncate" style={{ color: "var(--text)" }}>{src.name}</span>
                    {src.builtin && (
                      <span className="t-caption font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>جاهز</span>
                    )}
                  </span>
                  <span className="block t-caption mt-1 font-mono-nums" style={{ color: "var(--text-muted)" }}>
                    {n(p.done)} من {n(p.total)} {unitLabel(src.kind, p.total)} — {pct(p.pct)}
                  </span>
                  <span className="block h-2 rounded-full overflow-hidden mt-2" style={{ background: "color-mix(in srgb, var(--text-muted) 20%, transparent)" }}>
                    <span className="block h-full rounded-full" style={{ width: `${p.pct}%`, background: color }} />
                  </span>
                </span>
                <span className="t-caption flex-shrink-0" style={{ color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 flex flex-col gap-2">
                  {src.sections.map((sec) => {
                    const full = sec.done >= sec.units;
                    return (
                      <button key={sec.id} onClick={() => onToggle(src, sec.id)}
                        className="rounded-xl px-3 py-2.5 flex items-center gap-3 text-right transition active:scale-[0.99]"
                        style={{ background: full ? `color-mix(in srgb, ${color} 10%, transparent)` : "var(--surface2)",
                                 border: `1.5px solid ${full ? `color-mix(in srgb, ${color} 40%, transparent)` : "var(--border)"}` }}>
                        <span className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0"
                          style={full ? { background: color } : { border: "2px solid var(--border)" }}>
                          {full && <span className="text-white t-caption font-black">✓</span>}
                        </span>
                        <span className="flex-1 min-w-0 t-body font-bold" style={{ color: full ? "var(--text-muted)" : "var(--text)" }}>{sec.title}</span>
                        <span className="t-caption font-mono-nums flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                          {n(sec.units)} {unitLabel(src.kind, sec.units)}
                        </span>
                      </button>
                    );
                  })}
                  <button onClick={() => { apply(removeSource(src.id)); setOpen(null); }}
                    className="t-caption font-bold self-start mt-1" style={{ color: "var(--danger)" }}>حذف المصدر</button>
                </div>
              )}
            </div>
          );
        })
      )}

      <button onClick={() => setAdding(true)} className="rounded-2xl py-3 t-body font-black transition active:scale-[0.98]"
        style={{ background: "transparent", border: `1.5px dashed ${color}`, color }}>
        ＋ أضف مصدر
      </button>

      {adding && examKey && (
        <AddSourceSheet subject={subject} examKey={examKey} color={color}
          onClose={() => setAdding(false)}
          onAdd={(src) => { apply(addSource(src)); setAdding(false); setOpen(src.id); }} />
      )}
    </section>
  );
}

/* ورقةٌ سفليّة: اختر جاهزاً من الكتالوج أو أضِف مصدرك. العدد يسأله الطالب دائماً —
   أعداد الحلقات تتغيّر كل موسم ولا نملك مصدراً موثّقاً لها، فلا نملأها من عندنا. */
function AddSourceSheet({ subject, examKey, color, onClose, onAdd }: {
  subject: string; examKey: string; color: string;
  onClose: () => void; onAdd: (s: StudySource) => void;
}) {
  const catalog = catalogFor(examKey, subject);
  const [picked, setPicked] = useState<CatalogSource | null>(null);
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SourceKind>("video");
  const [units, setUnits] = useState("");
  const [sections, setSections] = useState(String(DEFAULT_SECTIONS));

  const chosenName = picked ? picked.name : name.trim();
  const unitsNum = Number(units);
  const sectionsNum = Number(sections);
  const valid = chosenName.length > 0 && Number.isFinite(unitsNum) && unitsNum > 0 && sectionsNum >= 1;

  const submit = () => {
    if (!valid) return;
    onAdd(buildSource({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      examId: examKey, subject, name: chosenName, kind,
      totalUnits: unitsNum, sectionCount: sectionsNum, builtin: !!picked,
    }));
  };

  const pick = (c: CatalogSource) => { setPicked(c); setCustom(false); setKind(c.kind); if (c.totalUnits) setUnits(String(c.totalUnits)); };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 rise max-h-[86dvh] overflow-y-auto"
        style={{ background: "var(--surface)", borderTop: "1.5px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
        <p className="t-title font-black text-center" style={{ color: "var(--text)" }}>مصدرٌ جديد في {subject}</p>
        <p className="t-caption text-center mt-1 mb-4" style={{ color: "var(--text-muted)" }}>اختر جاهزاً أو أضِف مصدرك الخاصّ.</p>

        {catalog.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {catalog.map((c) => {
              const on = picked?.id === c.id;
              return (
                <button key={c.id} onClick={() => pick(c)}
                  className="rounded-xl px-4 py-3 text-right transition active:scale-[0.99]"
                  style={{ background: on ? `color-mix(in srgb, ${color} 12%, transparent)` : "var(--surface2)",
                           border: `1.5px solid ${on ? color : "var(--border)"}` }}>
                  <span className="block t-body font-black" style={{ color: "var(--text)" }}>{c.name}</span>
                  <span className="block t-caption mt-0.5" style={{ color: "var(--text-muted)" }}>{c.desc}</span>
                </button>
              );
            })}
          </div>
        )}

        <button onClick={() => { setCustom(true); setPicked(null); }}
          className="w-full rounded-xl px-4 py-3 t-body font-bold text-right mb-3"
          style={{ background: custom ? `color-mix(in srgb, ${color} 12%, transparent)` : "var(--surface2)",
                   border: `1.5px solid ${custom ? color : "var(--border)"}`, color: "var(--text)" }}>
          ✏️ مصدرٌ خاصٌّ بي
        </button>

        {custom && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المصدر (دورة أو كتاب)..."
            className="w-full rounded-2xl px-4 py-3 t-body outline-none min-h-[52px] mb-3"
            style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
        )}

        {(picked || custom) && (
          <>
            <p className="t-caption font-bold mb-2" style={{ color: "var(--text-dim)" }}>نوع الوحدة</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(["video", "pages"] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)} className="rounded-xl py-2.5 t-body font-bold"
                  style={{ background: kind === k ? color : "var(--surface2)", color: kind === k ? "#fff" : "var(--text)",
                           border: `1.5px solid ${kind === k ? color : "var(--border)"}` }}>
                  {k === "video" ? "🎬 فيديوهات" : "📄 صفحات"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <label className="flex flex-col gap-1.5">
                <span className="t-caption font-bold" style={{ color: "var(--text-dim)" }}>العدد الكلّي</span>
                <input value={units} onChange={(e) => setUnits(e.target.value.replace(/\D/g, ""))} inputMode="numeric"
                  placeholder={kind === "video" ? "كم فيديو؟" : "كم صفحة؟"}
                  className="rounded-xl px-3 py-2.5 t-body outline-none min-h-[48px] font-mono-nums"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="t-caption font-bold" style={{ color: "var(--text-dim)" }}>عدد الأقسام</span>
                <input value={sections} onChange={(e) => setSections(e.target.value.replace(/\D/g, ""))} inputMode="numeric"
                  className="rounded-xl px-3 py-2.5 t-body outline-none min-h-[48px] font-mono-nums"
                  style={{ background: "var(--surface2)", border: "1.5px solid var(--border)", color: "var(--text)" }} />
              </label>
            </div>
          </>
        )}

        <button onClick={submit} disabled={!valid}
          className="w-full rounded-2xl py-4 t-body font-black transition active:scale-[0.98]"
          style={{ background: valid ? color : "var(--surface2)", color: valid ? "#fff" : "var(--text-muted)", border: "none" }}>
          أضِف المصدر
        </button>
        <button onClick={onClose} className="w-full mt-2 py-3 t-body font-bold" style={{ color: "var(--text-muted)" }}>تراجع</button>
      </div>
    </div>
  );
}
