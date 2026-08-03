"use client";
/* ═══════════ تخصيصُ الصفحة — رتّبها كما تريدها ═══════════
   كان «تخصيص» في الرئيسية وحدها، ثم ضاع في إعادة تنظيمها وبقيت الإعداداتُ تَعِد
   بزرٍّ لا وجود له. رجع — و**لكلّ صفحة** لا للرئيسية فقط.

   ▓ لماذا سهمان لا سحب؟ السحبُ على الجوّال يتنازع مع تمرير الصفحة، ويحتاج لمسةً
     مطوّلةً لا يكتشفها أحد. سهمٌ فوق وسهمٌ تحت يفهمهما الطالبُ من أوّل نظرة
     ويعملان بالكيبورد وبقارئ الشاشة.

   ▓ التركيزُ وأخطائي خارج هذا عمداً: الأولُ شاشةُ مؤقّتٍ لا أقسامَ فيها،
     والثاني سجلٌّ ترتيبُه زمنيٌّ لا رأيَ للطالب فيه. */
import { useState, type ReactNode } from "react";
import Sheet from "@/components/Sheet";
import { moveSection, toggleSection, hiddenCount, isCustomized, type SectionDef } from "@/lib/pageLayout";
import { useLayout, saveLayout, resetLayout } from "@/lib/pageLayoutStore";
import { n } from "@/lib/format";

export interface PageSection extends SectionDef {
  node: ReactNode;
}

export default function Customizable({
  page, sections, className,
}: {
  /** مفتاحُ الصفحة في التخزين — ثابتٌ لا يتغيّر (`school`، `dashboard`…). */
  page: string;
  sections: PageSection[];
  className?: string;
}) {
  const defs: SectionDef[] = sections.map(({ id, label, desc, fixed }) => ({ id, label, desc, fixed }));
  const layout = useLayout(page, defs);
  const [open, setOpen] = useState(false);
  const byId = new Map(sections.map((s) => [s.id, s]));
  const hidden = hiddenCount(layout);

  return (
    <div className={className ?? "flex flex-col gap-3"}>
      <div className="flex items-center justify-end gap-2 px-0.5">
        {hidden > 0 && (
          <span className="t-caption" style={{ color: "var(--text-muted)" }}>
            {hidden === 1 ? "قسمٌ مخفيّ" : hidden === 2 ? "قسمان مخفيّان" : `${n(hidden)} أقسامٍ مخفيّة`}
          </span>
        )}
        <button onClick={() => setOpen(true)}
          className="t-caption font-black px-3 py-1.5 rounded-xl transition active:scale-95"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          ✥ تخصيص
        </button>
      </div>

      {layout.map((s) => {
        if (!s.visible) return null;
        const sec = byId.get(s.id);
        return sec ? <div key={s.id}>{sec.node}</div> : null;
      })}

      {open && (
        <Sheet onClose={() => setOpen(false)} title="تخصيص الصفحة">
          <div className="flex flex-col gap-2">
            <p className="t-caption leading-relaxed px-1" style={{ color: "var(--text-muted)" }}>
              رتّب أقسام الصفحة كما تريدها، وأطفئ ما لا يعنيك. قرارُك محفوظٌ في جهازك، ولا يحذف شيئاً — تُرجعه متى شئت.
            </p>

            {layout.map((s, i) => {
              const sec = byId.get(s.id);
              if (!sec) return null;
              const first = i === 0, last = i === layout.length - 1;
              return (
                <div key={s.id} className="rounded-2xl px-3 py-2.5 flex items-center gap-2"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", opacity: s.visible ? 1 : 0.55 }}>
                  <span className="flex flex-col gap-0.5 flex-shrink-0">
                    <button onClick={() => saveLayout(page, moveSection(layout, defs, s.id, -1))}
                      disabled={first || sec.fixed} aria-label={`حرّك ${sec.label} لأعلى`}
                      className="w-7 h-6 rounded-lg t-caption font-black disabled:opacity-25"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>▲</button>
                    <button onClick={() => saveLayout(page, moveSection(layout, defs, s.id, 1))}
                      disabled={last || sec.fixed} aria-label={`حرّك ${sec.label} لأسفل`}
                      className="w-7 h-6 rounded-lg t-caption font-black disabled:opacity-25"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>▼</button>
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="block t-small font-black truncate" style={{ color: "var(--text)" }}>{sec.label}</span>
                    {sec.desc && <span className="block t-caption truncate" style={{ color: "var(--text-muted)" }}>{sec.desc}</span>}
                  </span>

                  {sec.fixed ? (
                    <span className="t-caption flex-shrink-0" style={{ color: "var(--text-muted)" }}>ثابت</span>
                  ) : (
                    <button onClick={() => saveLayout(page, toggleSection(layout, defs, s.id))}
                      aria-pressed={s.visible} aria-label={`${s.visible ? "أخفِ" : "أظهر"} ${sec.label}`}
                      className="w-12 h-7 rounded-full flex items-center transition flex-shrink-0 px-0.5"
                      style={{ background: s.visible ? "var(--accent)" : "var(--border)", justifyContent: s.visible ? "flex-start" : "flex-end" }}>
                      <span className="w-6 h-6 rounded-full" style={{ background: "#fff" }} />
                    </button>
                  )}
                </div>
              );
            })}

            {isCustomized(defs, layout) && (
              <button onClick={() => resetLayout(page)}
                className="rounded-2xl py-3 t-body font-black mt-1"
                style={{ background: "transparent", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
                أعِد ترتيب الصفحة الأصليّ
              </button>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
