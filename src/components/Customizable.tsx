"use client";
/* ═══════════ تخصيصُ الصفحة — رتّبها بالسحب كما تريدها ═══════════
   كان «تخصيص» في الرئيسية وحدها، ثم ضاع في إعادة تنظيمها وبقيت الإعداداتُ تَعِد
   بزرٍّ لا وجود له. رجع — و**لكلّ صفحة** لا للرئيسية فقط.

   ▓ السحبُ بمقبضٍ لا بكامل الصفّ: لو سُحب الصفُّ كلُّه لتنازع السحبُ مع تمرير
     الورقة، فيحاول الطالبُ التمريرَ فيسحب قسماً بالخطأ. المقبضُ يفصل النيّتين،
     و`touch-action: none` عليه وحده — فتبقى الورقةُ تُمرَّر بإصبعٍ على أي مكانٍ آخر.

   ▓ ومعه الكيبورد: المقبضُ زرٌّ حقيقيّ، والسهمان ↑↓ يحرّكان القسمَ وهو مركَّزٌ
     عليه. فمن لا يستطيع السحبَ لا يُحرَم الترتيب.

   ▓ التركيزُ وأخطائي خارج هذا عمداً: الأولُ شاشةُ مؤقّتٍ لا أقسامَ فيها،
     والثاني سجلٌّ ترتيبُه زمنيٌّ لا رأيَ للطالب فيه. */
import { Fragment, useState, useRef, useCallback, type ReactNode, type PointerEvent as RPointerEvent } from "react";
import Sheet from "@/components/Sheet";
import { moveSection, toggleSection, hiddenCount, isCustomized, type SectionDef, type SectionState } from "@/lib/pageLayout";
import { useLayout, saveLayout, resetLayout } from "@/lib/pageLayoutStore";
import { n } from "@/lib/format";

export interface PageSection extends SectionDef {
  node: ReactNode;
}

/** ارتفاعُ الصفّ + فجوتُه — به نحسب إلى أيّ موضعٍ وصل الإصبع. */
const ROW_H = 68;

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

      {/* ▓ `Fragment` لا `div`: القسمُ يبقى ابناً مباشراً للحاوية، فيرث تمدّدها
          (`align-items: stretch`). الغلافُ الوسيط جعل بطاقةَ «هدف اليوم» — وهي
          `button` — تنكمش على محتواها فظهر فراغٌ إلى جانبها. */}
      {layout.map((s) => {
        if (!s.visible) return null;
        const sec = byId.get(s.id);
        return sec ? <Fragment key={s.id}>{sec.node}</Fragment> : null;
      })}

      {open && (
        <Sheet onClose={() => setOpen(false)} title="تخصيص الصفحة">
          <SortList page={page} defs={defs} layout={layout} byId={byId} />
        </Sheet>
      )}
    </div>
  );
}

/* ── قائمةُ الترتيب: سحبٌ بالمقبض، ومفتاحُ إظهارٍ لكلّ قسم ── */
function SortList({ page, defs, layout, byId }: {
  page: string;
  defs: SectionDef[];
  layout: SectionState[];
  byId: Map<string, PageSection>;
}) {
  /* ترتيبٌ مؤقّتٌ أثناء السحب — لا نكتب في التخزين مع كل بكسل */
  const [drag, setDrag] = useState<{ id: string; order: SectionState[] } | null>(null);
  const live = useRef<{ y: number; index: number; order: SectionState[] } | null>(null);
  const view = drag?.order ?? layout;

  /* ▓ المستمعان على النافذة لا على المقبض. حين يُعاد ترتيب الصفوف يتحرّك المقبضُ
     في الـDOM، فيفقد `setPointerCapture` فلا تصله بقيّةُ الحركة ولا رفعُ الإصبع —
     فيقف السحبُ بعد خطوةٍ واحدة ولا يُحفظ شيء. (وقع فعلاً وقُيس.) */
  const onDown = useCallback((e: RPointerEvent<HTMLButtonElement>, id: string) => {
    const i = layout.findIndex((s) => s.id === id);
    if (i < 0) return;
    e.preventDefault();
    live.current = { y: e.clientY, index: i, order: layout };
    setDrag({ id, order: layout });

    const fixedIds = new Set(defs.filter((d) => d.fixed).map((d) => d.id));

    const move = (ev: PointerEvent) => {
      const st = live.current;
      if (!st) return;
      ev.preventDefault();
      /* كم صفّاً قطعه الإصبع؟ والوجهةُ تُحدّ داخل القائمة، **ولا تعبر ثابتاً**. */
      const steps = Math.round((ev.clientY - st.y) / ROW_H);
      const cur = st.order.findIndex((s) => s.id === id);
      let lo = 0, hi = st.order.length - 1;
      for (let k = cur - 1; k >= 0; k--) if (fixedIds.has(st.order[k].id)) { lo = k + 1; break; }
      for (let k = cur + 1; k < st.order.length; k++) if (fixedIds.has(st.order[k].id)) { hi = k - 1; break; }
      const target = Math.max(lo, Math.min(hi, st.index + steps));
      if (cur === target) return;
      const next = [...st.order];
      const [moved] = next.splice(cur, 1);
      next.splice(target, 0, moved);
      live.current = { ...st, order: next };
      setDrag({ id, order: next });
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const st = live.current;
      live.current = null;
      setDrag(null);
      /* لا نكتب إلا إن تغيّر شيءٌ فعلاً */
      if (st && st.order.some((s, k) => s.id !== layout[k]?.id)) saveLayout(page, st.order);
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }, [layout, defs, page]);

  return (
    <div className="flex flex-col gap-2">
      <p className="t-caption leading-relaxed px-1" style={{ color: "var(--text-muted)" }}>
        اسحب من المقبض ⠿ لترتيب الأقسام، وأطفئ ما لا يعنيك. قرارُك محفوظٌ في جهازك،
        ولا يحذف شيئاً — تُرجعه متى شئت.
      </p>

      {view.map((s, i) => {
        const sec = byId.get(s.id);
        if (!sec) return null;
        const dragging = drag?.id === s.id;
        return (
          <div key={s.id} className="rounded-2xl px-3 py-2.5 flex items-center gap-2.5 transition-shadow"
            style={{
              background: dragging ? "var(--surface)" : "var(--surface2)",
              border: `1.5px solid ${dragging ? "var(--accent)" : "var(--border)"}`,
              opacity: s.visible ? 1 : 0.55,
              boxShadow: dragging ? "var(--elev-2)" : "none",
              transform: dragging ? "scale(1.02)" : "none",
              minHeight: 56,
            }}>
            {sec.fixed ? (
              <span aria-hidden="true" className="w-9 h-9 grid place-items-center t-body flex-shrink-0"
                style={{ color: "var(--text-dim)" }}>🔒</span>
            ) : (
              <button
                onPointerDown={(e) => onDown(e, s.id)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                  e.preventDefault();
                  saveLayout(page, moveSection(layout, defs, s.id, e.key === "ArrowUp" ? -1 : 1));
                }}
                aria-label={`اسحب لترتيب ${sec.label} — أو استعمل السهمين`}
                className="w-9 h-9 rounded-xl grid place-items-center t-body font-black flex-shrink-0 cursor-grab active:cursor-grabbing"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)", touchAction: "none" }}>
                ⠿
              </button>
            )}

            <span className="flex-1 min-w-0">
              <span className="block t-small font-black truncate" style={{ color: "var(--text)" }}>
                <span className="font-mono-nums" style={{ color: "var(--text-dim)" }}>{n(i + 1)}. </span>{sec.label}
              </span>
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
  );
}
